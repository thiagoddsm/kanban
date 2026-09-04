import { EvolutionApiService, DEFAULT_EVOLUTION_CONFIG } from './evolutionApiService';
import { Organization, Task, User } from '../types';

export class WhatsAppNotificationService {
  /**
   * Resolve a instância a ser utilizada para o envio:
   * Prioridade: Instância conectada do autor -> Instância da Organização (Oiko_Gestao)
   */
  private static resolveInstanceName(org: Organization, authorUser?: User | null): string {
    const orgInstance =
      org.evolutionConfig?.instanceName ||
      DEFAULT_EVOLUTION_CONFIG.instanceName ||
      'Oiko_Gestao';

    if (authorUser?.whatsappConnected && authorUser?.whatsappInstanceName) {
      return authorUser.whatsappInstanceName;
    }
    return orgInstance;
  }

  /**
   * Notifica responsável quando uma demanda é atribuída a ele
   */
  public static async notifyTaskAssigned({
    organization,
    task,
    assigneeUser,
    actorUser,
  }: {
    organization: Organization;
    task: Task;
    assigneeUser?: User | null;
    actorUser?: User | null;
  }): Promise<boolean> {
    if (!assigneeUser) return false;

    // Verifica se a organização habilitou notificações no WhatsApp
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnTaskCreated === false) {
      return false;
    }

    // Verifica se o usuário destinatário aceita receber WhatsApp
    if (assigneeUser.notifyWhatsApp === false) return false;

    const phone = assigneeUser.whatsapp || assigneeUser.phone;
    if (!phone) {
      console.warn(`[WhatsAppNotify] Usuário ${assigneeUser.name} não possui telefone/WhatsApp cadastrado.`);
      return false;
    }

    const actorName = actorUser?.name || 'Liderança';
    const deadlineFormatted = task.deadline
      ? new Date(task.deadline + 'T00:00:00').toLocaleDateString('pt-BR')
      : 'Sem prazo definido';

    const text = `📋 *Nova Demanda Atribuída - Kanban Oiko*\n\nOlá, *${assigneeUser.name.split(' ')[0]}*!\n*${actorName}* atribuiu uma nova demanda para você:\n\n📌 *Título:* ${task.title}\n📅 *Prazo:* ${deadlineFormatted}\n🏷️ *Prioridade:* ${task.priority || 'Média'}\n\n👉 *Acesse a demanda:* https://studio-5589719834-7481b.web.app/tasks`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });
      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de atribuição:', err);
      return false;
    }
  }

  /**
   * Notifica usuário mencionado em comentário (@Nome)
   */
  public static async notifyTaskMention({
    organization,
    task,
    mentionedUser,
    actorUser,
    content,
  }: {
    organization: Organization;
    task: Task;
    mentionedUser: User;
    actorUser?: User | null;
    content: string;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnMention === false) {
      return false;
    }

    if (mentionedUser.notifyWhatsApp === false) return false;

    const phone = mentionedUser.whatsapp || mentionedUser.phone;
    if (!phone) {
      console.warn(`[WhatsAppNotify] Usuário ${mentionedUser.name} não possui telefone cadastrado.`);
      return false;
    }

    const actorName = actorUser?.name || 'Um membro';
    const text = `💬 *Você foi mencionado(a) - Kanban Oiko*\n\nOlá, *${mentionedUser.name.split(' ')[0]}*!\n*${actorName}* mencionou você na demanda:\n📋 *"${task.title}"*\n\n💭 *Mensagem:* _"${content}"_\n\n👉 *Responder agora:* https://studio-5589719834-7481b.web.app/tasks`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });
      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de menção:', err);
      return false;
    }
  }

  /**
   * Notifica quando uma demanda for bloqueada (gargalo)
   */
  public static async notifyTaskBlocked({
    organization,
    task,
    targetUser,
    reason,
    actorUser,
  }: {
    organization: Organization;
    task: Task;
    targetUser: User;
    reason: string;
    actorUser?: User | null;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnTaskBlocked === false) {
      return false;
    }

    if (targetUser.notifyWhatsApp === false) return false;

    const phone = targetUser.whatsapp || targetUser.phone;
    if (!phone) return false;

    const actorName = actorUser?.name || 'Um membro';
    const text = `🚨 *Alerta de Demanda Bloqueada (Gargalo) - Kanban Oiko*\n\nA demanda *"${task.title}"* foi sinalizada como bloqueada por *${actorName}*.\n\n⚠️ *Motivo do Bloqueio:* _"${reason}"_\n\n👉 *Ver detalhes para desbloqueio:* https://studio-5589719834-7481b.web.app/tasks`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });
      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de bloqueio:', err);
      return false;
    }
  }

  /**
   * Notifica quando uma demanda for aprovada
   */
  public static async notifyTaskApproved({
    organization,
    task,
    targetUser,
    actorUser,
  }: {
    organization: Organization;
    task: Task;
    targetUser: User;
    actorUser?: User | null;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false || orgConfig?.notifyOnTaskApproved === false) {
      return false;
    }

    if (targetUser.notifyWhatsApp === false) return false;

    const phone = targetUser.whatsapp || targetUser.phone;
    if (!phone) return false;

    const actorName = actorUser?.name || 'Líder';
    const text = `🎉 *Demanda Aprovada e Concluída! - Kanban Oiko*\n\nOlá, *${targetUser.name.split(' ')[0]}*!\nA entrega para a demanda *"${task.title}"* foi revisada e *APROVADA* por *${actorName}*. Parabéns pelo trabalho! 🚀\n\n👉 *Acessar:* https://studio-5589719834-7481b.web.app/tasks`;

    const instanceName = this.resolveInstanceName(organization, actorUser);

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: phone,
        text,
        configOverride: orgConfig,
      });
      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar notificação de aprovação:', err);
      return false;
    }
  }

  /**
   * Notifica solicitante quando uma demanda pública for registrada com sucesso
   */
  public static async notifyPublicDemandSubmitted({
    organization,
    task,
    requesterPhone,
    requesterName,
    protocolCode,
  }: {
    organization: Organization;
    task: Task;
    requesterPhone: string;
    requesterName: string;
    protocolCode: string;
  }): Promise<boolean> {
    const orgConfig = organization.evolutionConfig;
    if (orgConfig?.isEnabled === false) return false;

    const instanceName = this.resolveInstanceName(organization);
    const orgSlug = organization.slug || 'ib';
    const cleanProtocol = protocolCode.replace(/^#+/, '');
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://studio-5589719834-7481b.web.app';
    const trackingUrl = `${baseUrl}/${orgSlug}/protocolo/${encodeURIComponent(cleanProtocol)}`;

    const text = `📋 *Demanda Registrada com Sucesso! - ${organization.name}*\n\nOlá, *${requesterName.split(' ')[0]}*!\nSua solicitação foi recebida e já está na esteira de triagem inicial.\n\n📌 *Demanda:* ${task.title}\n🔢 *Protocolo:* \`${protocolCode}\`\n⏳ *SLA de Triagem:* Até 24 horas úteis\n\n👉 *Acompanhe em tempo real:* ${trackingUrl}\n\nVocê receberá avisos automáticos a cada avanço de fase!`;

    try {
      const res = await EvolutionApiService.sendTextMessage({
        instanceName,
        to: requesterPhone,
        text,
        configOverride: orgConfig,
      });
      return res.success;
    } catch (err) {
      console.warn('[WhatsAppNotify] Falha ao enviar confirmação de protocolo ao solicitante:', err);
      return false;
    }
  }
}

