import { authenticatedUser, db, ownedProspect } from '../_shared/db.ts';
import { handleOptions, json } from '../_shared/http.ts';
import { structuredAI } from '../_shared/openai.ts';
import { deterministicScore } from '../_shared/scoring.js';

const schema = {
  type: 'object', additionalProperties: false,
  properties: {
    confidence: { type: 'number', minimum: 0, maximum: 1 }, summary: { type: 'string' },
    reasons: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { statement: { type: 'string' }, source_ids: { type: 'array', items: { type: 'string' } } }, required: ['statement','source_ids'] } },
    missing_information: { type: 'array', items: { type: 'string' } }
  }, required: ['confidence','summary','reasons','missing_information']
};

Deno.serve(async request => {
  const options = handleOptions(request); if (options) return options;
  try {
    const user = await authenticatedUser(request);
    const { prospect_id } = await request.json();
    const prospect = await ownedProspect(prospect_id, user.id);
    const sources = await db(`prospect_sources?prospect_id=eq.${prospect_id}&select=*`);
    if (!sources.length) return json({ error: 'Aggiungi almeno una fonte prima della qualificazione' }, 400);
    const deterministic = deterministicScore(prospect, sources);
    const ai = await structuredAI('prospect_qualification', schema,
      'Valuta il fit per il DSU Dance Teacher Program, con priorità a Hip Hop e street dance. Usa soltanto le fonti fornite. Ogni ragione deve citare source_ids reali. Non modificare il punteggio deterministico e non inventare informazioni.',
      { prospect, sources: sources.map(({ id, source_url, evidence_text, extracted_facts }) => ({ id, source_url, evidence_text, extracted_facts })), deterministic });
    const validSourceIds = new Set(sources.map((source: any) => source.id));
    if (ai.result.reasons.some((reason: any) => reason.source_ids.some((id: string) => !validSourceIds.has(id)))) throw new Error('La qualificazione cita fonti non valide');
    const recommended = deterministic.score >= 65 ? 'QUALIFICATO' : 'DA ANALIZZARE';
    const run = { prospect_id, score: deterministic.score, confidence: ai.result.confidence, recommended_status: recommended, deterministic_signals: deterministic.signals, ai_reasons: ai.result.reasons, missing_information: ai.result.missing_information, model: ai.model, prompt_version: 'qualification-v1' };
    await db('qualification_runs', { method: 'POST', body: JSON.stringify(run) });
    const updated = await db(`prospects?id=eq.${prospect_id}`, { method: 'PATCH', body: JSON.stringify({ qualification_score: deterministic.score, qualification_confidence: ai.result.confidence, qualification_summary: ai.result.summary, status: recommended }) });
    await db('activities', { method: 'POST', body: JSON.stringify({ prospect_id, actor_id: user.id, activity_type: 'QUALIFIED', description: `Qualificazione completata: ${deterministic.score}/100`, metadata: { recommended_status: recommended } }) });
    return json({ prospect: updated[0], qualification: { ...run, ...ai.result } });
  } catch (error) { return json({ error: error.message || 'Errore di qualificazione' }, 400); }
});
