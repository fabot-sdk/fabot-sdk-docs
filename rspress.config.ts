import * as path from 'node:path';
import { defineConfig } from '@rspress/core';
import mermaid from 'rspress-plugin-mermaid';

export default defineConfig({
  root: path.join(__dirname, 'docs'),
  title: 'fabot SDK 文档',
  description: 'fabot 机器人软件平台 SDK 使用文档（Python）',
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
  plugins: [mermaid()],
});
