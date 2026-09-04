# Git 分支管理规范

## 1 总述

### 1.1 设计目标

本规范采用以 **main**、**develop** 为核心、以 **`v*` 版本分支** 发布历史文档的轻量化分支模型，目标是：

- 保持提交历史清晰、可追踪；
- 避免共享分支历史被重写；
- 减少无意义的长期分支；
- 明确内容只能按照规定方向流动；
- 支持小型团队直接在 develop 上协作；
- 用独立分支冻结已发布文档版本，与当前默认版并存；
- 在需要时提供功能隔离、发布稳定和线上修复能力。

### 1.2 分支模型总览

整个模型由 **常驻分支（main / develop / `v*`）** 和 **3 类临时分支** 构成，内容沿固定方向单向流动：

```text
feature/* ──merge──► develop ──merge──► release/* ──merge──► main
                         ▲                    │               │
                         │                    └──merge────────┤
hotfix/* ──merge──► main │                                    ├──branch──► v0.1 / v0.2 / …
    └──merge─────────────┘                                    │
                                                              ▼
                                                     当前默认版（Pages /）
                                                     历史版（Pages /v0.1/ 等）
```

一次完整的功能开发 → 发布 → 冻结历史版 → 热修复周期：在 develop 上集成功能（或经 `feature/*`），需要时切 `release/*` 稳定后合入 main；需要保留上一 SDK 版本文档时，从 main 切出 `v*` 并推送到 GitHub；当前默认版线上问题从 main 切 `hotfix/*`，分别合回 main 与 develop；历史版勘误只合回对应的 `v*`。

### 1.3 核心原则速览

| 原则 | 一句话说明 |
|------|------------|
| 双核心分支 | main 保存当前默认发布状态，develop 保存下一版本集成状态 |
| 版本分支冻结 | `v*` 从 main 切出后只维护该历史版，不与 main 互相 merge |
| 单向流动 | merge 只能按规定方向执行，禁止反向 merge 同步内容 |
| 同步用 rebase | 本地未推送提交与远端同名分支同步时，一律使用 rebase |
| 集成用 merge | 不同职责分支之间的正式集成统一使用 merge |
| 共享历史不重写 | 已推送到共享分支的提交禁止 rebase / amend / force push |
| 错误用 revert | 共享历史出错时使用 revert 撤销，不得删除或重写 |
| 临时分支短生命周期 | feature / release / hotfix 合并完成后及时删除 |
| 集成保留边界 | 临时分支合并默认使用 `--no-ff`，保留任务边界 |

### 1.4 过渡说明

远端若尚未创建 `develop`，可先从 `main` 创建并推送：

```bash
git switch main
git pull --rebase
git switch -c develop
git push -u origin develop
```

在 `origin/develop` 存在之前，单个提交、低风险、能够立即完成并验证的修改可以继续直接提交到 `main`。`develop` 启用后，日常开发合入 develop，发布合入 main；不再把日常改动直接推到 `main`。

---

## 2 分支体系

### 2.1 常驻分支

#### main —— 当前默认发布分支

代表当前默认线上文档（GitHub Pages 站点根路径 `/`，即「最新」）。

**要求：**

- 必须保持稳定，内容对应当前推荐使用的 SDK 版本；
- 不允许直接进行日常功能开发（`develop` 启用后）；
- 不允许直接推送未经评审或未经验证的提交；
- 原则上只接收来自 release、hotfix 或特定发布流程的合并；
- 推送到 GitHub `main` 后由 Actions 重建全部版本并部署；
- 需要冻结当前默认版为历史文档时，从 main 切出 `v*`（见 2.3），不要用标签代替版本分支。

#### develop —— 集成分支

代表下一版本的集成开发状态。

**要求：**

- 日常开发成果最终集成到 develop；
- 可以包含尚未正式发布的内容；
- 推送前应运行 `npm run build`，确认无 ERROR；
- 不允许通过 force push 重写历史；
- 多人直接在 develop 上开发时，每次推送前必须先同步远端提交。

### 2.2 临时分支

#### feature/\* —— 功能分支

用于隔离新章节、较大重构或风险较高的修改。

| 项目 | 内容 |
|------|------|
| 创建来源 | `develop` |
| 合并目标 | `feature/* → develop` |
| 命名示例 | `feature/123-usage-connection`、`feature/arm-reference`、`feature/refactor-nav` |

**适用场景：**

- 修改需要多个提交；
- 开发周期超过一天；
- 修改尚未完成，但需要推送远端备份；
- 修改可能导致 develop 暂时无法通过 `npm run build`；
- 需要独立 Code Review；
- 多个功能需要并行开发。

**feature 分支不是强制创建的。** 对于单个提交、低风险、能够立即完成并验证的修改，可以直接提交到 develop。但以下情况**不建议省略** feature 分支：

- 修改涉及站点信息架构或导航；
- 修改影响多个目录（如 `usage/` 与 `reference/` 同时改）；
- 修改暂时无法通过 `npm run build`；
- 多人可能同时修改相同页面；
- 修改需要持续评审或反复调整。

#### release/\* —— 发布分支

用于发布前的版本稳定、缺陷修复和版本信息调整。

| 项目 | 内容 |
|------|------|
| 创建来源 | `develop` |
| 合并目标 | `release/* → main`，同时 `release/* → develop` |
| 命名示例 | `release/1.5.0`、`release/2.0.0-beta.1` |

**允许进行的修改：**

- 修复发布阻塞缺陷；
- 调整版本号或站点元数据；
- 修改发布配置；
- 更新发布说明；
- 完成站点构建与链接校验。

**不允许进行的修改：**

- 添加与当前版本无关的新章节；
- 进行大规模重构；
- 引入未经验证的新依赖；
- 修改当前发布范围。

**发布完成后：**

1. 若需保留发布前的默认版文档，先按 6.6 从 main 切出 `v*` 并推送到 GitHub；
2. 将 `release/*` 合并到 main；
3. 将同一 `release/*` 合并回 develop，带回发布阶段产生的修复；
4. 删除 `release/*`。

**release 分支不是强制创建的。** 满足以下条件时，可以直接将 develop 发布到 main：

- 团队规模较小；
- 发布稳定期很短；
- 发布期间不需要继续开发下一版本；
- develop 始终保持可发布状态；
- 不需要单独维护发布候选版本。

省略 release 时，发布方向为 `develop → main`。

#### hotfix/\* —— 热修复分支

用于修复已经发布到 main 的严重线上问题。

| 项目 | 内容 |
|------|------|
| 创建来源 | `main` |
| 合并目标 | `hotfix/* → main`，同时 `hotfix/* → develop` |
| 命名示例 | `hotfix/1.5.1-wrong-api-unit`、`hotfix/456-broken-nav` |

**标准流程：**

1. 从 main 创建 `hotfix/*`；
2. 完成最小范围的修复；
3. 运行 `npm run build` 并做针对性核对；
4. 将 `hotfix/*` 合并到 main；
5. 将同一 `hotfix/*` 合并到 develop（若该修复也适用于下一版本）；
6. 删除 `hotfix/*`。

历史版线上问题不要从 main 开 hotfix，应在对应 `v*` 上修复（见 2.3、6.7）。

> 当前默认版的线上问题不建议直接在 main 上修改。即使修复只有一个提交，也建议创建 hotfix 分支，以保证修复过程可评审、可验证和可追踪。

### 2.3 `v*` —— 历史文档版本分支

用于冻结某一 SDK 版本对应的已发布文档，与 main 上的「最新」并存。`develop`、`feature/*`、`release/*` 不是版本分支，不会出现在站点顶栏。

| 分支 | 站点路径（相对 Pages 根） | 顶栏显示 |
|------|---------------------------|----------|
| `main` | `/` | 最新 / Latest |
| `v0.1` | `/v0.1/` | `v0.1` |
| `v0.2` | `/v0.2/` | `v0.2` |

| 项目 | 内容 |
|------|------|
| 创建来源 | `main`（须已包含版本切换器） |
| 合并目标 | 只合回自身；**禁止** `v* → main`、**禁止** `main → v*` |
| 命名 | `v` + 版本号，如 `v0.1`、`v0.2`（须匹配 `v*`，CI 才会收录） |
| 生命周期 | 长期保留，发布后不删除 |

**要求：**

- 从当前 main 切出：`git branch v0.1` 后 `git push github v0.1`（Pages 使用 GitHub 远程；内网 `origin` 可按需同步）；
- 切出后视为该版本的冻结线：只接受该版本的勘误与必要补丁，不接纳下一版本内容；
- 推送 `main` 或任意 `v*` 时，Actions 会重建**全部**版本再部署；
- 未推送到 GitHub 的 `v*` 不会出现在站点顶栏；
- 属于共享分支，禁止 rebase / amend / force push；
- 修改后运行 `npm run build`，确认无 ERROR。

**不允许：**

- 把 develop / main 的新版本文档 merge 进 `v*`；
- 把 `v*` merge 回 main 或 develop（会用旧文档覆盖当前默认版）；
- 用 `release/*` 或 annotated tag 代替 `v*` 分支来发布历史文档。

---

## 3 分支流向

### 3.1 标准流向

| 流向 | 说明 |
|------|------|
| `feature/* → develop` | 功能集成 |
| `develop → release/*`（创建）→ `main` / `develop` | 发布稳定 |
| `develop → main` | 省略 release 时的直接发布 |
| `main → hotfix/*`（创建）→ `main` / `develop` | 当前默认版热修复 |
| `main → v*`（创建） | 冻结历史文档版本 |
| `v*` 上的勘误只提交或合回该 `v*` | 历史版维护 |

### 3.2 禁止的反向合并

**禁止**以下反向合并：

```text
develop → feature/*
main    → hotfix/*
main    → release/*
main    → v*          （创建之后的持续 merge）
v*      → main
v*      → develop
```

**也不建议**通过 `main → develop` 的方式同步修复：

- 线上修复应由**同一个 hotfix 分支**分别合并到 main 和 develop，而不是先合并到 main，再将整个 main 合并到 develop；
- 发布阶段产生的修复应由**同一个 release 分支**分别合并到 main 和 develop。

这样可以避免 main 和 develop 之间反复双向合并。

> 说明：从 develop 创建 release、从 main 创建 hotfix 或 `v*` 属于**创建分支**，不属于反向 merge。创建 `v*` 之后不得再把 main merge 进去。

---

## 4 Rebase 原则

### 4.1 同一分支的本地与远端同步

开发者同步远端同名分支时，使用 rebase：

```bash
git fetch origin
git rebase origin/develop
```

或者：

```bash
git pull --rebase
```

其含义是：**远端已有提交在前，将本地尚未推送的提交重新排列到远端最新提交之后**。

> 此操作只允许重写**本地尚未推送**的提交。

### 4.2 私有临时分支更新基线

个人独占、尚未被其他人依赖的 feature 分支，可以 rebase 到最新 develop：

```bash
git fetch origin
git switch feature/xxx
git rebase origin/develop
```

这样可以避免为了同步 develop 而进行反向 merge：

| 做法 | 结论 |
|------|------|
| `develop → feature` 反向 merge | 禁止 |
| `feature rebase onto develop` | 推荐 |

> 这里的 rebase 是**更新开发基线**，不是正式集成。正式将功能纳入 develop 时仍然使用 merge。

### 4.3 共享分支禁止重写

以下分支属于**共享分支**：

- `main`
- `develop`
- 已推送的 `v*` 历史版本分支
- 多人共同使用的 `feature/*`
- 多人共同使用的 `release/*`
- 多人共同使用的 `hotfix/*`

一旦提交已经推送到共享分支，**禁止**：

```bash
git rebase
git reset --hard
git commit --amend
git push --force
git push -f
```

需要撤销共享提交时，应使用：

```bash
git revert <commit>
```

而不是删除或重写原提交。

### 4.4 私有远端分支的例外

由单个开发者独占、没有其他人基于它继续开发的私有 feature 分支，可以进行 rebase。确实需要更新远端历史时，**只允许**：

```bash
git push --force-with-lease
```

**禁止**使用 `git push --force`。

当分支已经进入多人协作、被他人检出、被其他分支依赖或进入正式评审后，应将其视为共享分支，不再重写历史。

### 4.5 Rebase 规则小结

| 场景 | 是否允许 rebase |
|------|-----------------|
| 本地未推送提交同步远端同名分支 | 允许（推荐） |
| 私有 feature 更新到最新 develop | 允许（推荐） |
| 私有远端 feature 更新历史 | 仅允许 `--force-with-lease` |
| 共享分支（含已推送历史） | 禁止 |

---

## 5 Merge 原则

### 5.1 正式集成统一使用 merge

不同职责分支之间正式传递内容时，统一使用 merge，例如：

- `feature → develop`
- `release → main`、`release → develop`
- `hotfix → main`、`hotfix → develop`

不使用 rebase 将一个共享分支直接移动到另一个共享分支之上。

### 5.2 Merge 只能按照规定方向执行

「merge 只能单方向」指：对于一组具有明确上下游关系的分支，只允许内容按照预定集成方向流动，不允许为了同步方便而反向合并。

| 方向 | 结论 |
|------|------|
| `feature → develop` | 允许 |
| `develop → feature` | 禁止 |
| `hotfix → main` | 允许 |
| `hotfix → develop` | 允许 |
| `main → hotfix` | 禁止 |
| `develop → hotfix` | 禁止 |
| `release → main` | 允许 |
| `release → develop` | 允许 |
| `main → release` | 禁止 |
| `develop → release` | 禁止 |
| `main → v*`（创建） | 允许 |
| `main → v*`（之后 merge） | 禁止 |
| `v* → main` / `v* → develop` | 禁止 |
| `develop → v*` | 禁止 |

### 5.3 `--no-ff` 使用规则

建议在临时分支正式合并时使用：

```bash
git merge --no-ff <branch>
```

**适用范围：**

- `feature/* → develop`
- `release/* → main`、`release/* → develop`
- `hotfix/* → main`、`hotfix/* → develop`

**示例：**

```bash
git switch develop
git merge --no-ff feature/usage-connection
```

**使用 `--no-ff` 的目的：**

- 保留一次功能、发布或修复的边界；
- 可以明确看到分支何时被集成；
- 便于整体 revert；
- 便于关联 Issue、PR 和测试记录；
- 避免多个独立任务的提交混合成一条无法区分的直线。

> 对于直接提交到 develop 的微小修改，不产生 merge commit。

---

## 6 典型工作流

### 6.1 直接在 develop 上完成小修改

适用于：修改范围小、可以在较短时间内完成、不会破坏 `npm run build`、不需要多人并行修改、不需要独立评审周期。

```bash
# 同步远端
git switch develop
git fetch origin
git rebase origin/develop

# 修改并提交
git add .
git commit -m "fix(reference): 修正 Arm.movej 参数单位"

# 推送前再次同步
git fetch origin
git rebase origin/develop
git push origin develop
```

如果 rebase 后远端再次出现新提交，重新执行 `fetch + rebase + push`。**禁止通过 force push 覆盖其他人的提交。**

### 6.2 使用 feature 分支开发

```bash
# 创建功能分支
git switch develop
git fetch origin
git rebase origin/develop
git switch -c feature/usage-connection

# 开发过程中
git add .
git commit -m "docs(usage): 补充连接与 wait_ready 说明"

# 合并前，个人独占分支可以更新基线
git fetch origin
git rebase origin/develop

# 完成验证后正式集成
git switch develop
git fetch origin
git rebase origin/develop
git merge --no-ff feature/usage-connection
git push origin develop

# 删除分支
git branch -d feature/usage-connection
git push origin --delete feature/usage-connection
```

### 6.3 使用 release 分支发布

```bash
# 创建发布分支
git switch develop
git fetch origin
git rebase origin/develop
git switch -c release/1.5.0

# 发布阶段只提交修复和发布相关调整
git commit -m "fix(reference): 修正发布说明中的接口拼写"
git commit -m "chore: 将站点版本调整为 1.5.0"

# 如需冻结当前线上文档为历史版，先执行 6.6，再合并
git switch main
git fetch origin
git rebase origin/main
git merge --no-ff release/1.5.0
git push origin main
git push github main

# 将发布修复同步回 develop
git switch develop
git fetch origin
git rebase origin/develop
git merge --no-ff release/1.5.0
git push origin develop

# 删除分支
git branch -d release/1.5.0
git push origin --delete release/1.5.0
```

### 6.4 不创建 release 分支直接发布

适用于 develop 已经完成冻结和验证的情况：

```bash
# 如需冻结当前线上文档为历史版，先执行 6.6，再合并
git switch main
git fetch origin
git rebase origin/main
git merge --no-ff develop
git push origin main
git push github main
```

> 此流程应被视为一次**正式发布操作**，而不是日常同步。推送到 GitHub `main` 后，Actions 会重建全部版本再部署。

### 6.5 使用 hotfix 分支修复线上问题

```bash
# 从 main 创建修复分支
git switch main
git fetch origin
git rebase origin/main
git switch -c hotfix/1.5.1-wrong-api-unit

# 完成修复
git commit -m "fix(reference): 修正 Arm.movej 参数单位"

# 合并到 main
git switch main
git fetch origin
git rebase origin/main
git merge --no-ff hotfix/1.5.1-wrong-api-unit
git push origin main
git push github main

# 将同一个修复分支合并到 develop
git switch develop
git fetch origin
git rebase origin/develop
git merge --no-ff hotfix/1.5.1-wrong-api-unit
git push origin develop

# 删除分支
git branch -d hotfix/1.5.1-wrong-api-unit
git push origin --delete hotfix/1.5.1-wrong-api-unit
```

### 6.6 从 main 冻结历史文档版本

适用于：main 即将开始下一 SDK 版本的文档，或需要把当前线上内容固定为可切换的历史版。须在**已包含版本切换器**的 main 上操作。

```bash
git switch main
git fetch origin
git rebase origin/main
git branch v0.1
git push github v0.1
# 内网仓库如需备份：
# git push origin v0.1
```

**完成后：**

- GitHub Pages 将 `v0.1` 发布到 `/v0.1/`，`main` 仍为「最新」（`/`）；
- 此后 main 继续接收下一版本内容；
- 不要再把 main merge 进 `v0.1`。

### 6.7 在历史版本分支上勘误

适用于：只修正某一已冻结版本的文档，不影响当前默认版。

```bash
git fetch github
git switch v0.1
git pull --rebase github v0.1
# 仅修改该版本文档
git commit -m "fix(reference): 修正 0.1 文档中的接口拼写"
npm run build
git push github v0.1
```

`pull --rebase` 只用于同步**本地尚未推送**的提交。已推送到 GitHub 的 `v*` 禁止 rebase / force push。

不要把该提交 cherry-pick 或 merge 到 main，除非同一错误也存在于当前默认版（那时应在 main / hotfix 上单独修）。

---

## 7 冲突处理原则

合并或 rebase 发生冲突时：

1. 由产生修改的一方负责解决冲突；
2. 解决冲突后必须重新运行 `npm run build`，确认无 ERROR；
3. 不允许只以「能够完成 merge」为目标机械处理冲突；
4. 涉及语义变化时，必须由相关页面负责人确认；
5. 共享分支发生错误合并时使用 revert，不重写历史。

**个人分支 rebase 冲突处理：**

```bash
git add <resolved-files>
git rebase --continue
```

**放弃本次 rebase：**

```bash
git rebase --abort
```

**共享分支错误提交撤销：**

```bash
git revert <commit>
```

**错误 merge 撤销：**

```bash
git revert -m 1 <merge-commit>
```
