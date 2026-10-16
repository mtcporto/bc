import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const folders = ['lib', 'api', 'scripts', 'test'];
const files = ['proxy-server.js', 'public/app.js', 'public/site.js', 'public/developers.js', 'public/sources.js', 'public/script.js'];
for (const folder of folders) {
  for (const entry of readdirSync(path.join(root, folder), { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && /\.(m?js)$/.test(entry.name)) files.push(path.relative(root, path.join(entry.parentPath, entry.name)));
  }
}
for (const file of files) {
  const check = spawnSync(process.execPath, ['--check', path.join(root, file)], { stdio: 'inherit' });
  if (check.status !== 0) process.exit(1);
}
for (const file of ['public/index.html', 'public/desenvolvedores.html', 'public/fontes.html', 'public/app.css', 'vercel.json']) {
  if (!readFileSync(path.join(root, file), 'utf8').trim()) throw new Error(`Arquivo vazio: ${file}`);
}
console.log(`Validacao concluida: ${files.length} arquivos JavaScript. Frontend estatico, sem compilacao.`);
