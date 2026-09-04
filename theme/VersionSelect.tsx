import { useEffect, useState } from 'react';
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

function currentVersion(pathname: string, catalog: VersionCatalog): VersionItem {
  const tagged = catalog.versions
    .filter((item) => item.prefix)
    .sort((a, b) => b.prefix.length - a.prefix.length);
  const root = catalog.siteRoot.replace(/\/$/, '');
  for (const item of tagged) {
    const base = `${root}${item.prefix}`;
    if (pathname === base || pathname.startsWith(`${base}/`)) {
      return item;
    }
  }
  return catalog.versions.find((item) => item.id === 'main') ?? catalog.versions[0];
}

function restPath(pathname: string, catalog: VersionCatalog, version: VersionItem): string {
  const root = catalog.siteRoot.replace(/\/$/, '');
  const base = `${root}${version.prefix}`;
  if (pathname === base || pathname === `${base}/`) {
    return '/';
  }
  if (pathname.startsWith(`${base}/`)) {
    return pathname.slice(base.length);
  }
  return pathname.startsWith(root) ? pathname.slice(root.length) || '/' : '/';
}

function versionHome(catalog: VersionCatalog, version: VersionItem, rest: string): string {
  const root = catalog.siteRoot.replace(/\/$/, '');
  const prefix = `${root}${version.prefix}` || '/';
  return rest.startsWith('/en') ? `${prefix}/en/` : `${prefix}/`;
}

const FALLBACK_CATALOG: VersionCatalog = {
  siteRoot: '',
  versions: [{ id: 'main', label: 'latest', prefix: '' }],
};

export function VersionSelect() {
  const t = useI18n();
  const location = useLocation();
  const [catalog, setCatalog] = useState<VersionCatalog>(FALLBACK_CATALOG);

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

  const selected = currentVersion(location.pathname, catalog);

  const onChange = async (id: string) => {
    const next = catalog.versions.find((item) => item.id === id);
    if (!next) {
      return;
    }
    const rest = restPath(location.pathname, catalog, selected);
    const root = catalog.siteRoot.replace(/\/$/, '');
    const target = `${root}${next.prefix}${rest === '/' ? '/' : rest}`;
    try {
      const res = await fetch(target, { method: 'HEAD' });
      window.location.href = res.ok ? target : versionHome(catalog, next, rest);
    } catch {
      window.location.href = versionHome(catalog, next, rest);
    }
  };

  return (
    <label className="doc-version-select">
      <span className="doc-version-select__label">{t('version')}</span>
      <select
        className="doc-version-select__control"
        value={selected.id}
        onChange={(event) => {
          void onChange(event.target.value);
        }}
      >
        {catalog.versions.map((item) => (
          <option key={item.id} value={item.id}>
            {item.id === 'main' ? t('latest') : item.label}
          </option>
        ))}
      </select>
    </label>
  );
}
