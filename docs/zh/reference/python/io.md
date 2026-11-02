---
title: IO（数字引脚）
status: draft
owner: fabot-core
updated: 2026-11-02
---

# IO（数字引脚）

## 模块概述

- 能力 id：`io`；槽位：`robot.io`
- 能力域：`io`；能力版本：`1.1.0`
- 占用、释放数字引脚并读写电平。电平为 `bool`，使用前须 `acquire`，用完后 `release`。
- 脚号由机器人接线决定，示例用 `17`。

`UNKNOWN` 不是合法命令值，传入会被拒绝。

## API 总览

| 方法 | 请求 | 响应 | 默认超时 |
|------|------|------|------|
| `acquire` | `PinClaim` | `PinApplied` | 1000 ms |
| `release` | `Pin` | `PinApplied` | 1000 ms |
| `set_level` | `PinLevel` | `PinLevelApplied` | 1000 ms |
| `get_level` | `Pin` | `PinLevelApplied` | 1000 ms |

以上均为 Command（同步请求-响应），`timeout_ms` 可逐次覆盖。

本页方法用到的枚举：

**`PinDirection` 枚举**

| 取值 | 说明 |
|------|------|
| `INPUT` | 输入 |
| `OUTPUT` | 输出 |

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。字段名用小写下划线写法（如 `frame_id`），生成类型同时接受原样的驼峰别名。

### acquire

占用引脚并设定方向。同脚同方向重复调用幂等；改方向须先 `release`。

```python
acquire(pin: int, *, direction: PinDirection, timeout_ms: int = 1000) -> PinApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号 |
| `direction` | `PinDirection` | （必填） | 引脚方向 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `PinApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `pin` | `int` | 引脚号 |

```python
from fabot.capabilities.io import PinDirection

applied = robot.io.acquire(17, direction=PinDirection.OUTPUT)
print(applied.outcome.success, applied.pin)

robot.io.set_level(17, value=True)
print(robot.io.get_level(17).value)
robot.io.release(17)
```

### release

释放已占用的引脚。未占用的脚上调用会被拒绝。

```python
release(pin: int, *, timeout_ms: int = 1000) -> PinApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `PinApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `pin` | `int` | 引脚号 |

### set_level

写数字输出电平，须先以 `OUTPUT` 占用。

```python
set_level(pin: int, *, value: bool, timeout_ms: int = 1000) -> PinLevelApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号 |
| `value` | `bool` | （必填） | 数值 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `PinLevelApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `pin` | `int` | 引脚号 |
| `value` | `bool` | 数值 |

### get_level

读取已占用引脚的当前电平（输入输出均可）。

```python
get_level(pin: int, *, timeout_ms: int = 1000) -> PinLevelApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `PinLevelApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `pin` | `int` | 引脚号 |
| `value` | `bool` | 数值 |

## 通道

本模块没有数据通道。通用机制见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.<slot>.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。

| 入口 | 事件类型 | payload |
|------|------|------|
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`：`Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot` |

## 异常

查询入口 `robot.<slot>.faults()`，返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；`0` 表示无故障 |
| `source` | `str` | 故障来源标识 |
| `state` | `int` | 故障状态位 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `timestamp_us` | `int` | 最近一次时间戳（微秒） |

展示给人看的故障文本用 `Catalogs.format_fault(record, capability_id="...")`，见 [文本目录 Catalogs](../../usage/catalogs.md)。

## 状态

本模块没有 `status()`；整机聚合状态见 `robot.status()`。

公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed` 事件，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

四个方法都是短 Command，本模块未声明独占资源。不同引脚的占用与读写互不影响；同一引脚须先 `acquire` 再读写，用完 `release`。
