import { useEffect, useRef, useState } from 'react';
import { useI18n, useLocation, withBase } from '@rspress/core/runtime';
import './version-select.css';

type VersionItem = {
  id: string;
  label: string;
  prefix: string;
};

type VersionCatalog = {
  siteRoot: string;
  versions: VersionItem[];
};

// 站点 base 去掉结尾斜杠：根目录部署时为空串
function normalizeBase(base: string): string {
  const trimmed = base.replace(/\/$/, '');
  return trimmed === '/' ? '' : trimmed;
}

// rspress 的路由会把站点 base 从 pathname 里剥掉，所以不能靠 URL 判断当前版本；
// 每个版本是按各自的 base 单独构建的，用构建出的 base 反查版本
function currentVersion(runtimeBase: string, catalog: VersionCatalog): VersionItem {
  const root = normalizeBase(catalog.siteRoot);
  const exact = catalog.versions.find(
    (item) => `${root}${item.prefix}` === runtimeBase,
  );
  if (exact) {
    return exact;
  }
  // 页面自带的 catalog 与本页构建 base 不一致时，退化为按版本前缀后缀匹配
  const tagged = catalog.versions
    .filter((item) => item.prefix)
    .sort((a, b) => b.prefix.length - a.prefix.length);
  for (const item of tagged) {
    if (runtimeBase === item.prefix || runtimeBase.endsWith(item.prefix)) {
      return item;
    }
  }
  return catalog.versions.find((item) => item.id === 'main') ?? catalog.versions[0];
}

// 版本内部的页面路径。pathname 可能已剥掉 base，也可能保留，两种都归一
function restPath(pathname: string, runtimeBase: string): string {
  if (!pathname) {
    return '/';
  }
  if (runtimeBase) {
    if (pathname === runtimeBase || pathname === `${runtimeBase}/`) {
      return '/';
    }
    if (pathname.startsWith(`${runtimeBase}/`)) {
      return pathname.slice(runtimeBase.length);
    }
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

function versionHome(catalog: VersionCatalog, version: VersionItem, rest: string): string {
  const root = normalizeBase(catalog.siteRoot);
  const prefix = `${root}${version.prefix}` || '/';
  return rest.startsWith('/en') ? `${prefix}/en/` : `${prefix}/`;
}

const FALLBACK_CATALOG: VersionCatalog = {
  siteRoot: '',
  versions: [{ id: 'main', label: 'latest', prefix: '' }],
};

// main 显示为「v1.0.2(最新)」：label 由构建脚本按 package.json 的 version 写入
function optionLabel(item: VersionItem, latest: string): string {
  if (item.id !== 'main') {
    return item.label;
  }
  return item.label && item.label !== 'latest'
    ? `${item.label}(${latest})`
    : latest;
}

export function VersionSelect() {
  const t = useI18n();
  const location = useLocation();
  const [catalog, setCatalog] = useState<VersionCatalog>(FALLBACK_CATALOG);
  // 选集切走时先挂起，避免异步探测期间下拉弹回原值、看起来「点了没反应」
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const probes = useRef(new Map<string, boolean>());

  useEffect(() => {
    let cancelled = false;
    fetch(withBase('/versions.json'))
      .then((res) => (res.ok ? res.json() : null))
      .then((data: VersionCatalog | null) => {
        if (!cancelled && data?.versions?.length) {
          setCatalog(data);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // 本页构建时使用的站点 base（含版本前缀），用于反查当前版本
  const runtimeBase = normalizeBase(withBase('/'));
  const selected = currentVersion(runtimeBase, catalog);

  // 探测目标地址是否存在：切版本时目标页面可能在该版本里还没写（如新增页），
  // 需要回退到该版本首页，而不是跳进 404
  const exists = async (url: string): Promise<boolean> => {
    const cached = probes.current.get(url);
    if (cached !== undefined) {
      return cached;
    }
    let ok = false;
    try {
      const res = await fetch(url, { method: 'HEAD', cache: 'no-store' });
      // 个别静态服务对不存在的路径返回 200 + 404 页，用 content-type 兜底没意义，
      // 这里只认状态码，避免把 404 页当成正常页面
      ok = res.ok;
    } catch {
      ok = false;
    }
    probes.current.set(url, ok);
    return ok;
  };

  const onChange = async (id: string) => {
    const next = catalog.versions.find((item) => item.id === id);
    if (!next || next.id === selected.id || pendingId) {
      return;
    }
    setUnavailable(null);
    setPendingId(next.id);

    const rest = restPath(location.pathname, runtimeBase);
    const root = normalizeBase(catalog.siteRoot);
    const target = `${root}${next.prefix}${rest === '/' ? '/' : rest}`;
    const home = versionHome(catalog, next, rest);

    try {
      if (await exists(target)) {
        window.location.assign(target);
        return;
      }
      if (home !== target && (await exists(home))) {
        window.location.assign(home);
        return;
      }
      // 该版本整体不可用：留在当前页并提示，不跳到 404
      setUnavailable(optionLabel(next, t('latest')));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <label className="doc-version-select">
      <span className="doc-version-select__label">{t('version')}</span>
      <select
        className="doc-version-select__control"
        value={pendingId ?? selected.id}
        disabled={pendingId !== null}
        onChange={(event) => {
          void onChange(event.target.value);
        }}
      >
        {catalog.versions.map((item) => (
          <option key={item.id} value={item.id}>
            {optionLabel(item, t('latest'))}
          </option>
        ))}
      </select>
      {unavailable ? (
        <span className="doc-version-select__hint" role="status">
          {t('versionUnavailable')}
        </span>
      ) : null}
    </label>
  );
}
