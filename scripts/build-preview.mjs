import { readFile, mkdir, writeFile } from 'node:fs/promises';

const [css, dataSource, aiSource, appSource] = await Promise.all([
  readFile(new URL('../src/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../src/data.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/ai.js', import.meta.url), 'utf8'),
  readFile(new URL('../src/app.js', import.meta.url), 'utf8'),
]);

const data = dataSource.replaceAll('export const ', 'const ');
const ai = aiSource.replaceAll('export function ', 'function ');
const app = appSource.replace(/^import .*;\n/gm, '');
const html = `<!doctype html>
<html lang="it">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="Anteprima portabile di DSU Sales Agent">
  <title>DSU Sales Agent — Anteprima</title>
  <style>${css}</style>
</head>
<body>
  <div id="root"></div>
  <script>${data}\n${ai}\n${app}</script>
</body>
</html>`;

await mkdir(new URL('../dist/', import.meta.url), { recursive: true });
await writeFile(new URL('../dist/preview.html', import.meta.url), html);
console.log('Anteprima portabile creata in dist/preview.html');
