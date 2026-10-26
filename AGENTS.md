# AGENTS.md

面向 AI / 自动化助手的仓库操作指南。人类可读总览见 [`README.md`](README.md)。

## 地图

本仓库是 fabot SDK（`fabot-sdk` Python wheel）的**用户文档**站点，Rspress 构建。当前站点只发布 Python 文档。**只写 SDK 本身**，不写 fabot_system 平台内部设计。SDK 源码与契约在 `../fabot_system`（本仓库只读引用，不改）；Python API 事实来源 `../fabot_system/install/fabot_sdk_py/lib/python3.12/site-packages/fabot/`。

| 路径 | 用途 |
|------|------|
| `docs/zh/`、`docs/en/` | 中英内容（路径一一对应） |
| `docs/*/overview.md` | 概览（SDK 位置、术语、两层 API） |
| `docs/*/install/` | 安装与配置（环境、Python、版本配套） |
| `docs/*/usage/` | 常规操作（连接、Command/Operation、事件与通道、状态故障、配置、服务、错误、Mock） |
| `docs/*/tutorials/` | 入门教程（`python.md`） |
| `docs/*/examples/python/` | Python 示例（按能力分页） |
| `docs/*/reference/python/` | Python API 参考（Robot 入口 + 15 个能力模块，八段式：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源） |
| `docs/*/troubleshooting.md` | 故障排除 |
| `docs/*/changelog.md` | 更新日志（按版本倒序，随发版追加） |
| `docs/*/_nav.json`、`_meta.json` | 顶栏与全局侧栏 |
| `i18n.json` | 导航等共用文案 |
| `theme/` | 顶栏版本切换器（读 `versions.json`） |
| `scripts/build-all-versions.mjs` | CI 按 `main` + `v*` 分支拼站 |
| `rspress.config.ts` | 站点配置 |
| `git-commit.md` | Git 提交规范（不进站点） |
| `git-branch.md` | Git 分支管理规范（不进站点） |

示例与 API 在 `examples/python/`、`reference/python/`。概念页（`overview` / `install` / `usage` / `troubleshooting` / `changelog`）只写 Python。

## 必须遵守

- **双语成对**：新增/修改页面必须同步 `docs/zh/<path>` 与 `docs/en/<path>`；新增侧栏条目同步各语言 `_meta.json`，共用标题写入 `i18n.json`。
- **frontmatter**：每页必填 `title` / `status` / `owner` / `updated`，`title` 与首个 `#` 标题一致；书写规范遵循 `fabot_system/docs/sdk/00-doc-guideline.md`。
- **以真实 API 为准**：类名、方法签名、槽位属性以 `fabot` 包 `.pyi` 与 `src/schemas/` 契约为准；禁止凭记忆杜撰接口。能力模块页可用 fabot_system 的 `fabot-sdk-docgen` skill 生成。
- **发布文档用语**：`docs/` 与 `README.md` 的正文、TODO、注释不得出现契约 / Contract YAML、`schemas/` / `src/schemas/`、fabot_system、docgen、adapter 配置模板等内部概念。公开 API 名称（`adapter` / `has_adapter` / `as_adapter`、Slot、Command、Operation、Channel、Event）可以保留。本文件是仓库维护说明，继续写 fabot_system 作为事实来源。
- **多版本**：`main` 为默认版（URL `/`），顶栏显示 `v<package.json 的 version>(最新)`（如 `v1.0.2(最新)`）；推进版本时先改 `package.json` 的 `version`。历史版用 `v1.0.0` 这类分支，发布到 `/v1.0.0/`。从已有切换器的 `main` 切分支并 `git push github v1.0.0` 后，CI 才会收录该版本。`versions.json` 只收录实际构建出目录的版本：本地 `npm run build` 单版本构建时下拉只有 `v<version>(最新)`；要本地预览全部版本用 `npm run build:versions` + `npm run preview:versions`（汇总产物在 `dist/`）。改 `theme/VersionSelect.tsx` 后注意历史版仍用各自分支里的旧组件，向前兼容的改动需另行下放到版本分支。
- **更新日志**：发版时在 `docs/*/changelog.md` 顶部追加一节，格式为新版本号 + 发布日期 + `新增` / `变更` / `修复` / `兼容性`；只写 SDK 对外可见的变化，破坏性变更必须显式标注。历史版本分支上的更新日志只追加到该版本为止，不回填 `main` 的新版本内容。
- **验证**：改动后运行 `npm run build` 确认无 ERROR 再提交。
- **Git**：无用户明确要求时不要 commit / push。commit 信息（subject / body）用中文；`type` / `scope` 仍英文。见 [`git-commit.md`](git-commit.md)、[`git-branch.md`](git-branch.md)。

## 构建

```bash
npm install
npm run build    # 或 npm run dev 本地预览
```
