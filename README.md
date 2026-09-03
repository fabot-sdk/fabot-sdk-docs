# fabot_sdk_docs

fabot SDK（`fabot-sdk` Python wheel）的独立用户文档仓库，使用 [MkDocs Material](https://squidfunk.github.io/mkdocs-material/) + [mkdocs-static-i18n](https://github.com/ultrabug/mkdocs-static-i18n) 构建中英双语静态站点。当前站点只发布 Python 文档。

- 范围：**只覆盖 SDK 本身**（应用侧如何连接、控制、监控机器人）。

## 目录结构

```text
docs/
├── index.md                # 首页（中文，默认语言）；英文为同名 .en.md 后缀
├── overview.md             # 概览（SDK 位置、术语、两层 API）
├── install/                # 安装与配置
│   ├── index.md
│   ├── requirements.md
│   ├── python.md
│   └── compatibility.md
├── usage/                  # 常规操作
│   ├── index.md
│   ├── connection.md
│   ├── commands-operations.md
│   ├── events-channels.md
│   ├── status-faults.md
│   ├── errors.md
│   ├── mock.md
│   ├── configuration.md
│   └── services.md
├── tutorials/              # 入门教程（python.md）
├── examples/python/        # 使用示例（index + robot / chassis / io / mock / configuration）
├── reference/python/       # 接口参考（Robot 入口 + 15 个能力模块；八段式：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源）
└── troubleshooting.md      # 故障排除（stub）
```

示例与 API 在 `examples/python/`、`reference/python/`。概念页（`overview` / `install` / `usage` / `troubleshooting`）只写 Python。

## 多语言约定

- 默认语言中文（`zh`），文件名不带后缀；英文同名加 `.en` 后缀。
- 新增/修改页面必须双语成对；导航标题翻译维护在 `mkdocs.yml` 的 `i18n.languages[].nav_translations`。

## 书写规范

- 每页顶部必须有 YAML frontmatter：`title` / `status` / `owner` / `updated`。
- 遵循 CommonMark/GFM，代码围栏标注语言，术语与已发布 API 一致；能力模块页按八段式组织：模块概述 → API 总览 → 方法 → 通道 → 事件 → 异常 → 状态 → 资源。
- 接口拼写以已安装的 `fabot` 包（含 `.pyi`）为准；禁止凭记忆杜撰接口。

## 本地构建

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

mkdocs serve   # 本地预览（含热重载），右上角切换语言
mkdocs build   # 输出 site/（中文）与 site/en/（英文）
```
