# fabot_sdk_docs

fabot SDK（`fabot-sdk` Python wheel）的独立用户文档仓库，使用 [Rspress](https://rspress.rs/) 构建中英双语静态站点。当前站点只发布 Python 文档。

- 范围：**只覆盖 SDK 本身**（应用侧如何连接、控制、监控机器人）。

## 目录结构

```text
docs/
├── zh/                     # 中文（默认语言，URL 无前缀）
│   ├── index.md            # 首页
│   ├── overview.md         # 概览（SDK 位置、术语、两层 API）
│   ├── install/            # 安装与配置
│   ├── usage/              # 常规操作
│   ├── tutorials/          # 入门教程（python.md）
│   ├── examples/python/    # 使用示例（index + 按能力的完整示例）
│   ├── reference/python/   # 接口参考（Robot 入口 + 15 个能力模块）
│   └── troubleshooting.md  # 故障排除
└── en/                     # 英文（URL 前缀 /en/），页面路径与 zh 一一对应
```

示例与 API 在 `examples/python/`、`reference/python/`。概念页（`overview` / `install` / `usage` / `troubleshooting`）只写 Python。

## 多语言约定

- 默认语言中文（`zh`），路径为 `docs/zh/<path>`；英文为 `docs/en/<path>`。
- 新增/修改页面必须双语成对；顶栏与侧栏维护在各语言目录的 `_nav.json` / `_meta.json`，共用文案在根目录 `i18n.json`。

## 书写规范

- 每页顶部必须有 YAML frontmatter：`title` / `status` / `owner` / `updated`。
- 遵循 CommonMark/GFM，代码围栏标注语言，术语与已发布 API 一致；能力模块页按八段式组织：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源。
- 提示块使用 Rspress 容器语法（`:::note` / `:::warning`），流程图使用 `mermaid` 代码围栏。
- 接口拼写以已安装的 `fabot` 包（含 `.pyi`）为准；禁止凭记忆杜撰接口。

## 本地构建

需要 Node.js `^20.19 || >=22.12`。

```bash
npm install

npm run dev       # 本地预览（含热重载），右上角切换语言
npm run build     # 输出 doc_build/（中文无前缀，英文在 en/）
npm run preview   # 用本地 HTTP 服务预览生产构建（推荐）
```

构建会把 CSS/JS 写成相对路径，可以直接打开 `doc_build/index.html` 看排版。搜索、客户端路由和语言自动跳转仍建议用 `npm run dev` 或 `npm run preview`。

推送到 GitHub `main` 或 `v*` 后由 Actions 发布到 [GitHub Pages](https://fabot-sdk.github.io/fabot-sdk-docs/)。仓库 Settings → Pages → Source 选 **GitHub Actions**。

## 多版本（按分支）

- `main`：当前默认版，路径为 `/`（线上即站点根）。
- `v0.1`、`v0.2` 等：历史版，路径为 `/v0.1/`、`/v0.2/`。
- 从已包含版本切换器的 `main` 切出版本分支后再推送，CI 才会把它编进站点：

```bash
git branch v0.1
git push github v0.1
```

推送 `main` 或任意 `v*` 时会重建**全部**版本再部署。本地 `npm run build` / `npm run dev` 只构建当前分支。

## 仓库维护

- Git 提交规范：[`git-commit.md`](git-commit.md)
- Git 分支管理规范：[`git-branch.md`](git-branch.md)
