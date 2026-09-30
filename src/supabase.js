const SESSION_KEY = 'dsu-sales-agent-session';
const config = globalThis.DSU_CONFIG || {};
export const liveMode = Boolean(config.supabaseUrl && config.supabaseAnonKey);
let session = loadSession();

function loadSession() { try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; } }
function saveSession(value) { session = value; value ? localStorage.setItem(SESSION_KEY, JSON.stringify(value)) : localStorage.removeItem(SESSION_KEY); }
function headers(extra = {}) { return { apikey: config.supabaseAnonKey, Authorization: `Bearer ${session?.access_token || config.supabaseAnonKey}`, 'Content-Type': 'application/json', ...extra }; }
async function request(path, options = {}) {
  const response = await fetch(`${config.supabaseUrl}${path}`, { ...options, headers: headers(options.headers) });
  if (response.status === 401 && session?.refresh_token && !path.includes('/auth/v1/token')) {
    await refresh(); return request(path, options);
  }
  const text = await response.text(); const payload = text ? JSON.parse(text) : null;
  if (!response.ok) throw new Error(payload?.message || payload?.error_description || payload?.error || `Errore ${response.status}`);
  return payload;
}
export function currentSession() { return session; }
export async function signIn(email, password) { const value = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: JSON.stringify({ email, password }) }); saveSession(value); return value; }
export async function refresh() { const value = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: JSON.stringify({ refresh_token: session.refresh_token }) }); saveSession(value); }
export async function signOut() { try { await request('/auth/v1/logout', { method: 'POST' }); } finally { saveSession(null); } }

const mapProspect = row => ({ id: row.id, firstName: row.first_name, lastName: row.last_name, school: row.school_name, city: row.city, email: row.business_email || '', website: row.website_url || '', instagram: row.instagram_handle || '', instagramUrl: row.instagram_url || '', type: row.prospect_type, status: row.status, disciplines: row.disciplines || [], teacherCount: row.teacher_count, recentActivity: row.recent_activity, qualificationScore: row.qualification_score, qualificationConfidence: row.qualification_confidence, qualificationSummary: row.qualification_summary, notes: row.notes, createdAt: row.created_at, conversations: [], sources: [], drafts: [], activities: [] });
const toRow = prospect => ({ first_name: prospect.firstName || '', last_name: prospect.lastName || '', display_name: `${prospect.firstName || ''} ${prospect.lastName || ''}`.trim() || prospect.school || 'Prospect', school_name: prospect.school || '', city: prospect.city || '', business_email: prospect.email || null, website_url: prospect.website || null, instagram_handle: prospect.instagram || null, instagram_url: prospect.instagramUrl || null, prospect_type: prospect.type || 'Altro', status: prospect.status || 'DA ANALIZZARE', disciplines: prospect.disciplines || [], notes: prospect.notes || '' });
export async function listProspects() { return (await request('/rest/v1/prospects?select=*&order=created_at.desc')).map(mapProspect); }
export async function createProspect(prospect) { const rows = await request('/rest/v1/prospects', { method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify(toRow(prospect)) }); return mapProspect(rows[0]); }
export async function updateProspect(id, patch) { const rows = await request(`/rest/v1/prospects?id=eq.${encodeURIComponent(id)}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify(toRow(patch)) }); return mapProspect(rows[0]); }
export async function loadProspectDetails(prospect) {
  const [sources, drafts, activities] = await Promise.all([
    request(`/rest/v1/prospect_sources?prospect_id=eq.${prospect.id}&select=*&order=created_at.desc`),
    request(`/rest/v1/email_drafts?prospect_id=eq.${prospect.id}&select=*&order=created_at.desc`),
    request(`/rest/v1/activities?prospect_id=eq.${prospect.id}&select=*&order=created_at.desc&limit=30`),
  ]);
  return { ...prospect, sources, drafts, activities };
}
export async function invoke(functionName, body) { return request(`/functions/v1/${functionName}`, { method: 'POST', body: JSON.stringify(body) }); }
export async function saveDraft(draft) { return request(`/rest/v1/email_drafts?id=eq.${draft.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ subject: draft.subject, body: draft.body }) }); }
export async function reviewDraft(draft, status, reason = null) {
  const userId = session.user.id;
  const rows = await request(`/rest/v1/email_drafts?id=eq.${draft.id}`, { method: 'PATCH', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ status, rejection_reason: reason, reviewed_by: userId, reviewed_at: new Date().toISOString() }) });
  await request(`/rest/v1/prospects?id=eq.${draft.prospect_id}`, { method: 'PATCH', body: JSON.stringify({ status: status === 'APPROVED' ? 'DA CONTATTARE' : 'QUALIFICATO' }) });
  await request('/rest/v1/activities', { method: 'POST', body: JSON.stringify({ prospect_id: draft.prospect_id, activity_type: status === 'APPROVED' ? 'DRAFT_APPROVED' : 'DRAFT_REJECTED', description: status === 'APPROVED' ? 'Bozza approvata internamente (non inviata)' : 'Bozza rifiutata', metadata: { draft_id: draft.id, email_sent: false } }) });
  return rows[0];
}
