"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOikoToolsDefinition = getOikoToolsDefinition;
exports.handleOikoToolExecution = handleOikoToolExecution;
const firestore_1 = require("firebase-admin/firestore");
// Registro e definição de ferramentas (Tools) que a IA conhece.
// Estes objetos seguem o padrão JSON Schema esperado por modelos de IA (OpenAI / Gemini / Anthropic)
function getOikoToolsDefinition() {
    return [
        {
            type: 'function',
            function: {
                name: 'get_dashboard_summary',
                description: 'Consulta um resumo do dashboard atual da organização (quantidade de tarefas pendentes, eventos próximos, membros ativos). Útil quando o usuário pergunta "Como estão as coisas?" ou "Me dê um resumo".',
                parameters: {
                    type: 'object',
                    properties: {},
                    required: []
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'create_task',
                description: 'Cria uma nova tarefa no Kanban da organização atual.',
                parameters: {
                    type: 'object',
                    properties: {
                        title: {
                            type: 'string',
                            description: 'O título curto e descritivo da tarefa.'
                        },
                        description: {
                            type: 'string',
                            description: 'A descrição detalhada da tarefa.'
                        },
                        priority: {
                            type: 'string',
                            enum: ['LOW', 'MEDIUM', 'HIGH'],
                            description: 'A prioridade da tarefa. Se não especificada na fala, use MEDIUM.'
                        }
                    },
                    required: ['title']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'get_user_tasks',
                description: 'Busca as tarefas atribuídas ao usuário que está conversando com você. Útil quando o usuário pergunta \'quais são as minhas tarefas?\'.',
                parameters: {
                    type: 'object',
                    properties: {
                        status: {
                            type: 'string',
                            description: 'Filtro opcional por status da tarefa.',
                            enum: ['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']
                        }
                    }
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'update_task_status',
                description: 'Atualiza o status de uma tarefa existente (ex: marcar como concluída/DONE). Você pode passar o título ou um pedaço do nome da tarefa.',
                parameters: {
                    type: 'object',
                    properties: {
                        taskQuery: {
                            type: 'string',
                            description: 'O título da tarefa, um trecho dele (ex: "Configurar equipe") ou seu ID exato.'
                        },
                        status: {
                            type: 'string',
                            enum: ['INBOX', 'TODO', 'IN_PROGRESS', 'REVIEW', 'DONE', 'ARCHIVED'],
                            description: 'O novo status da tarefa.'
                        }
                    },
                    required: ['taskQuery', 'status']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'update_semantic_memory',
                description: 'Salva uma preferência do usuário ou um fato importante sobre a organização na memória de longo prazo (Memória Semântica). Use quando o usuário disser "Lembre-se que...", "Meu nome é...", ou der instruções de como quer ser tratado.',
                parameters: {
                    type: 'object',
                    properties: {
                        scope: {
                            type: 'string',
                            enum: ['user', 'tenant'],
                            description: 'Define se a memória é específica para as preferências deste usuário ("user") ou uma regra/fato geral da igreja inteira ("tenant").'
                        },
                        key: {
                            type: 'string',
                            description: 'A chave para categorizar a memória. Ex: "preferences", "role_details", "communication_style".'
                        },
                        value: {
                            type: 'string',
                            description: 'O valor real a ser lembrado.'
                        }
                    },
                    required: ['scope', 'key', 'value']
                }
            }
        }
    ];
}
const aiMemory_1 = require("./aiMemory");
// Executor e Roteador das ferramentas reais (Domain Layer)
async function handleOikoToolExecution(toolName, args, context) {
    const { tenantId, userId } = context;
    switch (toolName) {
        case 'get_dashboard_summary':
            return await executeGetDashboardSummary(tenantId);
        case 'get_user_tasks':
            return await executeGetUserTasks(tenantId, userId, args);
        case 'update_task_status':
            // 🟡 Ação Reversível: O usuário quer mudar o status da tarefa
            return await executeUpdateTaskStatus(tenantId, userId, args);
        case 'create_task':
            // 🟡 Ação Reversível: A IA cria a tarefa, e audita de quem partiu (AI Engine via Usuario X)
            return await executeCreateTask(tenantId, userId, args);
        case 'update_semantic_memory':
            // 🟢 Ação Segura: A IA aprende.
            const targetUserId = args.scope === 'user' ? userId : null;
            return await (0, aiMemory_1.updateSemanticMemory)(tenantId, targetUserId, args.key, args.value);
        default:
            throw new Error(`Tool desconhecida: ${toolName}`);
    }
}
// --- Domain Functions Mockup --- 
// Em produção, isso iria interagir com o FirestoreRepository/Domain services reais.
async function executeUpdateTaskStatus(tenantId, userId, args) {
    const db = (0, firestore_1.getFirestore)();
    const tasksRef = db.collection('organizations').doc(tenantId).collection('tasks');
    let targetRef = null;
    // 1. Tenta buscar direto pelo ID exato
    const docSnap = await tasksRef.doc(args.taskQuery).get();
    if (docSnap.exists) {
        targetRef = docSnap.ref;
    }
    else {
        // 2. Se não achou por ID, busca pelas tarefas do usuário para tentar dar match no título
        const userTasksSnap = await tasksRef
            .where('assigneeIds', 'array-contains', userId)
            .where('isArchived', '==', false)
            .get();
        const queryLower = args.taskQuery.toLowerCase();
        const match = userTasksSnap.docs.find(d => d.data().title.toLowerCase().includes(queryLower));
        if (match) {
            targetRef = match.ref;
        }
    }
    if (!targetRef) {
        return { success: false, message: `Não encontrei nenhuma tarefa com o nome ou ID "${args.taskQuery}". Peça para o usuário confirmar o nome exato da tarefa.` };
    }
    await targetRef.update({
        status: args.status,
        updatedAt: new Date().toISOString()
    });
    return {
        success: true,
        message: `Tarefa atualizada com sucesso para o status ${args.status}. Confirme isso para o usuário.`
    };
}
async function executeGetUserTasks(tenantId, userId, args) {
    const db = (0, firestore_1.getFirestore)();
    let query = db.collection('organizations').doc(tenantId).collection('tasks')
        .where('assigneeIds', 'array-contains', userId)
        .where('isArchived', '==', false);
    if (args.status) {
        query = query.where('status', '==', args.status);
    }
    else {
        // Por padrão busca as pendentes
        query = query.where('status', 'in', ['INBOX', 'TODO', 'IN_PROGRESS', 'REVIEW']);
    }
    const snap = await query.get();
    if (snap.empty) {
        return {
            success: true,
            message: "Você não possui tarefas pendentes atribuídas a você no momento.",
            data: []
        };
    }
    const tasks = snap.docs.map(doc => {
        const d = doc.data();
        return {
            id: doc.id, // Adicionado para a IA poder referenciar depois
            title: d.title,
            status: d.status,
            priority: d.priority,
            campus: d.campusName || 'N/A'
        };
    });
    return {
        success: true,
        message: `Foram encontradas ${tasks.length} tarefas. Detalhes em 'data'. Por favor, liste-as de forma clara.`,
        data: tasks
    };
}
async function executeGetDashboardSummary(tenantId) {
    const db = (0, firestore_1.getFirestore)();
    // Busca tarefas INBOX ou IN_PROGRESS
    const tasksRef = db.collection('organizations').doc(tenantId).collection('tasks');
    const snap = await tasksRef.where('status', 'in', ['INBOX', 'IN_PROGRESS']).get();
    return {
        success: true,
        data: {
            pendingTasksCount: snap.size,
            message: `Você possui ${snap.size} tarefas pendentes no momento.`
        }
    };
}
async function executeCreateTask(tenantId, userId, args) {
    const db = (0, firestore_1.getFirestore)();
    const tasksRef = db.collection('organizations').doc(tenantId).collection('tasks');
    const newTask = {
        id: 'tsk_ai_' + Date.now().toString(36),
        organizationId: tenantId,
        title: args.title,
        description: args.description || '',
        demandType: 'OUTRO',
        status: 'INBOX',
        priority: args.priority || 'MEDIUM',
        requesterId: userId,
        createdBy: 'Oiko AI Engine', // Auditoria de sistema
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
    await tasksRef.doc(newTask.id).set(newTask);
    return {
        success: true,
        message: `Tarefa "${args.title}" criada com sucesso na coluna INBOX.`,
        data: { taskId: newTask.id }
    };
}
//# sourceMappingURL=aiTools.js.map