import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import mermaid from 'rspress-plugin-mermaid';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  // GitHub Pages 项目站：https://fabot-sdk.github.io/fabot-sdk-docs/
  base: process.env.RSPRESS_BASE ?? '/',
  // 多版本汇总产物在 dist/，用 `npm run preview:versions` 预览
  outDir: process.env.RSPRESS_OUT_DIR ?? 'doc_build',
  // 顶层 title 只能用语言中立的文案：Rspress 用它作为每页 <title> 后缀与 llms.txt 标题，
  // 写成中文会让英文站也带中文后缀。各语言的完整名称放在 locales 里。
  title: 'fabot SDK',
  lang: 'zh',
  locales: [
    {
      lang: 'zh',
      label: '简体中文',
      title: 'fabot SDK 文档',
      description: 'fabot 机器人软件平台 SDK 使用文档（Python）',
    },
    {
      lang: 'en',
      label: 'English',
      title: 'fabot SDK Docs',
      description: 'fabot robot software platform SDK documentation (Python)',
    },
  ],
  // 构建时额外输出每页 Markdown、llms.txt 与 llms-full.txt（下载入口见 theme/DownloadMenu.tsx）
  llms: true,
  themeConfig: {
    // 下载入口放在顶栏，关闭内置在 H1 下的 LLMS UI
    llmsUI: false,
  },
  builderConfig: {
    performance: {
      buildCache: {
        // base 来自环境变量，rspress.config.ts 内容不变时不会让持久缓存失效，
        // 否则下一次 `npm run build` 会沿用上一次的 /v1.0.0/ 等 base
        cacheDigest: [process.env.RSPRESS_BASE ?? '/'],
      },
    },
  },
  plugins: [mermaid()],
});
