"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.oikoAIAgent = void 0;
const https_1 = require("firebase-functions/v2/https");
const logger = __importStar(require("firebase-functions/logger"));
const aiRouter_1 = require("./aiRouter");
/**
 * Callable Function Principal do Oiko IA Engine
 * O frontend React chama essa função passando a mensagem do usuário (e o histórico, se não estivermos mantendo na nuvem).
 */
exports.oikoAIAgent = (0, https_1.onCall)({ region: 'us-central1' }, async (request) => {
    // 1. Zero Trust: Identifica o usuário via Firebase Auth do Request
    const auth = request.auth;
    if (!auth) {
        throw new https_1.HttpsError('unauthenticated', 'Acesso negado. Usuário não autenticado.');
    }
    const userId = auth.uid;
    const data = request.data;
    if (!data.message) {
        throw new https_1.HttpsError('invalid-argument', 'O payload deve conter a propriedade "message".');
    }
    // 2. Extração segura do Tenant
    // NOTA: No Firebase Auth do Oiko, as custom claims podem ter a organização,
    // ou podemos buscar no Firestore para validar. Para a Fase 0, passamos o tenantId
    // pelo payload, mas VALIDAREMOS no backend antes de prosseguir.
    const requestedTenantId = data.tenantId;
    if (!requestedTenantId) {
        throw new https_1.HttpsError('invalid-argument', 'O tenantId é obrigatório.');
    }
    try {
        logger.info(`Iniciando request IA para User: ${userId} em Tenant: ${requestedTenantId}`);
        // 3. Roteamento para a Engine de IA
        const response = await (0, aiRouter_1.handleAIPrompt)(userId, requestedTenantId, data.message, data.history || []);
        return {
            success: true,
            data: response
        };
    }
    catch (error) {
        logger.error('Erro na execução do Oiko IA Engine:', error);
        throw new https_1.HttpsError('internal', error.message || 'Erro interno no processamento da IA.');
    }
});
//# sourceMappingURL=index.js.map