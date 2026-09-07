---
title: IO（数字引脚）
status: draft
owner: fabot-core
updated: 2026-09-07
---

# IO（数字引脚）

## 模块概述

- 能力 id：`io`；槽位：`robot.io`
- 占用、释放数字引脚，并读写电平。电平为 `bool`。使用前须 `acquire`，用完后 `release`。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `acquire` | `pin`, `direction` | `PinAppliedT` | Command |
| `release` | `pin` | `PinAppliedT` | Command |
| `set_level` | `pin`, `value` | `PinLevelAppliedT` | Command |
| `get_level` | `pin` | `PinLevelAppliedT` | Command |

Command 默认 `timeout_ms` 均为 1000（均可覆盖）。参数均为关键字参数。本模块没有 Operation，也没有数据通道。

`PinDirection` 枚举：

| 取值 | 说明 |
|------|------|
| `INPUT` | 输入 |
| `OUTPUT` | 输出 |

`UNKNOWN` 不是合法命令值，传入会被拒绝。脚号由机器人接线决定，以下示例用 `17`。

## 方法

以下均为关键字参数。Command 超时见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### acquire

占用指定引脚并设定方向。同脚同方向再次 `acquire` 会成功（幂等）；同脚要改方向须先 `release`。

```python
acquire(*, pin: int, direction: PinDirection, timeout_ms: int = 1000) -> PinAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号，须 ≥ 0 |
| `direction` | `PinDirection` | （必填） | `INPUT` / `OUTPUT` |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`PinAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `pin` | `int` | 回显的引脚号 |

```python
from fabot.capabilities.io import PinDirection

applied = robot.io.acquire(pin=17, direction=PinDirection.OUTPUT)
print(applied.outcome.success, applied.pin)
```

### release

释放已占用的引脚。未占用的脚上调用会被拒绝。

```python
release(*, pin: int, timeout_ms: int = 1000) -> PinAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号，须 ≥ 0 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`PinAppliedT`：字段同 `acquire`。

```python
applied = robot.io.release(pin=17)
print(applied.outcome.success, applied.pin)
```

### set_level

写数字输出电平。须先以 `OUTPUT` 占用该脚。

```python
set_level(*, pin: int, value: bool, timeout_ms: int = 1000) -> PinLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号，须 ≥ 0 |
| `value` | `bool` | （必填） | 目标电平 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`PinLevelAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `pin` | `int` | 回显的引脚号 |
| `value` | `bool` | 实际生效的电平 |

```python
applied = robot.io.set_level(pin=17, value=True)
print(applied.outcome.success, applied.pin, applied.value)
```

### get_level

读已占用引脚的当前电平（`INPUT` / `OUTPUT` 均可）。未占用的脚上调用会被拒绝。

```python
get_level(*, pin: int, timeout_ms: int = 1000) -> PinLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pin` | `int` | （必填） | 引脚号，须 ≥ 0 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`PinLevelAppliedT`：字段同 `set_level`，`value` 为读到的当前电平。

```python
from fabot.capabilities.io import PinDirection

robot.io.acquire(pin=17, direction=PinDirection.OUTPUT)
robot.io.set_level(pin=17, value=True)
level = robot.io.get_level(pin=17)
print(level.value)
robot.io.release(pin=17)
```

## 通道

本模块没有数据通道。通用通道用法见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.io.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.io.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.io.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.io.events.lifecycle_changed.subscribe(callback)`。

**payload**

`LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `lifecycle` | `LifecycleState` | 生命周期阶段 |
| `health` | `HealthState` | 健康度 |
| `source_instance_id` | `str` | 来源实例 id |

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health)

token = robot.io.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.io.faults()`，返回 `Faults`。

本模块尚无已命名故障：当前 `Faults` 只有 `revision`。变化通过 `fault_changed` 推送。通用约定见 [状态、故障与生命周期](../../usage/status-faults.md)。

若日后出现已命名故障，每条为 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `active` | `bool` | 是否仍在生效 |
| `catalog_id` | `str` | 目录 id |
| `fault_class` | `CapabilityStateClass` | 故障等级 |
| `first_seen_us` / `last_seen_us` | `int` | 首次 / 最近见到的时间戳（微秒） |
| `count` | `int` | 累计次数 |

## 状态

本模块没有 `status()`；整机聚合状态见 `robot.status()`。

公共查询：

- `health()`：当前健康度
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`）

变化走 `lifecycle_changed`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

四个方法均为短耗时 Command，本模块未声明独占资源：命令之间没有排队或互斥约束。不同引脚的占用与读写互不影响；同一引脚须先 `acquire` 再读写，用完 `release`。
