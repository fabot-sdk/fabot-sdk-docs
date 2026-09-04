---
title: 运动 Motion
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 运动 Motion

## 模块概述

- 能力 id：`motion`；槽位：`robot.motion`
- 全身运动规划与执行控制：查询整机关节角、控制运控状态机（FSM）、急停与复位。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `get_joints` | — | `list[JointPositionT]` | Command |
| `stop` | — | `OutcomeT` | Command |
| `get_fsm_state` | — | `FsmState` | Command |
| `set_fsm_state` | `state` | `FsmState` | Command |
| `reset_fsm` | — | `OutcomeT` | Command |
| `set_body_mode` | `mode` | `OutcomeT` | Command |

Command 默认 `timeout_ms`：`get_joints` / `stop` / `get_fsm_state` 为 1000，`set_fsm_state` / `set_body_mode` 为 3000，`reset_fsm` 为 30000（均可覆盖）。参数均为关键字参数。

| 通道 | 内容 |
|------|------|
| `joints()` | 整机关节位置流（`NamedJointsT`） |

## 方法

以下均为关键字参数。Command 超时见 [命令与长时操作](../../usage/commands-operations.md)，各节不重复展开。

### get_joints

读取整机当前关节角。

```python
get_joints(*, timeout_ms: int = 1000) -> list[JointPositionT]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`list[JointPositionT]`，每项：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `str` | 关节名 |
| `position` | `float` | 关节角，单位弧度 |

```python
for joint in robot.motion.get_joints():
    print(joint.name, joint.position)
```

### stop

停止当前运动。

```python
stop(*, timeout_ms: int = 1000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `success` | `bool` | 是否成功 |
| `statusMessage` | `str` | 状态说明 |

```python
outcome = robot.motion.stop()
print(outcome.success, outcome.statusMessage)
```

### get_fsm_state

查询运控状态机当前状态。

```python
get_fsm_state(*, timeout_ms: int = 1000) -> FsmState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | Command 超时（毫秒） |

**返回**

`FsmState` 枚举：`FsmState.Home` / `FsmState.Hold` / `FsmState.Ocs2` / `FsmState.MoveJ`。

```python
from fabot.capabilities.motion import FsmState

state = robot.motion.get_fsm_state()
if state == FsmState.Hold:
    print("运控处于 Hold")
```

### set_fsm_state

切换运控状态机状态，返回实际生效的状态。

```python
set_fsm_state(*, state: FsmState, timeout_ms: int = 3000) -> FsmState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `state` | `FsmState` | （必填） | 目标状态：`FsmState.Home` / `FsmState.Hold` / `FsmState.Ocs2` / `FsmState.MoveJ` |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`FsmState`：实际生效的状态。

```python
from fabot.capabilities.motion import FsmState

applied = robot.motion.set_fsm_state(state=FsmState.Hold)
print(applied)
```

### reset_fsm

复位运控状态机。该操作可能耗时较长，默认超时 30 秒。

```python
reset_fsm(*, timeout_ms: int = 30000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `30000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

```python
outcome = robot.motion.reset_fsm()
print(outcome.success, outcome.statusMessage)
```

### set_body_mode

设置整机身体约束模式。

```python
set_body_mode(*, mode: str, timeout_ms: int = 3000) -> OutcomeT
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `mode` | `str` | （必填） | 模式名（大小写敏感）：`BODY_FREE` / `BODY_RELATIVE` / `BODY_TRACKING` / `BODY_LOCK` / `BODY_HEAD_COUPLED` / `BODY_CUSTOM_LOCK` / `BODY_UNLOCK`；`BODY_VERTICAL` 是 `BODY_RELATIVE` 的旧别名 |
| `timeout_ms` | `int` | `3000` | Command 超时（毫秒） |

**返回**

`OutcomeT`：`success` / `statusMessage`。

```python
outcome = robot.motion.set_body_mode(mode="BODY_RELATIVE")
print(outcome.success, outcome.statusMessage)
```

## 通道

打开参数与帧约定如下；通用用法见 [事件与数据通道](../../usage/events-channels.md)。

### joints()

订阅整机关节位置流。

```python
joints(qos_profile: str = "latest") -> JointsChannel
```

**打开参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**帧**（`JointsChannelFrame`）

| 字段 | 类型 | 说明 |
|------|------|------|
| `channel_id` | `str` | 通道 id |
| `sequence` | `int` | 帧序号 |
| `timestamp_us` | `int` | 时间戳（微秒） |
| `payload` | `NamedJointsT` | `payload.positions`：`list[JointPositionT]`，每项 `name`（关节名）/ `position`（弧度） |

用 `frames(poll_timeout_ms=..., timeout_ms=...)` 迭代帧。

```python
ch = robot.motion.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    for joint in frame.payload.positions:
        print(frame.sequence, joint.name, joint.position)
```

## 事件

经 `robot.motion.events` 订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API，见 [事件与数据通道](../../usage/events-channels.md)。

事件均带 `EventHeader`：`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`。

### fault_changed

该槽位故障集合变化时推送。

订阅：`robot.motion.events.fault_changed.subscribe(callback)`。

**payload**

`FaultChangedEvent.faults`：`Faults`。当前 `Faults` 只有 `revision`，本模块尚无已命名故障，见 [异常](#_5)。

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.motion.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

该槽位生命周期或健康度变化时推送。

订阅：`robot.motion.events.lifecycle_changed.subscribe(callback)`。

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

token = robot.motion.events.lifecycle_changed.subscribe(on_lifecycle)
```

## 异常

查询入口：`robot.motion.faults()`，返回 `Faults`。

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

`set_fsm_state` 与 `reset_fsm` 占用整机运动控制资源：其中一个执行期间，对同一资源的另一个调用会被直接拒绝而不是排队。`get_joints` / `stop` / `get_fsm_state` / `set_body_mode` 不占用该资源，可随时调用。
