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

// rspress 的路由会把站点 base 从 pathname 里剥掉，地址栏里的 /v1.0.0 仍在。
// 先用构建 base 反查；对不上时再看浏览器地址，避免历史版页面仍显示成最新版。
function matchPrefixed(probe: string, catalog: VersionCatalog): VersionItem | undefined {
  const normalized = normalizeBase(probe);
  if (!normalized) {
    return undefined;
  }
  const root = normalizeBase(catalog.siteRoot);
  const tagged = catalog.versions
    .filter((item) => item.prefix)
    .sort((a, b) => b.prefix.length - a.prefix.length);
  for (const item of tagged) {
    const base = `${root}${item.prefix}`;
    if (normalized === base || normalized.startsWith(`${base}/`)) {
      return item;
    }
  }
  return undefined;
}

function currentVersion(
  runtimeBase: string,
  browserPath: string,
  catalog: VersionCatalog,
): VersionItem {
  return (
    matchPrefixed(runtimeBase, catalog) ??
    matchPrefixed(browserPath, catalog) ??
    catalog.versions.find((item) => item.id === 'main') ??
    catalog.versions[0]
  );
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
  const indexHtml = useRef<Promise<string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(withBase('/versions.json'))
      .then(async (res) => {
        if (!res.ok) {
          return null;
        }
        const type = res.headers.get('content-type') || '';
        // 预览服务器会把不存在的路径回退成首页 HTML，不能当成目录
        if (!type.includes('json')) {
          return null;
        }
        return (await res.json()) as VersionCatalog;
      })
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
  const browserPath = typeof window === 'undefined' ? '' : window.location.pathname;
  const selected = currentVersion(runtimeBase, browserPath, catalog);

  // 探测目标地址是否存在：切版本时目标页面可能在该版本里还没写（如新增页），
  // 需要回退到该版本首页，而不是跳进 404
  const siteIndexHtml = () => {
    if (!indexHtml.current) {
      indexHtml.current = fetch(withBase('/index.html'), { cache: 'no-store' })
        .then((res) => (res.ok ? res.text() : ''))
        .catch(() => '');
    }
    return indexHtml.current;
  };

  // 预览服务器对缺失路径返回 200 和站点首页。和首页正文相同、且请求的不是首页时，视为不存在。
  const exists = async (url: string): Promise<boolean> => {
    const cached = probes.current.get(url);
    if (cached !== undefined) {
      return cached;
    }
    let ok = false;
    try {
      const res = await fetch(url, { method: 'GET', cache: 'no-store' });
      if (!res.ok) {
        ok = false;
      } else {
        const type = res.headers.get('content-type') || '';
        if (!type.includes('text/html')) {
          ok = true;
        } else {
          const html = await res.text();
          const path = new URL(url, window.location.origin).pathname;
          const indexPath = new URL(withBase('/index.html'), window.location.origin)
            .pathname;
          const rootPath = new URL(withBase('/'), window.location.origin).pathname;
          const askingForIndex =
            path === indexPath || path === rootPath || path === `${rootPath.replace(/\/$/, '')}/`;
          ok = askingForIndex || html !== (await siteIndexHtml());
        }
      }
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
