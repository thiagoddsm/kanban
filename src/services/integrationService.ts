import { ChurchEvent, Task } from '../types';

export class IntegrationService {
  /**
   * Generates a Google Calendar Direct Add URL for an event
   */
  public static getGoogleCalendarEventUrl(event: ChurchEvent): string {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(event.description || 'Projeto de Evento - Oiko Marketing');
    const location = encodeURIComponent(event.location || '');
    
    const startIso = event.startDate.replace(/-/g, '') + 'T120000Z';
    const endIso = (event.endDate || event.startDate).replace(/-/g, '') + 'T220000Z';
    const dates = `${startIso}/${endIso}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}&dates=${dates}`;
  }

  /**
   * Generates Google Calendar Add URL for a single task deadline
   */
  public static getGoogleCalendarTaskUrl(task: Task): string {
    const title = encodeURIComponent(`[Entrega] ${task.title}`);
    const details = encodeURIComponent(`Demanda: ${task.title}\nTipo: ${task.demandType}\nResponsável: ${task.assigneeName || 'Não atribuído'}`);
    const dateFormatted = task.deadline.replace(/-/g, '') + 'T180000Z';
    const dates = `${dateFormatted}/${dateFormatted}`;

    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&dates=${dates}`;
  }

  /**
   * Formats WhatsApp notification messages
   */
  public static formatWhatsAppTaskReminder(task: Task, orgName: string): string {
    const msg = `🔔 *Oiko Marketing (${orgName})*\n\nOlá! A demanda *"${task.title}"* está agendada para entrega em *${new Date(task.deadline + 'T00:00:00').toLocaleDateString('pt-BR')}*.\n\nStatus: ${task.status}\nPrioridade: ${task.priority}`;
    return `https://wa.me/?text=${encodeURIComponent(msg)}`;
  }
}
