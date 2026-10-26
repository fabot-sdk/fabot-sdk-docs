import {
  isProduction,
  routePathToMdPath,
  useI18n,
  usePageData,
  useSite,
  withBase,
} from '@rspress/core/runtime';
import { useMemo } from 'react';
import './download-menu.css';

function llmsPath(lang: string, defaultLang: string, file: string): string {
  const prefix = lang && lang !== defaultLang ? `/${lang}` : '';
  return withBase(`${prefix}/${file}`);
}

function pageDownloadName(
  routePath: string,
  lang: string,
  defaultLang: string,
): string {
  const segments = routePath.split('/').filter(Boolean);
  const last = segments[segments.length - 1];
  const langPrefix = lang && lang !== defaultLang ? `${lang}-` : '';
  return last ? `${langPrefix}${last}.md` : `fabot-sdk-docs-${langPrefix}index.md`;
}

export function DownloadMenu() {
  const t = useI18n();
  const { site } = useSite();
  const { page } = usePageData();

  const links = useMemo(() => {
    const lang = page.lang ?? site.lang;
    const isDefaultLang = !lang || lang === site.lang;
    const fullTxt = llmsPath(lang, site.lang, 'llms-full.txt');
    const indexTxt = llmsPath(lang, site.lang, 'llms.txt');
    const mdPath = routePathToMdPath(page.routePath);

    return [
      {
        key: 'page',
        label: t('downloadPage'),
        href: mdPath,
        download: pageDownloadName(page.routePath, lang, site.lang),
      },
      {
        key: 'full',
        label: t('downloadFull'),
        href: fullTxt,
        download: isDefaultLang
          ? 'fabot-sdk-docs-full.md'
          : `fabot-sdk-docs-full-${lang}.md`,
      },
      {
        key: 'index',
        label: t('downloadIndex'),
        href: indexTxt,
        download: isDefaultLang
          ? 'fabot-sdk-docs-llms.txt'
          : `fabot-sdk-docs-llms-${lang}.txt`,
      },
    ];
  }, [page.lang, page.routePath, site.lang, t]);

  // 下载文件只在构建阶段生成；开发服务器会把这些路径回退成 HTML 页面，导致下载失败
  if (!isProduction()) {
    return (
      <details className="doc-download">
        <summary className="doc-download__trigger">{t('download')}</summary>
        <ul className="doc-download__menu">
          <li className="doc-download__note">{t('downloadDevHint')}</li>
        </ul>
      </details>
    );
  }

  return (
    <details className="doc-download">
      <summary className="doc-download__trigger">{t('download')}</summary>
      <ul className="doc-download__menu">
        {links.map((link) => (
          <li key={link.key}>
            <a
              className="doc-download__item"
              href={link.href}
              download={link.download}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
