# AGENTS.md

面向 AI / 自动化助手的仓库操作指南。人类可读总览见 [`README.md`](README.md)。

## 地图

本仓库是 fabot SDK（`fabot-sdk` Python wheel）的**用户文档**站点，Rspress 构建。当前站点只发布 Python 文档。**只写 SDK 本身**，不写 fabot_system 平台内部设计。SDK 源码与契约在 `../fabot_system`（本仓库只读引用，不改）。

**Python API 事实来源按优先级取第一个存在的路径**（不同检出 / 构建状态下可用路径不同）：

1. 最新生成的客户端包：`../fabot_system/build/amd64/colcon/fabot_sdk_py/generated/client_install/fabot/`
2. 已安装前缀：`../fabot_system/build/amd64/prefix/fabot_sdk_py/lib/python3.12/site-packages/fabot/`
3. 发行物 wheel：`../fabot_system/release/fabot_sdk-*.whl`（解包后使用）

`_version.py` 里的版本号不一定随每次构建更新，**判断 API 是否存在以 `.pyi` / `*.py` 的实际定义为准**，不要用版本字符串比对。

侧栏按三大章节组织：**入门**（Getting Started）、**章节**（Sections）、**参考**（Reference）。三个大标题是根 `_meta.json` 里的 `section-header`，条目由根 `_meta.json` 以嵌套路径（如 `usage/basics`、`getting-started/install`）直接引用目录与文件；只有被根引用的目录才需要自己的 `_meta.json` 做条目排序。标题文案 key 在 `i18n.json`。

| 路径 | 用途 |
|------|------|
| `docs/zh/`、`docs/en/` | 中英内容（路径一一对应） |
| `docs/*/getting-started/` | 入门：`overview.md` 概览、`install/` 安装与配置、`quickstart.md` 第一个程序 |
| `docs/*/usage/` | 常规操作，五个主题章：`basics/`（连接、约定、Command/Operation、并发安全）、`data/`（事件通道、状态故障、坐标系）、`diagnostics/`（错误、文本目录、自检、可观测性）、`configuration/`（配置、技能、服务）、`testing/`（Mock、迁移、机器人系统与本地控制台） |
| `docs/*/examples/python/` | Python 示例（按能力分页） |
| `docs/*/reference/python/` | Python API 参考（Robot 入口 + 诊断码 + 16 个能力模块 + 技能 `skills/` + 平台服务 `services/`，八段式：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源） |
| `docs/*/troubleshooting.md` | 故障排除 |
| `docs/*/changelog.md` | 更新日志（按版本倒序，随发版追加） |
| `docs/*/_nav.json`、`_meta.json` | 顶栏与全局侧栏 |
| `docs/public/` | 站点静态资源（截图等，按 `/images/...` 引用） |
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
- **以真实 API 为准**：类名、方法签名、槽位属性以生效的 `fabot` 包 `.pyi`（路径见上节优先级）为准；禁止凭记忆杜撰接口。
- **版本基线**：站点对应 SDK 1.1.0 开发线。改签名或补接口后，用一段 `Robot.mock()` 冒烟验证：把文档里的调用名逐个 `hasattr` 一遍；新增能力模块要同步 `overview.md`、`reference/python/index.md`、`_meta.json`、槽位表与状态/故障/事件/通道清单。
- **发布文档用语**：`docs/` 与 `README.md` 的正文、TODO、注释不得出现契约 / Contract YAML、`schemas/` / `src/schemas/`、fabot_system、docgen、adapter 配置模板等内部概念。公开 API 名称（`adapter` / `has_adapter` / `as_adapter`、Slot、Command、Operation、Channel、Event）可以保留。本文件是仓库维护说明，继续写 fabot_system 作为事实来源。
- **多版本**：`main` 为默认版（URL `/`），顶栏显示 `v<package.json 的 version>(最新)`（当前为 `v1.1.0-beta.2(最新)`）；推进版本时先改 `package.json` 的 `version`。历史版用 `v1.0.0` 这类分支，发布到 `/v1.0.0/`。从已有切换器的 `main` 切分支并 `git push github v1.0.0` 后，CI 才会收录该版本。`versions.json` 列出 `main` 与全部 `v*` 分支，顶栏为 `v<version>(最新)` 与各历史版。本地 `npm run build` 没有历史版目录，点选时提示尚未发布；要本地打开历史版用 `npm run build:versions` + `npm run preview:versions`（汇总产物在 `dist/`）。rspack 持久缓存必须把 `RSPRESS_BASE` 算进 `cacheDigest`，否则下一次构建会沿用上一次的 base，下拉退回「最新」。改 `theme/VersionSelect.tsx` 后注意历史版仍用各自分支里的旧组件，向前兼容的改动需另行下放到版本分支。
- **部署**：Pages 只允许从 `main` 部署（`github-pages` 环境的部署分支规则），所以 `build` / `deploy` 都带 `if: github.ref == 'refs/heads/main'`；推送 `v*` 时由 `refresh-from-main` 作业调度一次 `main` 的运行来重建全部版本。改 workflow 后要把它同步到各个 `v*` 分支（每个分支用的都是自己那份 workflow），否则推该分支仍会按旧逻辑部署并被环境规则拒绝。
- **更新日志**：发版时在 `docs/*/changelog.md` 顶部追加一节，格式为新版本号 + 发布日期 + `新增` / `变更` / `修复` / `兼容性`；只写 SDK 对外可见的变化，破坏性变更必须显式标注。历史版本分支上的更新日志只追加到该版本为止，不回填 `main` 的新版本内容。
- **验证**：改动后运行 `npm run build` 确认无 ERROR 再提交。
- **Git**：无用户明确要求时不要 commit / push。commit 信息（subject / body）用中文；`type` / `scope` 仍英文。见 [`git-commit.md`](git-commit.md)、[`git-branch.md`](git-branch.md)。

## 构建

```bash
npm install
npm run build    # 或 npm run dev 本地预览
```
