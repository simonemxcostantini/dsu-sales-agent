import { requireEnv } from './http.ts';

const base = () => `${requireEnv('SUPABASE_URL')}/rest/v1`;
const serviceKey = () => requireEnv('SUPABASE_SERVICE_ROLE_KEY');

export async function db(path: string, init: RequestInit = {}) {
  const response = await fetch(`${base()}/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey(),
      Authorization: `Bearer ${serviceKey()}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...init.headers,
    },
  });
  if (!response.ok) throw new Error(`Database ${response.status}: ${await response.text()}`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function authenticatedUser(request: Request) {
  const authorization = request.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) throw new Error('Sessione mancante');
  const response = await fetch(`${requireEnv('SUPABASE_URL')}/auth/v1/user`, {
    headers: { apikey: serviceKey(), Authorization: authorization },
  });
  if (!response.ok) throw new Error('Sessione non valida');
  return response.json();
}

export async function ownedProspect(id: string, ownerId: string) {
  const rows = await db(`prospects?id=eq.${encodeURIComponent(id)}&owner_id=eq.${ownerId}&select=*`);
  if (!rows?.[0]) throw new Error('Prospect non trovato');
  return rows[0];
}
