---
title: IO（数字/模拟输入输出）
status: draft
owner: fabot-core
updated: 2026-09-03
---

# IO（数字/模拟输入输出）

## 模块概述

- 能力 id：`io`；槽位：`robot.io`
- 读写机器人上的数字 / 模拟 IO 通道，并订阅数字通道的电平变化流。数字电平为 `bool`；模拟电平为 `float`，模拟输出值归一化到 `[0.0, 1.0]`。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `set_digital_input` | `channel`, `value` | `DigitalLevelAppliedT` | Command |
| `get_digital_input` | `channel` | `DigitalLevelAppliedT` | Command |
| `set_digital_output` | `channel`, `value` | `DigitalLevelAppliedT` | Command |
| `get_digital_output` | `channel` | `DigitalLevelAppliedT` | Command |
| `set_analog_input` | `channel`, `value` | `AnalogLevelAppliedT` | Command |
| `get_analog_input` | `channel` | `AnalogLevelAppliedT` | Command |
| `set_analog_output` | `channel`, `value` | `AnalogLevelAppliedT` | Command |
| `get_analog_output` | `channel` | `AnalogLevelAppliedT` | Command |

Command 默认 `timeout_ms` 均为 1000（均可覆盖）。参数均为关键字参数。本模块没有 Operation。

| 通道 | 内容 |
|------|------|
| `digital_events()` | 数字通道电平变化流（`DigitalEventT`） |

## 方法

以下均为关键字参数。Command 超时见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### set_digital_input

写入数字输入通道电平（用于仿真注入等场景）。

```python
set_digital_input(*, channel: str, value: bool, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `value` | `bool` | （必填） | 目标电平 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`DigitalLevelAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `channel` | `str` | 通道名 |
| `value` | `bool` | 实际生效的电平 |

```python
applied = robot.io.set_digital_input(channel="di_1", value=True)
print(applied.outcome.success, applied.channel, applied.value)
```

### get_digital_input

读取数字输入通道当前电平。

```python
get_digital_input(*, channel: str, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`DigitalLevelAppliedT`：字段同 `set_digital_input`，`value` 为读到的当前电平。

```python
level = robot.io.get_digital_input(channel="di_1")
print(level.value)
```

### set_digital_output

写入数字输出通道电平。

```python
set_digital_output(*, channel: str, value: bool, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `value` | `bool` | （必填） | 目标电平 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`DigitalLevelAppliedT`：字段同 `set_digital_input`。

```python
applied = robot.io.set_digital_output(channel="relay1", value=True)
print(applied.outcome.success, applied.outcome.statusMessage)
```

### get_digital_output

读取数字输出通道当前电平。

```python
get_digital_output(*, channel: str, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`DigitalLevelAppliedT`：字段同 `set_digital_input`，`value` 为读到的当前电平。

```python
level = robot.io.get_digital_output(channel="relay1")
print(level.value)
```

### set_analog_input

写入模拟输入通道电平（用于仿真注入等场景）。

```python
set_analog_input(*, channel: str, value: float, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `value` | `float` | （必填） | 目标电平 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`AnalogLevelAppliedT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `channel` | `str` | 通道名 |
| `value` | `float` | 实际生效的电平 |

```python
applied = robot.io.set_analog_input(channel="ai_1", value=0.5)
print(applied.outcome.success, applied.channel, applied.value)
```

### get_analog_input

读取模拟输入通道当前电平。

```python
get_analog_input(*, channel: str, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`AnalogLevelAppliedT`：字段同 `set_analog_input`，`value` 为读到的当前电平。

```python
level = robot.io.get_analog_input(channel="ai_1")
print(level.value)
```

### set_analog_output

写入模拟输出通道电平，输出值归一化到 `[0.0, 1.0]`。

```python
set_analog_output(*, channel: str, value: float, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `value` | `float` | （必填） | 目标电平，范围 `[0.0, 1.0]` |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`AnalogLevelAppliedT`：字段同 `set_analog_input`。

```python
applied = robot.io.set_analog_output(channel="ao_1", value=0.8)
print(applied.outcome.success, applied.outcome.statusMessage)
```

### get_analog_output

读取模拟输出通道当前电平。

```python
get_analog_output(*, channel: str, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `channel` | `str` | （必填） | 通道名 |
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`AnalogLevelAppliedT`：字段同 `set_analog_input`，`value` 为读到的当前电平。

```python
level = robot.io.get_analog_output(channel="ao_1")
print(level.value)
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### digital_events()

订阅数字通道电平变化流。

```python
digital_events(qos_profile: str = "latest") -> DigitalEventsChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`DigitalEventsChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `DigitalEventT` | 见下表 |

`payload`（`DigitalEventT`）字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel` | `str` | 通道名 |
| `value` | `bool` | 变化后的电平 |
| `edge` | `DigitalEdge` | 边沿类型 |
| `timestampNs` | `int` | 边沿时间戳（纳秒） |

`DigitalEdge` 取值：`UNKNOWN`（0，边沿无法判定，例如首个样本没有历史电平）、`RISING`（1，上升沿）、`FALLING`（2，下降沿）。

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
from fabot.capabilities.io import DigitalEdge

ch = robot.io.digital_events(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    p = frame.payload
    if p.edge == DigitalEdge.RISING:
        print(p.channel, "rising ->", p.value)
```

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

本模块未声明独占资源：所有方法均为短耗时 Command，无排队或互斥约束，不同通道的读写互不影响。
