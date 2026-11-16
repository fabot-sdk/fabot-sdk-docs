---
title: 升降柱 Lift
status: draft
owner: fabot-core
updated: 2026-11-16
---

# 升降柱 Lift

## 模块概述

- 能力 id：`lift`；槽位：`robot.lift`
- 能力域：`lift`
- 升降柱高度控制：读高度 / 使能 / 速度与加速度上限，绝对与相对高度运动、回零、把当前位置设为零点。
- `status()` 给出当前高度、速度、使能、回零与运动状态。

高度单位为米，速度米/秒，加速度米/秒²。写命令（运动与伺服）共用资源 `lift`，策略 `queue`。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `get_height` | Command | 读取当前高度状态（`LiftState`）；默认超时 1000 ms。 |
| `get_enable` / `set_enable` | Command | 读 / 写使能；写默认超时 3000 ms。 |
| `get_velocity_limit` / `set_velocity_limit` | Command | 读 / 写速度上限（米/秒）。 |
| `get_acceleration_limit` / `set_acceleration_limit` | Command | 读 / 写加速度上限（米/秒²）。 |
| `servo_height` | Command | 短周期高度伺服；默认超时 1000 ms。 |
| `stop` | Command | 停止当前运动；默认超时 2000 ms。 |
| `set_height_zero` | Command | 把当前位置设为零点；默认超时 2000 ms。 |
| `move_height` | Operation | 绝对高度运动。 |
| `move_height_relative` | Operation | 相对高度运动。 |
| `move_home` | Operation | 回零运动。 |
| `height` | Channel | 高度状态流，帧为 `LiftState`。 |
| `lift_state_changed` | Event | 升降柱状态事件，payload 为 `LiftEvent`（`kind` / `height` / `enabled` / `homed` / `message`）。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

## 方法

参数名与默认值以本节签名块为准；未标 `*` 的参数可按位置或关键字传入，`*` 之后的只能按关键字传入。

### get_height

读取当前高度状态。

```python
get_height(*, timeout_ms: int = 1000) -> LiftState
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LiftState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `height` | `float` | 当前高度，米 |
| `velocity` | `float` | 当前速度，米/秒 |
| `enabled` | `bool` | 是否已使能 |
| `homed` | `bool` | 是否已完成回零 |
| `moving` | `bool` | 是否正在运动 |
| `fault_code` | `int` | 当前故障诊断码；`0` 表示无故障 |
| `stamp_ns` | `int` | 采样时刻（纳秒） |

### get_enable / set_enable

读取或设置使能。未使能时运动命令会被拒绝。

```python
get_enable(*, timeout_ms: int = 1000) -> bool
set_enable(enabled: bool, *, timeout_ms: int = 3000) -> bool
```

**参数**（`set_enable`）

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `enabled` | `bool` | （必填） | 目标使能状态 |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

### 速度与加速度上限

```python
get_velocity_limit(*, timeout_ms: int = 1000) -> float
set_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
get_acceleration_limit(*, timeout_ms: int = 1000) -> float
set_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

上限是持久设置，写入后在后续运动命令中生效，直到下一次修改。返回值是写入后实际生效的上限。

### servo_height

短周期高度伺服：按固定周期连续下发高度目标，用于跟随。

```python
servo_height(value: float, *, timeout_ms: int = 1000) -> float
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `value` | `float` | （必填） | 目标高度，米 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

:::warning 伺服目标不会自己失效
`servo_height()` 只下发一次目标，不建立持续会话。停止跟随必须显式调用 `stop()`；不要依赖断开连接来让升降柱停下，见 [伺服与安全](../../usage/concurrency-and-safety.md)。
:::

### stop

停止当前运动，返回执行结果。

```python
stop(*, timeout_ms: int = 2000) -> Outcome
```

### set_height_zero

把当前位置设为零点，返回执行结果。属于标定操作，会让既有高度读数整体平移。

```python
set_height_zero(*, timeout_ms: int = 2000) -> Outcome
```

### move_height

绝对高度运动。

```python
move_height(target: float, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveHeightOperation
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `float` | （必填） | 目标高度，米 |
| `tolerance` | `float` | `0.0` | 到位容差（米）；`0` 表示沿用控制器缺省 |
| `duration` | `float` | `0.0` | 期望运动时长（秒）；`0` 表示沿用控制器缺省 |
| `wait_timeout` | `float` | `0.0` | 在运动时长之外额外等待到位的上限；`0` 表示沿用缺省策略 |

### move_height_relative

相对当前高度的增量运动。

```python
move_height_relative(target: float, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveHeightRelativeOperation
```

`target` 为增量，向上为正、向下为负。

### move_home

回零运动。成功后 `LiftState.homed` 为 `True`。

```python
move_home(*, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveHomeOperation
```

```python
from fabot.core import OperationState

if robot.lift.has_adapter:
    robot.lift.set_enable(True)
    if not robot.lift.get_height().homed:
        robot.lift.move_home().wait(timeout=30.0)
    op = robot.lift.move_height(0.35, tolerance=0.005)
    snap = op.get(timeout=15.0)
    print(snap.state, snap.result)
```

## 通道

### height

高度状态流，帧为 `LiftState`（字段见 `get_height`）。

```python
ch = robot.lift.height(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.height, frame.payload.moving)
finally:
    ch.close()
```

通用约定（帧字段、`qos_profile`、租约与 `next()`）见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.lift.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`。

| 入口 | 事件类型 | payload |
|------|------|------|
| `robot.lift.events.lift_state_changed` | `LiftStateChangedEvent` | `lift_state`：`LiftEvent`（`slot` / `kind` / `height` / `enabled` / `homed` / `message`） |
| `robot.lift.events.fault_changed` | `FaultChangedEvent` | `faults`：`Faults` |
| `robot.lift.events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`：`CapabilityLifecycleSnapshot` |

```python
def on_lift(event):
    print(event.header.timestamp_us, event.lift_state.kind, event.lift_state.height)

token = robot.lift.events.lift_state_changed.subscribe(on_lift)
# ...
token.close()
```

## 异常

查询入口 `robot.lift.faults()`，返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState` 为 `code` / `source` / `state` / `severity` / `timestamp_us`。

`LiftState.fault_code` 与故障袋记录是两条互补的信息：前者是驱动器上报的原始码，后者是平台归一化后的故障集合。两者不一致时以故障袋为准。

展示给人看的文本用 `Catalogs.format_fault(record)`，见 [文本目录 Catalogs](../../usage/catalogs.md)。

### 常见故障码

`lift` 的故障码在 domain `0x03`、module `0x06` 下，所以整码是 `0x0306xxxx`，`xxxx` 是原因码：

| 原因码 | key | 严重度 | 含义 |
|--------|-----|--------|------|
| `0x0001` | `communication_loss` | FAULT | 通信丢失 |
| `0x0002` | `driver_fault` | FAULT | 驱动器故障 |
| `0x0003` | `over_current` | FAULT | 过流 |
| `0x0004` | `over_voltage` | FAULT | 过压 |
| `0x0005` | `under_voltage` | FAULT | 欠压 |
| `0x0006` | `over_temperature` | FAULT | 过温 |
| `0x0007` | `encoder_fault` | FAULT | 编码器故障 |
| `0x0008` | `overload_stall` | FAULT | 过载或堵转 |
| `0x0009` | `over_speed` | FAULT | 超速 |
| `0x000A` | `following_error` | FAULT | 跟随误差 |
| `0x000B` | `limit_triggered` | WARN | 限位触发 |
| `0x000C` | `sto_triggered` | FAULT | STO 触发 |
| `0x000D` | `not_homed` | WARN | 未回零 |
| `0x000E` | `homing_failed` | FAULT | 回零失败 |
| `0x000F` | `stroke_out_of_range` | WARN | 超出行程 |
| `0x0010` | `duty_cycle_cooldown` | WARN | 工作制冷却 |
| `0x0011` | `not_enabled` | WARN | 未使能 |
| `0x0012` | `command_rejected` | WARN | 命令被拒绝 |
| `0x0013` | `move_timeout` | WARN | 运动超时 |
| `0x0014` | `estop_asserted` | FAULT | 急停生效 |

`not_homed` / `not_enabled` / `command_rejected` / `move_timeout` / `stroke_out_of_range` 都是 WARN：命令没被执行，修正前置条件后重发即可。FAULT 级需要先处理硬件或驱动器状态（`clear_fault()`）。

## 状态

`status()` 返回只读状态袋，整机聚合见 `robot.status().lift`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `height` | `float` | 当前高度，米 |
| `velocity` | `float` | 当前速度，米/秒 |
| `enabled` | `bool` | 是否已使能 |
| `homed` | `bool` | 是否已回零 |
| `moving` | `bool` | 是否正在运动 |

公共只读查询：`health()` 返回 `SlotHealth`，`lifecycle()` 返回 `CapabilityLifecycleSnapshot`。

槽位未绑定 adapter 时 `status()` 仍可调用，返回字段全为默认值；运动命令会下发到平台后失败。

## 资源

| 资源 | 策略 | 占用者 |
|------|------|--------|
| `lift` | `queue` | `move_height` / `move_height_relative` / `move_home` |

读命令与 `servo_height` / `stop` / `set_height_zero` 是短 Command，不进入队列。同一时间只有一个高度 Operation 在执行，后续 Operation 排队等待。

三个高度 Operation 都是可取消的，默认时限 **60 秒**（超时由服务端把任务置为终态，不是客户端等待上限）。

## 适配器

`robot.lift.as_adapter(LiftLeadshine)` 可拿到雷赛升降柱的强类型视图，配置域为 `can` 与 `mechanics`：

| 方法 | 说明 |
|------|------|
| `clear_fault(timeout_ms=2000)` | 清驱动器故障，返回 `Outcome` |
| `get_drive_state(timeout_ms=3000)` | 读驱动器原始状态 |
| `get_diagnostics(timeout_ms=4000)` | 读诊断信息 |
| `probe_raw_inputs(timeout_ms=6000)` | 读原始输入点，用于接线排查 |

```python
from fabot.adapters import LiftLeadshine

lift = robot.lift.as_adapter(LiftLeadshine)
print(lift.clear_fault().success)
print(lift.get_diagnostics())
```

这些是适配器私有扩展，换用其他升降柱适配器时不可用；通用接口只用本页上面的 `LiftProxy` 方法。
