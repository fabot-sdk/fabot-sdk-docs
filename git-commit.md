# Git 提交规范

## 1. 为什么需要提交规范？

- **可读性**：清晰的提交历史便于团队成员快速理解每次变更的目的。
- **可追溯性**：便于通过提交记录定位问题、回滚或生成 CHANGELOG。
- **自动化**：规范的提交信息可驱动自动化版本发布、生成发布说明等。

---

## 2. 提交信息格式

每条提交信息由 **Header**、**Body**（可选）和 **Footer**（可选）组成：

```text
<type>(<scope>): <subject>

1. ...
2. ...
3. ...

<footer>
```

### 2.1 Header（必填）

Header 只有一行，包含三个字段：**type**（必填）、**scope**（可选）和 **subject**（必填）。

#### Type（提交类型）

| 类型 | 说明 |
|------|------|
| `feat` | 新功能（feature） |
| `fix` | 修复 bug |
| `docs` | 文档（documentation） |
| `style` | 格式（不影响内容含义的变动，如空格、换行） |
| `refactor` | 重构（既不是新增功能，也不是修改 bug） |
| `perf` | 性能优化 |
| `test` | 增加测试 |
| `chore` | 构建过程或辅助工具的变动（如依赖更新、配置修改） |
| `ci` | 持续集成（CI）配置变动 |
| `build` | 影响构建系统或外部依赖的变动 |
| `revert` | 回滚到上一个版本 |

本仓库日常以 `docs` 为主；站点配置、依赖与构建脚本仍用 `chore` / `ci` / `build`。

#### Scope（影响范围）

用于说明 commit 影响的范围，视项目而定，可省略。本仓库可参考：

- `install`、`usage`、`reference`、`examples`、`tutorials`、`overview`
- `mkdocs`（站点配置、导航、i18n）

#### Subject（简短描述）

- **使用中文**（`type` / `scope` 仍用英文约定，如 `docs(usage): 补充连接与 wait_ready 说明`）。
- 不超过 50 个字符。
- 以动词开头，简洁说明改动，如 `补充`、`修复`、`调整`。
- 结尾不加句号（`。` / `.`）。

---

### 2.2 Body（可选）

- **使用中文**。
- 采用编号条目的结构化描述，每条尽量精炼（一条一事：动机、行为对比、或关键改动点）。
- 每行不超过 72 个字符。
- 条目之间不写铺垫段落；Footer（Issue / `BREAKING CHANGE`）仍放在 Body 之后、空行分隔。

```text
1. ...
2. ...
3. ...
```

---

### 2.3 Footer（可选）

#### 关联 Issue

```text
Closes #123
Fixes #456
Relates to #789
```

#### 不兼容变动（Breaking Change）

如果当前内容与上一个版本不兼容，Footer 部分以 `BREAKING CHANGE:` 开头，后面描述变动的详细信息和迁移方法。

```text
BREAKING CHANGE: `Robot.connect` 示例改为必须先调用 `wait_ready`。
```

---

## 3. 完整示例

### 示例 1：补充文档

```text
docs(usage): 补充连接与 wait_ready 说明

1. 明确 `connect` 成功不等于能力已就绪
2. 补充超时与重连的推荐写法

Closes #342
```

### 示例 2：修复文档错误

```text
fix(reference): 修正 Arm.movej 参数单位

1. 关节角示例从度改为弧度，与已发布 API 一致
2. 同步中英文参考页

Fixes #567
```

### 示例 3：更新安装说明

```text
docs(install): 补充 Python 3.12 环境要求

1. 标明当前站点只发布 Python 文档
2. 补充常见虚拟环境创建步骤
```

### 示例 4：包含不兼容变动

```text
docs(examples): 将示例入口改为按能力分页

1. 拆分原综合示例为 chassis / arm / camera 等独立页
2. 更新教程中的跳转链接

BREAKING CHANGE: 原 `examples/python.md` 路径已移除。
请改用 `examples/python/` 下对应能力页。

Closes #901
```

---

## 4. 提交规范 checklist

在提交前，请对照以下清单自查：

- [ ] 提交类型（type）是否正确？
- [ ] 影响范围（scope）是否明确？
- [ ] 主题（subject）是否简洁明了？
- [ ] Body 若填写，是否为编号条目、每条精炼？
- [ ] 是否描述了为什么做这次修改，而不仅仅是做了什么？
- [ ] 是否关联了相关的 Issue 或 PR？
- [ ] 是否包含不兼容变动（Breaking Change）的说明？
- [ ] 是否已运行 `.venv/bin/mkdocs build` 且无 WARNING/ERROR？

---

## 5. 常用提交场景速查

| 场景 | 示例 |
|------|------|
| 补充连接说明 | `docs(usage): 补充连接与 wait_ready 说明` |
| 修正 API 参考 | `fix(reference): 修正 Arm.movej 参数单位` |
| 更新 README | `docs: 补充仓库维护说明` |
| 调整导航结构 | `chore(mkdocs): 调整示例页导航分组` |
| 升级构建依赖 | `chore: 升级 mkdocs-material 至 9.7.7` |
| 修改 CI 配置 | `ci: 在构建任务中增加 mkdocs build` |
| 回滚错误提交 | `revert: revert "docs(usage): 补充连接与 wait_ready 说明"` |

---

## 6. 工具推荐

- **Commitizen**：交互式命令行工具，引导填写规范的提交信息。
- **Husky + lint-staged**：在提交前自动校验提交信息格式。
- **commitlint**：使用共享配置强制校验提交信息。
- **conventional-changelog**：根据规范自动生成 CHANGELOG.md。

本仓库当前不强制安装上述工具，提交信息由作者与评审按本文自查。

---

## 7. 参考资料

- [Conventional Commits](https://www.conventionalcommits.org/)
- [Angular Commit Message Guidelines](https://github.com/angular/angular/blob/main/CONTRIBUTING.md#-commit-message-format)
