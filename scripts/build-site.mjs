import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

await rm(new URL('../dist/', import.meta.url), { recursive: true, force: true });
await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await cp(new URL('../src/', import.meta.url), new URL('../dist/src/', import.meta.url), { recursive: true, filter: source => !source.endsWith('.test.js') });
await cp(new URL('../index.html', import.meta.url), new URL('../dist/index.html', import.meta.url));
const fallback = await readFile(new URL('../config.js', import.meta.url), 'utf8');
const url = process.env.PUBLIC_SUPABASE_URL;
const key = process.env.PUBLIC_SUPABASE_ANON_KEY;
const config = url && key
  ? `window.DSU_CONFIG = Object.freeze(${JSON.stringify({ supabaseUrl: url, supabaseAnonKey: key })});\n`
  : fallback;
await writeFile(new URL('../dist/config.js', import.meta.url), config);
console.log(`Sito creato in dist/ (${url && key ? 'Supabase configurato' : 'modalità demo'})`);
