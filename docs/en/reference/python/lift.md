---
title: Lift
status: draft
owner: fabot-core
updated: 2026-11-16
---

# Lift

## Module overview

- Capability id: `lift`; slot: `robot.lift`
- Capability domain: `lift`
- Height control for the lift column: read height / enable, speed and acceleration limits, absolute and relative height moves, homing, and setting the current position as zero.
- `status()` reports height, velocity, enable, homing and motion state.

Heights are metres, velocity metres per second, acceleration metres per second squared. Write commands (moves and servo) share the `lift` resource with the `queue` policy.

## API overview

| Name | Type | Description |
|------|------|-------------|
| `get_height` | Command | Read the current height state (`LiftState`); default timeout 1000 ms. |
| `get_enable` / `set_enable` | Command | Read / write the enable flag; write defaults to 3000 ms. |
| `get_velocity_limit` / `set_velocity_limit` | Command | Read / write the velocity limit (m/s). |
| `get_acceleration_limit` / `set_acceleration_limit` | Command | Read / write the acceleration limit (m/s²). |
| `servo_height` | Command | Short-cycle height servo; default timeout 1000 ms. |
| `stop` | Command | Stop the current motion; default timeout 2000 ms. |
| `set_height_zero` | Command | Treat the current position as zero; default timeout 2000 ms. |
| `move_height` | Operation | Absolute height move. |
| `move_height_relative` | Operation | Relative height move. |
| `move_home` | Operation | Homing move. |
| `height` | Channel | Height state stream, frames carry `LiftState`. |
| `lift_state_changed` | Event | Lift state event; payload is `LiftEvent` (`kind` / `height` / `enabled` / `homed` / `message`). |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return synchronously and `timeout_ms` can be overridden per call; Operations return a handle immediately and report progress through snapshots, see [Commands and long-running operations](../../usage/commands-operations.md).

## Methods

Parameter names and defaults follow the signature blocks below; parameters before `*` accept positional or keyword form, those after it are keyword-only.

### get_height

Read the current height state.

```python
get_height(*, timeout_ms: int = 1000) -> LiftState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Call timeout (ms) |

**Returns** `LiftState`

| Field | Type | Description |
|-------|------|-------------|
| `height` | `float` | Current height, metres |
| `velocity` | `float` | Current velocity, m/s |
| `enabled` | `bool` | Whether the axis is enabled |
| `homed` | `bool` | Whether homing has completed |
| `moving` | `bool` | Whether the axis is moving |
| `fault_code` | `int` | Current drive fault code; `0` means no fault |
| `stamp_ns` | `int` | Sample time (ns) |

### get_enable / set_enable

Read or set the enable flag. Move commands are rejected while the axis is disabled.

```python
get_enable(*, timeout_ms: int = 1000) -> bool
set_enable(enabled: bool, *, timeout_ms: int = 3000) -> bool
```

**Parameters** (`set_enable`)

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `enabled` | `bool` | (required) | Target enable state |
| `timeout_ms` | `int` | `3000` | Call timeout (ms) |

### Velocity and acceleration limits

```python
get_velocity_limit(*, timeout_ms: int = 1000) -> float
set_velocity_limit(value: float, *, timeout_ms: int = 1000) -> float
get_acceleration_limit(*, timeout_ms: int = 1000) -> float
set_acceleration_limit(value: float, *, timeout_ms: int = 1000) -> float
```

Limits persist: a written value applies to later move commands until changed again. The return value is the limit that took effect.

### servo_height

Short-cycle height servo: stream height targets at a fixed rate for tracking.

```python
servo_height(value: float, *, timeout_ms: int = 1000) -> float
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `value` | `float` | (required) | Target height, metres |
| `timeout_ms` | `int` | `1000` | Call timeout (ms) |

:::warning Servo targets do not expire on their own
`servo_height()` sends one target and does not open a session. You must call `stop()` explicitly to end tracking; do not rely on disconnecting to stop the lift. See [Servo and safety](../../usage/concurrency-and-safety.md).
:::

### stop

Stop the current motion and return the outcome.

```python
stop(*, timeout_ms: int = 2000) -> Outcome
```

### set_height_zero

Treat the current position as zero and return the outcome. This is a calibration action: every subsequent height reading shifts by the same amount.

```python
set_height_zero(*, timeout_ms: int = 2000) -> Outcome
```

### move_height

Absolute height move.

```python
move_height(target: float, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveHeightOperation
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `target` | `float` | (required) | Target height, metres |
| `tolerance` | `float` | `0.0` | Arrival tolerance (m); `0` keeps the controller default |
| `duration` | `float` | `0.0` | Desired motion duration (s); `0` keeps the controller default |
| `wait_timeout` | `float` | `0.0` | Extra arrival-wait budget on top of `duration`; `0` keeps the default policy |

### move_height_relative

Move by a delta from the current height.

```python
move_height_relative(target: float, *, tolerance: float = 0.0, duration: float = 0.0, wait_timeout: float = 0.0) -> MoveHeightRelativeOperation
```

`target` is the delta: positive goes up, negative goes down.

### move_home

Homing move. On success `LiftState.homed` becomes `True`.

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

## Channels

### height

Height state stream; frames carry `LiftState` (fields as in `get_height`).

```python
ch = robot.lift.height(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        print(frame.sequence, frame.payload.height, frame.payload.moving)
finally:
    ch.close()
```

For frame fields, `qos_profile`, leases and `next()`, see [Events and data channels](../../usage/events-channels.md).

## Events

Subscribe through `robot.lift.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader`.

| Entry | Event type | Payload |
|-------|-----------|---------|
| `robot.lift.events.lift_state_changed` | `LiftStateChangedEvent` | `lift_state`: `LiftEvent` (`slot` / `kind` / `height` / `enabled` / `homed` / `message`) |
| `robot.lift.events.fault_changed` | `FaultChangedEvent` | `faults`: `Faults` |
| `robot.lift.events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`: `CapabilityLifecycleSnapshot` |

```python
def on_lift(event):
    print(event.header.timestamp_us, event.lift_state.kind, event.lift_state.height)

token = robot.lift.events.lift_state_changed.subscribe(on_lift)
# ...
token.close()
```

## Exceptions

Query via `robot.lift.faults()`, which returns `Faults` (`revision` plus `records: list[FaultState]`). Each `FaultState` is `code` / `source` / `state` / `severity` / `timestamp_us`.

`LiftState.fault_code` and the fault bag are complementary: the first is the raw drive code, the second the platform-normalised fault set. When they disagree, trust the fault bag.

For human-readable text use `Catalogs.format_fault(record)`, see [Catalogs](../../usage/catalogs.md).

### Common fault codes

Lift faults live under domain `0x03`, module `0x06`, so the full code is `0x0306xxxx` where `xxxx` is the reason:

| Reason | key | Severity | Meaning |
|--------|-----|----------|---------|
| `0x0001` | `communication_loss` | FAULT | Communication lost |
| `0x0002` | `driver_fault` | FAULT | Drive fault |
| `0x0003` | `over_current` | FAULT | Over-current |
| `0x0004` | `over_voltage` | FAULT | Over-voltage |
| `0x0005` | `under_voltage` | FAULT | Under-voltage |
| `0x0006` | `over_temperature` | FAULT | Over-temperature |
| `0x0007` | `encoder_fault` | FAULT | Encoder fault |
| `0x0008` | `overload_stall` | FAULT | Overload or stall |
| `0x0009` | `over_speed` | FAULT | Over-speed |
| `0x000A` | `following_error` | FAULT | Following error |
| `0x000B` | `limit_triggered` | WARN | Limit triggered |
| `0x000C` | `sto_triggered` | FAULT | STO asserted |
| `0x000D` | `not_homed` | WARN | Not homed |
| `0x000E` | `homing_failed` | FAULT | Homing failed |
| `0x000F` | `stroke_out_of_range` | WARN | Stroke out of range |
| `0x0010` | `duty_cycle_cooldown` | WARN | Duty-cycle cooldown |
| `0x0011` | `not_enabled` | WARN | Not enabled |
| `0x0012` | `command_rejected` | WARN | Command rejected |
| `0x0013` | `move_timeout` | WARN | Move timed out |
| `0x0014` | `estop_asserted` | FAULT | E-stop asserted |

`not_homed` / `not_enabled` / `command_rejected` / `move_timeout` / `stroke_out_of_range` are WARN: the command did not run, so fix the precondition and resend. FAULT-level codes need the hardware or drive state handled first (`clear_fault()`).

## Status

`status()` returns a read-only status bag; the robot-wide aggregation is `robot.status().lift`:

| Field | Type | Description |
|-------|------|-------------|
| `height` | `float` | Current height, metres |
| `velocity` | `float` | Current velocity, m/s |
| `enabled` | `bool` | Whether the axis is enabled |
| `homed` | `bool` | Whether homing has completed |
| `moving` | `bool` | Whether the axis is moving |

Common read-only queries: `health()` returns `SlotHealth`, `lifecycle()` returns `CapabilityLifecycleSnapshot`.

## Resources

| Resource | Policy | Occupied by |
|----------|--------|-------------|
| `lift` | `queue` | `move_height` / `move_height_relative` / `move_home` |

Read commands plus `servo_height` / `stop` / `set_height_zero` are short Commands and do not queue. Only one height Operation runs at a time; later ones wait in the queue.

All three height Operations are cancelable with a default budget of **60 seconds** — the server moves the task to a terminal state at that point; this is not a client-side wait bound.

## Adapter

`robot.lift.as_adapter(LiftLeadshine)` exposes the Leadshine-specific typed view; its config domains are `can` and `mechanics`:

| Method | Description |
|--------|-------------|
| `clear_fault(timeout_ms=2000)` | Clear the drive fault, returns `Outcome` |
| `get_drive_state(timeout_ms=3000)` | Read the raw drive state |
| `get_diagnostics(timeout_ms=4000)` | Read diagnostics |
| `probe_raw_inputs(timeout_ms=6000)` | Read raw inputs, useful for wiring checks |

```python
from fabot.adapters import LiftLeadshine

lift = robot.lift.as_adapter(LiftLeadshine)
print(lift.clear_fault().success)
print(lift.get_diagnostics())
```

These are adapter-private extensions and are unavailable with a different lift adapter; portable code should stick to the `LiftProxy` methods above.
