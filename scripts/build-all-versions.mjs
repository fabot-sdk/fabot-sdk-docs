import { execSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const siteRoot = (process.env.RSPRESS_SITE_ROOT || '/fabot-sdk-docs').replace(
  /\/$/,
  '',
);
const dist = path.join(repoRoot, 'dist');
const workRoot = path.join(repoRoot, '.version-worktrees');

function sh(cmd, opts = {}) {
  return execSync(cmd, {
    encoding: 'utf8',
    cwd: repoRoot,
    ...opts,
  });
}

function listVersionIds() {
  const remotes = sh('git branch -r', { stdio: ['ignore', 'pipe', 'pipe'] })
    .split('\n')
    .map((line) => line.trim());
  const ids = new Set();
  for (const ref of remotes) {
    const main = ref.match(/^origin\/(main)$/);
    const ver = ref.match(/^origin\/(v[0-9][0-9A-Za-z._-]*)$/);
    if (main) {
      ids.add(main[1]);
    }
    if (ver) {
      ids.add(ver[1]);
    }
  }
  if (!ids.has('main')) {
    ids.add('main');
  }
  const tagged = [...ids].filter((id) => id !== 'main').sort().reverse();
  return ['main', ...tagged];
}

function worktreeAdd(dest, ref) {
  sh(`git worktree add --detach "${dest}" "${ref}"`);
}

function worktreeRemove(dest) {
  try {
    sh(`git worktree remove --force "${dest}"`);
  } catch {
    rmSync(dest, { recursive: true, force: true });
    sh('git worktree prune');
  }
}

rmSync(dist, { recursive: true, force: true });
rmSync(workRoot, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });
mkdirSync(workRoot, { recursive: true });

const ids = listVersionIds();
const catalog = {
  siteRoot,
  versions: ids.map((id) => ({
    id,
    label: id === 'main' ? 'latest' : id,
    prefix: id === 'main' ? '' : `/${id}`,
  })),
};

console.log(
  `building versions: ${catalog.versions.map((v) => v.id).join(', ')}`,
);

for (const version of catalog.versions) {
  const ref = `origin/${version.id}`;
  const wt = path.join(workRoot, version.id);
  console.log(`\n=== ${version.id} (${ref}) ===`);
  worktreeAdd(wt, ref);

  const base = `${siteRoot}${version.prefix}/`;
  execSync('npm ci', { cwd: wt, stdio: 'inherit' });
  execSync('npm run build', {
    cwd: wt,
    stdio: 'inherit',
    env: { ...process.env, RSPRESS_BASE: base },
  });

  const dest = version.id === 'main' ? dist : path.join(dist, version.id);
  mkdirSync(dest, { recursive: true });
  cpSync(path.join(wt, 'doc_build'), dest, { recursive: true });
  rmSync(path.join(dest, '__ssg__'), { recursive: true, force: true });
  writeFileSync(
    path.join(dest, 'versions.json'),
    `${JSON.stringify(catalog, null, 2)}\n`,
  );
  worktreeRemove(wt);
}

writeFileSync(path.join(dist, '.nojekyll'), '');
rmSync(workRoot, { recursive: true, force: true });
console.log(`\nassembled ${catalog.versions.length} version(s) into dist/`);
