import { readFile, mkdir, writeFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [css, dataSource, aiSource, supabaseSource, appSource] = await Promise.all([
  read('../src/styles.css'), read('../src/data.js'), read('../src/ai.js'), read('../src/supabase.js'), read('../src/app.js'),
]);
const stripExports = source => source.replaceAll('export const ', 'const ').replaceAll('export function ', 'function ').replaceAll('export async function ', 'async function ');
const data = stripExports(dataSource);
const ai = stripExports(aiSource);
const supabase = stripExports(supabaseSource)
  .replace('const config = globalThis.DSU_CONFIG || {};', 'const config = {};')
  .replace('const liveMode =', 'const liveMode =');
const backendNames = ['liveMode','currentSession','signIn','refresh','signOut','listProspects','createProspect','updateProspect','loadProspectDetails','invoke','saveDraft','reviewDraft'];
const backend = `const backend={${backendNames.join(',')}};`;
const app = appSource.replace(/^import .*;\n/gm, '');
const html = `<!doctype html><html lang="it"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="description" content="Anteprima portabile di DSU Sales Agent"><title>DSU Sales Agent — Anteprima</title><style>${css}</style></head><body><div id="root"></div><script>${data}\n${ai}\n${supabase}\n${backend}\n${app}</script></body></html>`;
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/preview.html', import.meta.url), html);
console.log('Anteprima portabile creata in dist/preview.html');
