import { getFirestore } from 'firebase-admin/firestore';

// Registro e definição de ferramentas (Tools) que a IA conhece.
// Estes objetos seguem o padrão JSON Schema esperado por modelos de IA (OpenAI / Gemini / Anthropic)

export function getOikoToolsDefinition() {
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

import { updateSemanticMemory } from './aiMemory';

// Executor e Roteador das ferramentas reais (Domain Layer)
export async function handleOikoToolExecution(toolName: string, args: any, context: { userId: string, tenantId: string, role: string }) {
  const { tenantId, userId } = context;

  switch (toolName) {
    case 'get_dashboard_summary':
      return await executeGetDashboardSummary(tenantId);
    
    case 'create_task':
      // 🟡 Ação Reversível: A IA cria a tarefa, e audita de quem partiu (AI Engine via Usuario X)
      return await executeCreateTask(tenantId, userId, args);

    case 'update_semantic_memory':
      // 🟢 Ação Segura: A IA aprende.
      const targetUserId = args.scope === 'user' ? userId : null;
      return await updateSemanticMemory(tenantId, targetUserId, args.key, args.value);

    default:
      throw new Error(`Tool desconhecida: ${toolName}`);
  }
}

// --- Domain Functions Mockup --- 
// Em produção, isso iria interagir com o FirestoreRepository/Domain services reais.

async function executeGetDashboardSummary(tenantId: string) {
  const db = getFirestore();
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

async function executeCreateTask(tenantId: string, userId: string, args: any) {
  const db = getFirestore();
  const tasksRef = db.collection('organizations').doc(tenantId).collection('tasks');
  
  const newTask = {
    id: 'tsk_ai_' + Date.now().toString(36),
    organizationId: tenantId,
    title: args.title,
    description: args.description || '',
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
