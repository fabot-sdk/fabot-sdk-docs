import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function listVersionIds() {
  let refs = '';
  try {
    refs = execSync('git branch -a', { encoding: 'utf8' });
  } catch {
    refs = '';
  }
  const ids = new Set(['main']);
  for (const line of refs.split('\n')) {
    const trimmed = line.trim().replace(/^\* /, '');
    const ver = trimmed.match(/(?:^|\/)(v[0-9][0-9A-Za-z._-]*)$/);
    if (ver) {
      ids.add(ver[1]);
    }
  }
  const tagged = [...ids].filter((id) => id !== 'main').sort().reverse();
  return ['main', ...tagged];
}

const dest =
  process.argv[2] || path.join(process.cwd(), 'doc_build', 'versions.json');
const siteRoot = (
  process.env.RSPRESS_SITE_ROOT ||
  process.env.RSPRESS_BASE ||
  '/'
).replace(/\/$/, '');

const catalog = {
  siteRoot,
  versions: listVersionIds().map((id) => ({
    id,
    label: id === 'main' ? 'latest' : id,
    prefix: id === 'main' ? '' : `/${id}`,
  })),
};

mkdirSync(path.dirname(dest), { recursive: true });
writeFileSync(dest, `${JSON.stringify(catalog, null, 2)}\n`);
if (existsSync(path.dirname(dest))) {
  console.log(
    `wrote ${path.relative(process.cwd(), dest)} (${catalog.versions
      .map((item) => item.id)
      .join(', ')})`,
  );
}
