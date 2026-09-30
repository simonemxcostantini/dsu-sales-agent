export interface EmailDraftPayload { to: string; subject: string; body: string }
export interface EmailProvider { sendApproved(payload: EmailDraftPayload): Promise<{ messageId: string }> }

// Contratto futuro per Aruba IMAP/SMTP. Nessuna implementazione e nessuna credenziale
// sono incluse nell'MVP: approvare una bozza non può inviare messaggi.
export class EmailSendingDisabledProvider implements EmailProvider {
  async sendApproved(): Promise<{ messageId: string }> {
    throw new Error('Invio email disabilitato: EMAIL_SENDING_ENABLED=false');
  }
}
