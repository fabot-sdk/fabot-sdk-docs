import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// main 的版本号取自 package.json；缺省时回退为 latest，保持旧行为
function latestLabel() {
  try {
    const pkg = JSON.parse(
      readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'),
    );
    return pkg.version ? `v${pkg.version}` : 'latest';
  } catch {
    return 'latest';
  }
}

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

// 下拉列出 main 与全部 v* 分支。目录还没构建出来的历史版仍显示，
// 点选时由页面探测，打不开则提示「尚未发布」，而不是从列表里消失。
const catalog = {
  siteRoot,
  versions: listVersionIds().map((id) => ({
    id,
    label: id === 'main' ? latestLabel() : id,
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
