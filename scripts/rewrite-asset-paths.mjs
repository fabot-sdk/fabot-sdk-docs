import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const pagesBase = process.env.RSPRESS_BASE;
if (pagesBase && pagesBase !== '/') {
  console.log(`skip rewrite: RSPRESS_BASE=${pagesBase}`);
  process.exit(0);
}

const root = path.resolve('doc_build');

async function walk(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (entry.name.endsWith('.html')) {
      files.push(full);
    }
  }
  return files;
}

function toRelative(fromFile, urlPath) {
  const clean = urlPath.replace(/^\//, '') || 'index.html';
  let rel = path.relative(path.dirname(fromFile), path.join(root, clean));
  rel = rel.split(path.sep).join('/');
  if (!rel.startsWith('.')) {
    rel = `./${rel}`;
  }
  return rel;
}

function rewrite(html, file) {
  return html.replace(
    /\b(href|src)="\/(?!\/)([^"]*)"/g,
    (match, attr, urlPath) => {
      if (urlPath.startsWith('http:') || urlPath.startsWith('https:')) {
        return match;
      }
      return `${attr}="${toRelative(file, urlPath)}"`;
    },
  );
}

const files = await walk(root);
for (const file of files) {
  const html = await readFile(file, 'utf8');
  await writeFile(file, rewrite(html, file));
}

console.log(`rewrote asset/link paths in ${files.length} HTML files`);
