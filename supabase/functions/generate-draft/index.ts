import { authenticatedUser, db, ownedProspect } from '../_shared/db.ts';
import { handleOptions, json } from '../_shared/http.ts';
import { structuredAI } from '../_shared/openai.ts';

const schema = {
  type: 'object', additionalProperties: false,
  properties: { subject: { type: 'string' }, body: { type: 'string' }, used_source_ids: { type: 'array', items: { type: 'string' } } },
  required: ['subject','body','used_source_ids']
};

Deno.serve(async request => {
  const options = handleOptions(request); if (options) return options;
  try {
    if ((Deno.env.get('EMAIL_SENDING_ENABLED') || 'false') !== 'false') throw new Error('Configurazione non sicura: l’invio deve rimanere disabilitato');
    const user = await authenticatedUser(request);
    const { prospect_id } = await request.json();
    const prospect = await ownedProspect(prospect_id, user.id);
    if (prospect.status === 'NON CONTATTARE') return json({ error: 'Il prospect è nella lista NON CONTATTARE' }, 409);
    const suppressed = await db(`suppression_entries?prospect_id=eq.${prospect_id}&select=id&limit=1`);
    if (suppressed.length) return json({ error: 'Il prospect è presente nella suppression list' }, 409);
    if ((prospect.qualification_score || 0) < 65) return json({ error: 'Il prospect non raggiunge la soglia di qualificazione (65)' }, 400);
    const sources = await db(`prospect_sources?prospect_id=eq.${prospect_id}&select=id,source_url,evidence_text,extracted_facts`);
    const knowledge = await db('product_knowledge?is_active=eq.true&select=section_key,title,content&order=section_key');
    const ai = await structuredAI('first_sales_email', schema,
      'Scrivi una prima email commerciale professionale, breve e non aggressiva in italiano. Personalizza solo con fatti espliciti nelle fonti e restituisci gli ID usati. Presenta il programma solo con la knowledge base. Non promettere risultati, non amplificare il diploma e non inventare. Nessun testo deve dichiarare che il messaggio è già stato inviato.',
      { prospect, sources, product_knowledge: knowledge });
    const validIds = new Set(sources.map((source: any) => source.id));
    if (ai.result.used_source_ids.some((id: string) => !validIds.has(id))) throw new Error('La bozza cita fonti non valide');
    const drafts = await db('email_drafts', { method: 'POST', body: JSON.stringify({ prospect_id, subject: ai.result.subject, body: ai.result.body, status: 'PENDING_APPROVAL', source_ids: ai.result.used_source_ids, model: ai.model, prompt_version: 'first-email-v1' }) });
    await db(`prospects?id=eq.${prospect_id}`, { method: 'PATCH', body: JSON.stringify({ status: 'MESSAGGIO DA APPROVARE' }) });
    await db('activities', { method: 'POST', body: JSON.stringify({ prospect_id, actor_id: user.id, activity_type: 'DRAFT_CREATED', description: 'Bozza email generata e in attesa di approvazione', metadata: { draft_id: drafts[0].id, sending_enabled: false } }) });
    return json({ draft: drafts[0], email_sending_enabled: false });
  } catch (error) { return json({ error: error.message || 'Errore durante la generazione' }, 400); }
});
