/**
 * Evolution API Client & Anti-Ban Safeguard Service
 * Suporta instâncias gerais da Organização e instâncias pessoais de Usuários.
 */

import { EvolutionIntegrationConfig } from '../types';

export const DEFAULT_EVOLUTION_CONFIG: Required<Pick<EvolutionIntegrationConfig, 'baseUrl' | 'apiKey' | 'instanceName'>> = {
  baseUrl: 'https://api.ibmanha.com.br',
  apiKey: '554C767EA3D2-4221-AB6A-C126C68A657E',
  instanceName: 'Oiko_Gestao',
};

export interface ConnectionStateResult {
  instanceName: string;
  state: 'open' | 'connecting' | 'close' | 'not_found' | 'error';
  phoneNumber?: string;
  profileName?: string;
  error?: string;
}

export interface QrCodeResult {
  success: boolean;
  instanceName: string;
  base64?: string;
  code?: string;
  pairingCode?: string;
  state?: string;
  error?: string;
}

export interface SendMessageParams {
  instanceName: string;
  to: string;
  text: string;
  configOverride?: EvolutionIntegrationConfig;
  options?: {
    delay?: number;
    presence?: 'composing' | 'recording';
    linkPreview?: boolean;
  };
}

export interface SendMessageResult {
  success: boolean;
  messageId?: string;
  instanceUsed: string;
  error?: string;
}

export class EvolutionApiService {
  /**
   * Resolve a configuração ativa (priorizando custom / org -> default)
   */
  public static resolveConfig(override?: EvolutionIntegrationConfig): { baseUrl: string; apiKey: string; instanceName: string } {
    const baseUrl = (override?.baseUrl || DEFAULT_EVOLUTION_CONFIG.baseUrl).replace(/\/$/, '').trim();
    const apiKey = (override?.apiKey || DEFAULT_EVOLUTION_CONFIG.apiKey).trim();
    const instanceName = (override?.instanceName || DEFAULT_EVOLUTION_CONFIG.instanceName || 'Oiko_Gestao').trim();
    return { baseUrl, apiKey, instanceName };
  }

  /**
   * Lista as instâncias registradas no servidor Evolution API
   */
  public static async fetchInstances(configOverride?: EvolutionIntegrationConfig): Promise<any[]> {
    const { baseUrl, apiKey } = this.resolveConfig(configOverride);
    try {
      const res = await fetch(`${baseUrl}/instance/fetchInstances`, {
        method: 'GET',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
      });
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [data];
    } catch {
      return [];
    }
  }

  /**
   * Sanitiza o slug da instância para um identificador seguro no Evolution
   */
  public static sanitizeSlug(name: string, maxLength: number = 32): string {
    return (name || 'Oiko_Gestao')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '')
      .slice(0, maxLength);
  }

  /**
   * Formata número de telefone para o padrão WhatsApp internacional (com DDI 55)
   */
  public static formatPhoneNumber(phone: string): string {
    const clean = phone.replace(/\D/g, '');
    if (!clean) return '';
    if (clean.startsWith('55') && clean.length >= 12) {
      return clean;
    }
    return `55${clean}`;
  }

  /**
   * Consulta o estado de conexão da instância
   */
  public static async getConnectionState(
    instanceName?: string,
    configOverride?: EvolutionIntegrationConfig
  ): Promise<ConnectionStateResult> {
    const { baseUrl, apiKey, instanceName: defaultInstance } = this.resolveConfig(configOverride);
    const targetInstance = instanceName ? this.sanitizeSlug(instanceName) : defaultInstance;

    try {
      const res = await fetch(`${baseUrl}/instance/connectionState/${targetInstance}`, {
        method: 'GET',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (res.status === 404) {
        return { instanceName: targetInstance, state: 'not_found' };
      }
      if (!res.ok) {
        return { instanceName: targetInstance, state: 'error', error: `HTTP ${res.status}` };
      }

      const data = await res.json();
      const rawState = data.instance?.state || data.state || 'close';
      const state: ConnectionStateResult['state'] =
        rawState === 'open' ? 'open' : rawState === 'connecting' ? 'connecting' : 'close';

      const phoneNumber = data.instance?.owner || data.owner || undefined;
      const profileName = data.instance?.profileName || data.profileName || undefined;

      return {
        instanceName: targetInstance,
        state,
        phoneNumber,
        profileName,
      };
    } catch (err: any) {
      console.warn(`[EvolutionApiService] Erro ao consultar estado de ${targetInstance}:`, err);
      return { instanceName: targetInstance, state: 'error', error: err?.message || 'Erro de conexão' };
    }
  }



  /**
   * Cria a instância na Evolution API se ela não existir
   */
  public static async createInstanceIfNotExists(
    instanceName: string,
    configOverride?: EvolutionIntegrationConfig
  ): Promise<{ success: boolean; error?: string }> {
    const { baseUrl, apiKey } = this.resolveConfig(configOverride);
    const cleanName = this.sanitizeSlug(instanceName);

    try {
      const stateResult = await this.getConnectionState(cleanName, configOverride);
      if (stateResult.state !== 'not_found' && stateResult.state !== 'error') {
        return { success: true };
      }

      const res = await fetch(`${baseUrl}/instance/create`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instanceName: cleanName,
          token: apiKey,
          qrcode: true,
          integration: 'WHATSAPP-BAILEYS',
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (res.status === 401) {
          // Se for 401 (token de instância e não master), verifica se já existe uma instância cadastrada
          const available = await this.fetchInstances(configOverride);
          if (available.length > 0) {
            return { success: true };
          }
          return { success: false, error: 'Chave de API (apikey) não autorizada para criar novas instâncias.' };
        }
        if (res.status !== 403 && !data.error?.includes('already in use')) {
          return { success: false, error: data.message || `Erro HTTP ${res.status} ao criar instância.` };
        }
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro de rede ao criar instância.' };
    }
  }

  /**
   * Solicita o QR Code de pareamento da instância
   */
  public static async getQrCode(
    instanceName?: string,
    configOverride?: EvolutionIntegrationConfig
  ): Promise<QrCodeResult> {
    const { baseUrl, apiKey, instanceName: defaultInstance } = this.resolveConfig(configOverride);
    const targetInstance = instanceName ? this.sanitizeSlug(instanceName) : defaultInstance;

    try {
      const res = await fetch(`${baseUrl}/instance/connect/${targetInstance}`, {
        method: 'GET',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (res.status === 401) {
          return { success: false, instanceName: targetInstance, error: 'Chave de API inválida ou não autorizada.' };
        }
        if (res.status === 404) {
          const createRes = await this.createInstanceIfNotExists(targetInstance, configOverride);
          if (createRes.success) {
            return await this.getQrCode(targetInstance, configOverride);
          }
          return {
            success: false,
            instanceName: targetInstance,
            error:
              createRes.error ||
              `A instância '${targetInstance}' ainda não foi criada no servidor Evolution API. Informe a Global API Key na aba 'Servidor' ou crie a instância no painel Evolution.`,
          };
        }
        return { success: false, instanceName: targetInstance, error: data.message || `Erro HTTP ${res.status}` };
      }


      const base64 = data.base64 || data.qrcode?.base64;
      const code = data.code || data.qrcode?.code;
      const pairingCode = data.pairingCode;
      const state = data.instance?.state || (base64 ? 'connecting' : 'open');

      return {
        success: true,
        instanceName: targetInstance,
        base64,
        code,
        pairingCode,
        state,
      };
    } catch (err: any) {
      return { success: false, instanceName: targetInstance, error: err?.message || 'Erro ao conectar à Evolution API.' };
    }
  }

  /**
   * Desconecta a sessão do WhatsApp na instância
   */
  public static async logoutInstance(
    instanceName: string,
    configOverride?: EvolutionIntegrationConfig
  ): Promise<{ success: boolean; error?: string }> {
    const { baseUrl, apiKey } = this.resolveConfig(configOverride);
    const cleanName = this.sanitizeSlug(instanceName);

    try {
      const res = await fetch(`${baseUrl}/instance/logout/${cleanName}`, {
        method: 'DELETE',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) {
        return { success: false, error: data.message || `Erro HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao desconectar.' };
    }
  }

  /**
   * Exclui a instância do servidor Evolution API
   */
  public static async deleteInstance(
    instanceName: string,
    configOverride?: EvolutionIntegrationConfig
  ): Promise<{ success: boolean; error?: string }> {
    const { baseUrl, apiKey } = this.resolveConfig(configOverride);
    const cleanName = this.sanitizeSlug(instanceName);

    try {
      const res = await fetch(`${baseUrl}/instance/delete/${cleanName}`, {
        method: 'DELETE',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok && res.status !== 404) {
        return { success: false, error: data.message || `Erro HTTP ${res.status}` };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Erro ao excluir instância.' };
    }
  }

  /**
   * Envia mensagem de texto via Evolution API
   */
  public static async sendTextMessage({
    instanceName,
    to,
    text,
    configOverride,
    options,
  }: SendMessageParams): Promise<SendMessageResult> {
    const { baseUrl, apiKey } = this.resolveConfig(configOverride);
    const cleanName = this.sanitizeSlug(instanceName);
    const formattedPhone = this.formatPhoneNumber(to);

    if (!formattedPhone || formattedPhone.length < 10) {
      return {
        success: false,
        instanceUsed: cleanName,
        error: 'Número de telefone destinatário inválido ou incompleto.',
      };
    }

    const payload = {
      number: formattedPhone,
      text,
      options: {
        delay: options?.delay ?? 1200,
        presence: options?.presence ?? 'composing',
        linkPreview: options?.linkPreview ?? true,
      },
    };

    try {
      const res = await fetch(`${baseUrl}/message/sendText/${cleanName}`, {
        method: 'POST',
        headers: {
          apikey: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        return {
          success: false,
          instanceUsed: cleanName,
          error: data.response?.message || data.message || `Erro HTTP ${res.status}`,
        };
      }

      return {
        success: true,
        messageId: data.key?.id || data.messageId,
        instanceUsed: cleanName,
      };
    } catch (err: any) {
      return {
        success: false,
        instanceUsed: cleanName,
        error: err?.message || 'Falha de rede ao enviar mensagem.',
      };
    }
  }
}
