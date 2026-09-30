import { classifyReply, generateDraft } from './ai.js';
import { demoProspects, STATUSES } from './data.js';
import * as backend from './supabase.js';

const root = document.querySelector('#root');
const DEMO_KEY = 'dsu-sales-agent-prospects';
let prospects = [];
let page = 'dashboard';
let selected = null;
let query = '';
let filter = 'TUTTI';
let loading = false;
let notice = '';

const esc = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' })[char]);
const tone = { 'LEAD CALDO':'hot', VENDITA:'success', CALL:'purple', INTERESSATO:'blue', 'NON CONTATTARE':'muted', 'NON INTERESSATO':'muted', 'DA ANALIZZARE':'gray', QUALIFICATO:'cyan', CONTATTATO:'amber', 'HA RISPOSTO':'blue', 'DA CONTATTARE':'amber', 'MESSAGGIO DA APPROVARE':'purple' };
const badge = status => `<span class="badge ${tone[status] || 'gray'}">${status === 'LEAD CALDO' ? '🔥 ' : ''}${esc(status)}</span>`;
const initials = prospect => `${prospect.firstName?.[0] || ''}${prospect.lastName?.[0] || prospect.school?.[0] || ''}`;

function loadDemo() { try { return JSON.parse(localStorage.getItem(DEMO_KEY)) || structuredClone(demoProspects); } catch { return structuredClone(demoProspects); } }
function saveDemo() { if (!backend.liveMode) localStorage.setItem(DEMO_KEY, JSON.stringify(prospects)); }
async function reload() { prospects = backend.liveMode ? await backend.listProspects() : loadDemo(); selected ||= prospects[0]?.id; }
async function busy(action, success) { loading = true; notice = ''; render(); try { await action(); notice = success || ''; } catch (error) { notice = error.message; } finally { loading = false; render(); } }

function loginScreen() {
  return `<div class="login-page"><form class="login-card" id="login-form"><div class="brand login-brand"><div class="brandmark">DSU</div><div><b>SALES AGENT</b><small>DANCE SCHOOL UNIVERSITY</small></div></div><h1>Accedi</h1><p>Area riservata al team commerciale DSU.</p>${notice ? `<div class="alert">${esc(notice)}</div>` : ''}<label>Email<input name="email" type="email" autocomplete="username" required></label><label>Password<input name="password" type="password" autocomplete="current-password" required></label><button class="primary full" ${loading ? 'disabled' : ''}>${loading ? 'Accesso…' : 'Accedi'}</button><small>Gli account vengono creati dall’amministratore Supabase.</small></form></div>`;
}
function shell(content) {
  return `<div class="app"><aside><div class="brand"><div class="brandmark">DSU</div><div><b>SALES AGENT</b><small>DANCE SCHOOL UNIVERSITY</small></div></div><nav><button data-page="dashboard" class="${page === 'dashboard' ? 'active' : ''}">▦ Dashboard</button><button data-page="prospects" class="${page !== 'dashboard' ? 'active' : ''}">♙ Prospect <em>${prospects.length}</em></button></nav><div class="aside-note"><b>✦ AI Assistant</b><p>${backend.liveMode ? 'AI server-side con fonti verificabili.' : 'Modalità demo: configura Supabase per usare dati condivisi e AI reale.'}</p><span>${backend.liveMode ? 'MODALITÀ DATABASE' : 'DEMO LOCALE'} · NESSUN INVIO</span></div><div class="operator"><div class="avatar sm">DS</div><div><b>Team DSU</b><small>${backend.liveMode ? 'Connesso' : 'Demo'}</small></div>${backend.liveMode ? '<button id="logout" class="logout">Esci</button>' : ''}</div></aside><main>${header()}${notice ? `<div class="toast">${esc(notice)}</div>` : ''}${content}</main></div>`;
}
function header() {
  const title = page === 'dashboard' ? 'Dashboard' : page === 'prospects' ? 'Prospect' : '';
  return `<header><div>${page === 'detail' ? '<button class="back" data-page="prospects">← Torna ai prospect</button>' : `<h1>${title}</h1><p>${page === 'dashboard' ? 'Panoramica delle attività commerciali' : `${prospects.length} contatti nel database`}</p>`}</div><div class="header-actions"><div class="search"><span>⌕</span><input id="global-search" placeholder="Cerca prospect..." value="${esc(query)}"></div><button class="primary" id="new-prospect">＋ Nuovo prospect</button></div></header>`;
}
function rows(list) {
  return `<div class="table"><div class="tr th"><span>PROSPECT</span><span>SCUOLA / CITTÀ</span><span>PUNTEGGIO</span><span>STATO</span><span>INSERITO</span></div>${list.map(prospect => `<button class="tr" data-open="${prospect.id}"><span class="person"><i>${initials(prospect)}</i><span><b>${esc(`${prospect.firstName} ${prospect.lastName}`.trim() || prospect.school)}</b><small>${esc(prospect.email)}</small></span></span><span><b>${esc(prospect.school)}</b><small>${esc(prospect.city)}</small></span><span>${prospect.qualificationScore == null ? '—' : `<b>${prospect.qualificationScore}/100</b>`}</span><span>${badge(prospect.status)}</span><span>${new Date(prospect.createdAt).toLocaleDateString('it-IT',{day:'2-digit',month:'short'})} <b>›</b></span></button>`).join('')}</div>`;
}
function dashboard() {
  const count = (...statuses) => prospects.filter(p => statuses.includes(p.status)).length;
  const drafts = count('MESSAGGIO DA APPROVARE');
  const metrics = [['Prospect totali',prospects.length,'Tutti i contatti','users'],['Nuovi',count('DA ANALIZZARE'),'Da analizzare','gray'],['Qualificati',count('QUALIFICATO'),'Fit verificato','cyan'],['Bozze da approvare',drafts,'Controllo umano','amber'],['Lead prioritari',prospects.filter(p => (p.qualificationScore || 0) >= 80).length,'Score ≥ 80','hot'],['Lead caldi',count('LEAD CALDO'),'Priorità alta','hot'],['Call',count('CALL'),'Call programmate','purple'],['Vendite',count('VENDITA'),'Programmi venduti','success']];
  return `<div class="content"><section class="welcome"><div><span>DSU DANCE TEACHER PROGRAM</span><h2>Pipeline commerciale</h2><p>Prospecting, qualificazione e bozze sempre sotto controllo umano.</p></div><div class="safe"><span>●</span><div><b>Invio email disabilitato</b><small>EMAIL_SENDING_ENABLED=false</small></div></div></section><div class="metrics">${metrics.map(metric => `<article class="metric ${metric[3]}"><div class="metric-icon">${metric[3] === 'hot' ? '🔥' : '♙'}</div><span>${metric[0]}</span><strong>${metric[1]}</strong><small>${metric[2]}</small></article>`).join('')}</div><section class="panel recent-panel"><div class="panel-head"><div><h3>Prospect recenti</h3><p>Ultimi contatti aggiunti</p></div><button data-page="prospects">Visualizza tutti →</button></div>${rows(prospects.slice(0,5))}</section></div>`;
}
function list() {
  const found = prospects.filter(p => (filter === 'TUTTI' || p.status === filter) && `${p.firstName} ${p.lastName} ${p.school} ${p.city} ${(p.disciplines || []).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
  return `<div class="content"><section class="panel list-panel"><div class="filters"><div class="search wide">⌕ <input id="list-search" placeholder="Cerca per nome, scuola, città o disciplina..." value="${esc(query)}"></div><select id="filter"><option value="TUTTI">Tutti gli stati</option>${STATUSES.map(status => `<option ${filter === status ? 'selected' : ''}>${status}</option>`).join('')}</select></div>${rows(found)}${found.length ? '' : '<div class="empty">Nessun prospect corrisponde ai filtri.</div>'}</section></div>`;
}
function detail() {
  const prospect = prospects.find(item => item.id === selected);
  if (!prospect) { page = 'prospects'; return list(); }
  const info = (label, value) => `<div><span>${label}</span><b>${esc(value || '—')}</b></div>`;
  const sources = prospect.sources || [];
  const drafts = prospect.drafts || [];
  return `<div class="content detail"><section class="profile panel"><div class="profile-main"><div class="avatar">${initials(prospect)}</div><div><div class="inline"><h2>${esc(`${prospect.firstName} ${prospect.lastName}`.trim() || prospect.school)}</h2>${badge(prospect.status)}</div><p>${esc(prospect.type)} · ${esc(prospect.school)}</p></div></div><label>STATO<select id="status">${STATUSES.map(status => `<option ${prospect.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select></label></section><div class="detail-grid"><div><section class="panel info"><h3>Informazioni professionali</h3><div class="info-grid">${info('EMAIL BUSINESS',prospect.email)}${info('CITTÀ',prospect.city)}${info('SITO WEB',prospect.website)}${info('INSTAGRAM',prospect.instagram)}${info('DISCIPLINE',(prospect.disciplines || []).join(', '))}${info('PUNTEGGIO',prospect.qualificationScore == null ? 'Non qualificato' : `${prospect.qualificationScore}/100`)}</div>${prospect.qualificationSummary ? `<div class="qualification-summary"><b>Analisi AI</b><p>${esc(prospect.qualificationSummary)}</p></div>` : ''}<hr><h4>NOTE</h4><textarea id="notes">${esc(prospect.notes)}</textarea></section>${sourcePanel(sources)}${activityPanel(prospect.activities || [])}</div><div class="action-column">${aiPanel(prospect,sources)}${drafts.map(draftCard).join('')}${!backend.liveMode ? demoSimulator(prospect) : ''}</div></div></div>`;
}
function sourcePanel(sources) {
  return `<section class="panel sources"><div class="panel-head"><div><h3>Fonti verificabili</h3><p>Ogni dato AI deve derivare da queste fonti</p></div></div>${backend.liveMode ? '<form id="source-form" class="source-form"><label>URL pubblico professionale<input name="url" type="url" placeholder="https://..." required></label><button class="primary" ' + (loading ? 'disabled' : '') + '>Analizza fonte</button></form>' : ''}${sources.length ? sources.map(source => `<article><a href="${esc(source.source_url)}" target="_blank" rel="noopener noreferrer">${esc(source.page_title || source.source_url)}</a><p>${esc(source.evidence_text || 'Nessuna evidenza sintetizzata')}</p><small>Acquisita ${new Date(source.retrieved_at).toLocaleString('it-IT')}</small></article>`).join('') : '<div class="empty">Nessuna fonte registrata.</div>'}</section>`;
}
function activityPanel(activities) { return `<section class="panel activities"><div class="panel-head"><div><h3>Attività</h3><p>Audit delle operazioni</p></div></div>${activities.length ? activities.map(item => `<article><b>${esc(item.description)}</b><small>${new Date(item.created_at).toLocaleString('it-IT')}</small></article>`).join('') : '<div class="empty">Nessuna attività registrata.</div>'}</section>`; }
function aiPanel(prospect,sources) {
  if (!backend.liveMode) return '';
  return `<section class="panel simulator"><div class="ai-title"><b>✦</b><div><h3>AI Sales Assistant</h3><p>Elaborazione server-side con fonti</p></div></div><button class="secondary full" id="qualify" ${!sources.length || loading ? 'disabled' : ''}>Calcola qualificazione</button><button class="primary full top-gap" id="generate-draft" ${(prospect.qualificationScore || 0) < 65 || loading ? 'disabled' : ''}>Genera bozza email</button><small class="privacy">Nessun messaggio può essere inviato.</small></section>`;
}
function draftCard(draft) {
  return `<section class="panel draft" data-draft="${draft.id}"><div class="draft-head"><span>✦ BOZZA AI</span><b>${draft.status === 'PENDING_APPROVAL' ? 'MESSAGGIO DA APPROVARE' : esc(draft.status)}</b></div><label>Oggetto<input class="draft-subject" value="${esc(draft.subject)}" ${draft.status !== 'PENDING_APPROVAL' ? 'disabled' : ''}></label><textarea class="draft-body" ${draft.status !== 'PENDING_APPROVAL' ? 'disabled' : ''}>${esc(draft.body)}</textarea>${draft.status === 'PENDING_APPROVAL' ? '<div><button class="secondary draft-reject">RIFIUTA</button><button class="secondary draft-save">SALVA</button><button class="primary draft-approve">APPROVA</button></div>' : ''}<small>${draft.status === 'APPROVED' ? 'Approvata internamente · NON inviata' : 'Approvazione umana obbligatoria · Nessun invio reale'}</small></section>`;
}
function demoSimulator(prospect) {
  return `<section class="panel simulator"><div class="ai-title"><b>✦</b><div><h3>Simulazione risposta</h3><p>Disponibile soltanto nella demo locale</p></div></div><textarea id="reply" placeholder="Es. Quanto costa?"></textarea><div id="classification"></div><button class="primary full" id="simulate" disabled>Simula risposta</button><small class="privacy">Configura Supabase per AI e persistenza reali.</small></section>`;
}
function prospectModal() {
  return `<div class="overlay" id="overlay"><form class="modal" id="prospect-form"><div class="modal-head"><div><h2>Nuovo prospect</h2><p>Inserisci solo informazioni professionali e verificabili.</p></div><button type="button" id="close">×</button></div><div class="form-grid">${[['firstName','Nome'],['lastName','Cognome'],['school','Scuola / attività professionale *'],['city','Città'],['email','Email business'],['website','Sito web'],['instagram','Instagram handle'],['instagramUrl','Instagram URL']].map(([key,label]) => `<label>${label}<input name="${key}" ${label.includes('*') ? 'required' : ''}></label>`).join('')}<label>Tipologia<select name="type"><option>Scuola</option><option>Insegnante</option><option>Altro</option></select></label><label>Discipline<input name="disciplines" placeholder="Hip Hop, Breaking, House"></label><label class="span2">Note<textarea name="notes"></textarea></label></div><div class="modal-actions"><button type="button" class="secondary" id="cancel">Annulla</button><button class="primary">Aggiungi prospect</button></div></form></div>`;
}
function render() {
  if (backend.liveMode && !backend.currentSession()) { root.innerHTML = loginScreen(); bindLogin(); return; }
  root.innerHTML = shell(page === 'dashboard' ? dashboard() : page === 'prospects' ? list() : detail());
  bind();
}
function bindLogin() {
  document.querySelector('#login-form').onsubmit = event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.target));
    busy(async () => { await backend.signIn(data.email, data.password); await reload(); }, 'Accesso effettuato');
  };
}
function bind() {
  document.querySelectorAll('[data-page]').forEach(button => button.onclick = () => { page = button.dataset.page; render(); });
  document.querySelectorAll('[data-open]').forEach(button => button.onclick = async () => {
    selected = button.dataset.open; page = 'detail';
    if (backend.liveMode) await busy(async () => { const base = prospects.find(item => item.id === selected); const full = await backend.loadProspectDetails(base); prospects = prospects.map(item => item.id === selected ? full : item); });
    else render();
    scrollTo(0,0);
  });
  document.querySelector('#new-prospect').onclick = () => { document.body.insertAdjacentHTML('beforeend', prospectModal()); bindModal(); };
  const globalSearch = document.querySelector('#global-search');
  if (globalSearch) globalSearch.onchange = event => { query = event.target.value; page = 'prospects'; render(); };
  const listSearch = document.querySelector('#list-search');
  if (listSearch) listSearch.oninput = event => { query = event.target.value; render(); const next = document.querySelector('#list-search'); next.focus(); next.setSelectionRange(query.length, query.length); };
  const filterSelect = document.querySelector('#filter');
  if (filterSelect) filterSelect.onchange = event => { filter = event.target.value; render(); };
  document.querySelector('#logout')?.addEventListener('click', () => busy(async () => { await backend.signOut(); prospects = []; }, ''));
  if (page === 'detail') bindDetail();
}
function bindModal() {
  const close = () => document.querySelector('#overlay')?.remove();
  document.querySelector('#close').onclick = close;
  document.querySelector('#cancel').onclick = close;
  document.querySelector('#prospect-form').onsubmit = event => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.target));
    values.disciplines = values.disciplines.split(',').map(value => value.trim()).filter(Boolean);
    const prospect = { ...values, id: crypto.randomUUID(), createdAt: new Date().toISOString(), status: 'DA ANALIZZARE', conversations: [], sources: [], drafts: [], activities: [] };
    close();
    busy(async () => {
      const created = backend.liveMode ? await backend.createProspect(prospect) : prospect;
      prospects.unshift(created); saveDemo(); selected = created.id; page = 'detail';
      if (backend.liveMode) { const full = await backend.loadProspectDetails(created); prospects[0] = full; }
    }, 'Prospect aggiunto');
  };
}
function replaceProspect(updated) { prospects = prospects.map(item => item.id === updated.id ? { ...item, ...updated } : item); }
function bindDetail() {
  const prospect = prospects.find(item => item.id === selected);
  document.querySelector('#status').onchange = event => busy(async () => {
    prospect.status = event.target.value;
    if (backend.liveMode) replaceProspect(await backend.updateProspect(prospect.id, prospect)); else saveDemo();
  }, 'Stato aggiornato');
  document.querySelector('#notes').onchange = event => busy(async () => {
    prospect.notes = event.target.value;
    if (backend.liveMode) replaceProspect(await backend.updateProspect(prospect.id, prospect)); else saveDemo();
  }, 'Note salvate');
  document.querySelector('#source-form')?.addEventListener('submit', event => {
    event.preventDefault(); const url = new FormData(event.target).get('url');
    busy(async () => { await backend.invoke('ingest-source', { prospect_id: prospect.id, source_url: url }); const full = await backend.loadProspectDetails(prospect); replaceProspect(full); }, 'Fonte acquisita e salvata');
  });
  document.querySelector('#qualify')?.addEventListener('click', () => busy(async () => {
    const result = await backend.invoke('qualify-prospect', { prospect_id: prospect.id });
    const full = await backend.loadProspectDetails({ ...prospect, ...result.prospect }); replaceProspect(full);
  }, 'Qualificazione completata'));
  document.querySelector('#generate-draft')?.addEventListener('click', () => busy(async () => {
    await backend.invoke('generate-draft', { prospect_id: prospect.id }); await reload(); const base = prospects.find(item => item.id === selected); replaceProspect(await backend.loadProspectDetails(base));
  }, 'Bozza creata: approvazione umana richiesta'));
  document.querySelectorAll('[data-draft]').forEach(card => {
    const draft = prospect.drafts.find(item => item.id === card.dataset.draft);
    const read = () => ({ ...draft, subject: card.querySelector('.draft-subject').value, body: card.querySelector('.draft-body').value });
    card.querySelector('.draft-save')?.addEventListener('click', () => busy(async () => { await backend.saveDraft(read()); replaceProspect(await backend.loadProspectDetails(prospect)); }, 'Bozza salvata'));
    card.querySelector('.draft-approve')?.addEventListener('click', () => busy(async () => { const edited = read(); await backend.saveDraft(edited); await backend.reviewDraft(edited, 'APPROVED'); replaceProspect(await backend.loadProspectDetails(prospect)); }, 'Bozza approvata internamente. Nessuna email inviata.'));
    card.querySelector('.draft-reject')?.addEventListener('click', () => busy(async () => { await backend.reviewDraft(draft, 'REJECTED', 'Rifiutata dall’operatore'); replaceProspect(await backend.loadProspectDetails(prospect)); }, 'Bozza rifiutata'));
  });
  const reply = document.querySelector('#reply');
  if (reply) {
    const button = document.querySelector('#simulate'); const result = document.querySelector('#classification');
    reply.oninput = () => { button.disabled = !reply.value.trim(); const classification = reply.value.trim() ? classifyReply(reply.value) : null; result.innerHTML = classification ? `<div class="classification ${classification.hot ? 'is-hot' : ''}">${classification.hot ? '<b>🔥 LEAD CALDO — INTERVENTO UMANO CONSIGLIATO</b>' : ''}<span>${esc(classification.label)} · ${badge(classification.suggestedStatus)}</span></div>` : ''; };
    button.onclick = () => { const classification = classifyReply(reply.value); prospect.status = classification.suggestedStatus; prospect.conversations.push({ id: crypto.randomUUID(), direction:'in', text:reply.value, date:'Adesso' }, { id:crypto.randomUUID(), direction:'out', text:generateDraft(prospect, reply.value), date:'Bozza demo' }); saveDemo(); render(); };
  }
}

async function start() {
  if (!backend.liveMode || backend.currentSession()) {
    try { await reload(); } catch (error) { notice = error.message; }
  }
  render();
}
start();
