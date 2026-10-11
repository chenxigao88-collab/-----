// Restore package links lost when copying a pnpm checkout between Windows machines.
import { readFileSync, existsSync, mkdirSync, symlinkSync } from 'node:fs';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../node_modules/', import.meta.url));
const packages = JSON.parse(readFileSync(resolve(root, '.package-map.json'), 'utf8')).packages;
let restored = 0;
for (const [id, pkg] of Object.entries(packages)) {
  const source = resolve(root, pkg.url);
  if (!existsSync(source)) continue;
  const modules = id === '.' ? root : source.slice(0, source.lastIndexOf('node_modules') + 'node_modules'.length);
  for (const [name, dependency] of Object.entries(pkg.dependencies)) {
    if (dependency === '.' || dependency === id || !packages[dependency]) continue;
    const target = resolve(root, packages[dependency].url), link = resolve(modules, name);
    const inside = path => { const rel = relative(root, path); return !rel.startsWith('..') && !isAbsolute(rel); };
    if (!inside(target) || !inside(link) || !existsSync(target) || existsSync(link)) continue;
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(target, link, 'junction');
    restored++;
  }
}
// The manifest gained chai types after the copied package map was generated.
const chai = resolve(root, '.pnpm/@types+chai@5.2.3/node_modules/@types/chai');
if (existsSync(chai) && !existsSync(resolve(root, '@types/chai'))) symlinkSync(chai, resolve(root, '@types/chai'), 'junction');
console.log(`Restored ${restored} local package links.`);
