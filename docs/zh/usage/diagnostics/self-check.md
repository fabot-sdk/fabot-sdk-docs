---
title: 自检（Self-check）
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 自检（Self-check）

自检把「这个槽位现在到底能不能用」变成一次可主动触发的诊断：向平台发 `fabot.runtime.self_check`，由适配器跑一遍自己的检查项，返回结构化报告。

SDK 提供两级入口：

| 入口 | 返回 | 范围 |
|------|------|------|
| `robot.<slot>.self_check(...)` | `SelfCheckReport` | 单个槽位 |
| `robot.self_check(...)` | `RobotSelfCheck` | 按规格顺序逐个自检已启用且已放置 adapter 的槽位 |

技能与服务没有槽位 Proxy，不参与自检。

## 与 `health()` 的区别

这是最容易混淆的一点：

- `health()` / `lifecycle()` / `faults()` 都是**只读查询**，读的是平台已经算好的快照，不会驱动任何检查。
- `self_check()` 会**真的执行**能力侧的检查钩子，并把结果**写入故障锁存**。也就是说它不只是观测，还可能改变后续的 `health()` / `faults()` 结果。

需要对照「故障为什么还在」时优先看 `health()` 与 `faults()`；需要「现在主动验一遍」时才用 `self_check()`。

## 槽位自检

```python
report = robot.io.self_check()
print(report.overall.name, report.type.name, report.duration_ms)

for item in report.items:
    print(item.code, item.verdict.name, item.message, item.duration_ms)
    for value in item.values:
        print("  ", value.key, value.kind.name, value.text, value.integer,
              value.number, value.boolean)
```

```python
self_check(timeout_ms: int = 0, *, timeout: float | None = None) -> SelfCheckReport
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `0` | 检查钩子的预算（毫秒）；`0` 表示用平台默认预算。负数与超过 `25000` 都抛 `ValueError` |
| `timeout` | `float \| None` | `None` | 同上，单位秒；非 `None` 时覆盖 `timeout_ms` |

两条超时参数的分工要点：`timeout_ms` 与 `timeout` 是**钩子预算**，不是整条 RPC 的总时长。RPC 会在钩子预算之上再等 5 秒，所以传 `25000` 时总等待可达 30 秒上限。

- `0`：钩子用平台默认预算，RPC 等 10 秒。
- 正值 `n`：钩子是 `n` 毫秒，RPC 等 `n + 5000` 毫秒。

`SelfCheckReport`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `domain` | `str` | 能力域 |
| `module` | `str` | 模块标识 |
| `source` | `str` | 检查来源（通常是槽位 id） |
| `type` | `SelfCheckType` | 本次检查的 BIT 类别；主动调用恒为 `Ibit` |
| `overall` | `SelfCheckVerdict` | 汇总判定 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `items` | `list[SelfCheckItem]` | 本次钩子产生的全部检查项 |
| `checked_at_us` | `int` | 检查时刻（微秒） |
| `duration_ms` | `int` | 检查耗时（毫秒） |

`SelfCheckItem`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；配合 `Catalogs` 渲染成文案 |
| `source` | `str` | 该检查项的来源 |
| `verdict` | `SelfCheckVerdict` | 单项判定 |
| `severity` | `int` | 严重度 |
| `values` | `list[SelfCheckValue]` | 检查时采集到的实测值 |
| `message` | `str` | 说明文本 |
| `duration_ms` | `int` | 该项耗时（毫秒） |

`SelfCheckValue`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `key` | `str` | 值名 |
| `kind` | `FaultValueKind` | 值类型，决定下面哪个字段有效 |
| `text` | `str` | 字符串值 |
| `integer` | `int` | 整数值 |
| `number` | `float` | 浮点值 |
| `boolean` | `bool` | 布尔值 |

按 `kind` 取值，不要同时读全部字段：

```python
for value in item.values:
    if value.kind is FaultValueKind.Int:
        print(value.key, value.integer)
    elif value.kind is FaultValueKind.String:
        print(value.key, value.text)
```

## 整机自检

```python
summary = robot.self_check()
print(summary.overall.name, summary.duration_ms)

for slot in summary.slots:
    if slot.error:
        print(slot.slot_id, "失败:", slot.error)
    else:
        print(slot.slot_id, slot.report.overall.name)
```

```python
self_check(timeout_ms: int = 0, *, timeout: float | None = None) -> RobotSelfCheck
```

参数语义与槽位级完全一致：每个槽都在同样的预算下各跑一次。

`RobotSelfCheck`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `overall` | `SelfCheckVerdict` | 汇总判定 |
| `slots` | `list[SlotSelfCheck]` | 每个参与槽位一条，按机器人规格顺序 |
| `duration_ms` | `int` | 整轮耗时（毫秒） |

`SlotSelfCheck`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `slot_id` | `str` | 槽位 id |
| `report` | `SelfCheckReport \| None` | 该槽的报告；RPC 失败时为 `None` |
| `error` | `str` | RPC 失败原因；成功时为空 |

参与范围与 `wait_ready()` 不同：`self_check` 取**已启用且已绑定 adapter** 的槽位（不要求 `essential`），而 `wait_ready()` 只等已启用、必需且已绑定的槽位。

### 汇总规则

`RobotSelfCheck.overall` 的判定：

| 情况 | `overall` |
|------|------|
| 一个槽位都没跑（没有已启用且已绑定的槽位） | `Skip` |
| 任一槽位 RPC 报错，或某槽 `report.overall` 不是 `Pass` / `Skip` | `Fail` |
| 全部槽位都是 `Pass` 或 `Skip` | `Pass` |

单个槽位失败**不会中断**后面的槽位，`slots` 仍然按规格顺序完整返回，便于一次看清所有问题。有槽位报错时整机必为 `Fail`。

## 枚举

`SelfCheckVerdict`（IntEnum）：

| 值 | 含义 |
|----|------|
| `Unknown` | 未知（未投影到结果） |
| `Pass` | 通过 |
| `Fail` | 失败 |
| `Skip` | 跳过（不适用或未执行） |

`SelfCheckType`（IntEnum）：

| 值 | 含义 |
|----|------|
| `Unknown` | 未知 |
| `Pbit` | 上电自检 |
| `Cbit` | 持续自检 |
| `Ibit` | 主动发起的自检；SDK 的 `self_check()` 恒为此值 |

`FaultValueKind`（IntEnum）：`Unknown` / `String` / `Int` / `Float` / `Bool`。

## 故障与自检的关系

- 自检项失败会被**锁存**为该槽位的故障，之后 `faults()` / `health()` 都会体现；`self_check()` 自身不负责清除。
- 槽位因自检失败停在 `Inactive` 时，多数能力命令会被拒绝；部分能力的只读命令仍可回答（例如 `robot.io.chips()`），适合在自检失败后继续排查。
- 急停或生命周期不允许执行自检时，平台仍回一份 `overall=Fail` 的报告，SDK 原样返回，不会抛异常。所以判断「能不能用」要看 `overall`，不能只看有没有抛错。

展示给人看的检查项文案用 `Catalogs`，按 `item.code` 查表，见 [文本目录 Catalogs](./catalogs.md)。

## Mock 里的自检

`Robot.mock()` 实现了自检：

- 槽位 `self_check()` 默认返回 `overall=Pass`、`type=Ibit`、`items=[]` 的空报告。
- `Robot.mock()` 里槽位默认未绑定 adapter，所以整机 `self_check()` 不跑任何槽位，返回 `overall=Skip`、`slots=[]`。
- 需要检查项内容或失败路径时，用 `MockBackend` 注入 `fabot.runtime.self_check` 的响应。注意先 `set_resolved` 该槽位，否则解析槽位句柄时会以 `NotFound`（"not stubbed"）失败：

```python
from fabot import Robot
from fabot.core import MockBackend
from fabot.core.types import ResolvedSlot
from fabot.core.detail.result import Result
from fabot.core.flatbuffer_codec import encode_flatbuffer
from fabot.core.protocol.SelfCheckResponse import SelfCheckResponseT
from fabot.core.protocol.SelfCheckType import SelfCheckType as WireType
from fabot.core.protocol.SelfCheckVerdict import SelfCheckVerdict as WireVerdict

def fail_report(_request):
    report = SelfCheckResponseT()
    report.type = int(WireType.IBIT)
    report.overall = int(WireVerdict.FAIL)
    return Result.ok(encode_flatbuffer("fabot.protocol.SelfCheckResponse", report))

backend = MockBackend()
backend.set_resolved("io", ResolvedSlot(plane_id="io", instance_id="io"))
backend.set_command_handler("io", "fabot.runtime.self_check", fail_report)

robot = Robot.from_backend(backend)
print(robot.io.self_check().overall.name)     # Fail
```

`MockBackend` 的其余注入点见 [Mock 测试](../testing/mock.md)。

## 与其他页面的关系

- 健康度、故障袋与生命周期：[状态、故障与生命周期](../data/status-faults.md)
- 槽位与整机入口的完整签名：[Robot 入口](../../reference/python/robot.md)
- 检查项文案的本地化：[文本目录 Catalogs](./catalogs.md)
- 自检失败后的排查步骤：[故障排除](../../troubleshooting.md)
