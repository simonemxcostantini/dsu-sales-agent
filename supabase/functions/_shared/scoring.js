const STREET = ['hip hop','street dance','breaking','breakdance','popping','locking','house'];
export function deterministicScore(prospect, sources = []) {
  const evidence = JSON.stringify(sources.map(source => source.extracted_facts || {})).toLowerCase();
  const disciplines = (prospect.disciplines || []).map(value => value.toLowerCase());
  const has = value => disciplines.includes(value) || evidence.includes(value);
  const signals = [];
  const add = (signal, points, reason) => signals.push({ signal, points, reason });
  if (has('hip hop') || has('street dance')) add('street_courses', 25, 'Hip Hop o street dance verificati nelle fonti');
  if (['breaking','breakdance','popping','locking','house'].some(has)) add('related_disciplines', 10, 'Discipline street affini verificate');
  if (Number(prospect.teacher_count) > 1) add('teacher_team', 15, 'Presenza verificata di più insegnanti');
  if (prospect.recent_activity === true) add('recent_activity', 10, 'Attività recente verificata');
  if (prospect.business_email) add('business_email', 10, 'Email business disponibile');
  if (prospect.website_url) add('active_website', 10, 'Sito web disponibile');
  if (prospect.instagram_handle || prospect.instagram_url) add('professional_instagram', 5, 'Instagram professionale disponibile');
  const personalization = sources.filter(source => source.evidence_text?.trim()).length >= 1;
  if (personalization) add('personalization', 15, 'Informazioni con fonte sufficienti per personalizzare');
  return { score: Math.min(100, signals.reduce((sum, item) => sum + item.points, 0)), signals, streetRelevant: STREET.some(has) };
}
