/**
 * Ponto de extensão para notificações (e-mail, WhatsApp, Teams...). Fora do escopo do MVP.
 *
 * Regra: eventos NUNCA carregam conteúdo do relato nem dados de identificação —
 * apenas o necessário para avisar a equipe de que há algo novo no painel.
 */
export type ReportCreatedEvent = { reportId: string; urgent: boolean };
export type ReportRepliedEvent = { reportId: string };

export interface Notifier {
  reportCreated(event: ReportCreatedEvent): Promise<void>;
  reportReplied(event: ReportRepliedEvent): Promise<void>;
}
