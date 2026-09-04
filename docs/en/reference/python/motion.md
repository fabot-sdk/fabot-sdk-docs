---
title: Motion
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Motion

## Module Overview

- Capability id: `motion`; slot: `robot.motion`
- Whole-body motion planning and execution control: read robot-wide joint angles, drive the motion-control state machine (FSM), stop and reset.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `get_joints` | — | `list[JointPositionT]` | Command |
| `stop` | — | `OutcomeT` | Command |
| `get_fsm_state` | — | `FsmState` | Command |
| `set_fsm_state` | `state` | `FsmState` | Command |
| `reset_fsm` | — | `OutcomeT` | Command |
| `set_body_mode` | `mode` | `OutcomeT` | Command |

Command default `timeout_ms`: 1000 for `get_joints` / `stop` / `get_fsm_state`, 3000 for `set_fsm_state` / `set_body_mode`, 30000 for `reset_fsm` (all overridable). All parameters are keyword-only.

| Channel | Content |
|---------|---------|
| `joints()` | Robot-wide joint-position stream (`NamedJointsT`) |

## Methods

All method parameters are keyword-only. Command timeouts are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### get_joints

Read the current robot-wide joint angles.

```python
get_joints(*, timeout_ms: int = 1000) -> list[JointPositionT]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`list[JointPositionT]`, each item:

| Field | Type | Description |
|-------|------|-------------|
| `name` | `str` | Joint name |
| `position` | `float` | Joint angle in radians |

```python
for joint in robot.motion.get_joints():
    print(joint.name, joint.position)
```

### stop

Stop the current motion.

```python
stop(*, timeout_ms: int = 1000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`:

| Field | Type | Description |
|-------|------|-------------|
| `success` | `bool` | Whether the command succeeded |
| `statusMessage` | `str` | Status text |

```python
outcome = robot.motion.stop()
print(outcome.success, outcome.statusMessage)
```

### get_fsm_state

Query the current state of the motion-control state machine.

```python
get_fsm_state(*, timeout_ms: int = 1000) -> FsmState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`FsmState` enum: `FsmState.Home` / `FsmState.Hold` / `FsmState.Ocs2` / `FsmState.MoveJ`.

```python
from fabot.capabilities.motion import FsmState

state = robot.motion.get_fsm_state()
if state == FsmState.Hold:
    print("motion control is in Hold")
```

### set_fsm_state

Switch the motion-control state machine. Returns the state that was actually applied.

```python
set_fsm_state(*, state: FsmState, timeout_ms: int = 3000) -> FsmState
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `state` | `FsmState` | (required) | Target state: `FsmState.Home` / `FsmState.Hold` / `FsmState.Ocs2` / `FsmState.MoveJ` |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`FsmState`: the state actually applied.

```python
from fabot.capabilities.motion import FsmState

applied = robot.motion.set_fsm_state(state=FsmState.Hold)
print(applied)
```

### reset_fsm

Reset the motion-control state machine. This can take a while; the default timeout is 30 seconds.

```python
reset_fsm(*, timeout_ms: int = 30000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `30000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

```python
outcome = robot.motion.reset_fsm()
print(outcome.success, outcome.statusMessage)
```

### set_body_mode

Set the whole-body constraint mode.

```python
set_body_mode(*, mode: str, timeout_ms: int = 3000) -> OutcomeT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `mode` | `str` | (required) | Mode name (case-sensitive): `BODY_FREE` / `BODY_RELATIVE` / `BODY_TRACKING` / `BODY_LOCK` / `BODY_HEAD_COUPLED` / `BODY_CUSTOM_LOCK` / `BODY_UNLOCK`; `BODY_VERTICAL` is a legacy alias for `BODY_RELATIVE` |
| `timeout_ms` | `int` | `3000` | Command timeout (milliseconds) |

**Returns**

`OutcomeT`: `success` / `statusMessage`.

```python
outcome = robot.motion.set_body_mode(mode="BODY_RELATIVE")
print(outcome.success, outcome.statusMessage)
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### joints()

Subscribe to the robot-wide joint-position stream.

```python
joints(qos_profile: str = "latest") -> JointsChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`JointsChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `NamedJointsT` | `payload.positions`: `list[JointPositionT]`, each with `name` (joint name) / `position` (radians) |

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
ch = robot.motion.joints(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    for joint in frame.payload.positions:
        print(frame.sequence, joint.name, joint.position)
```

## Events

Subscribe via `robot.motion.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.motion.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.motion.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.motion.events.lifecycle_changed.subscribe(callback)`.

**Payload**

`LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot`:

| Field | Type | Description |
|-------|------|-------------|
| `lifecycle` | `LifecycleState` | Lifecycle stage |
| `health` | `HealthState` | Health |
| `source_instance_id` | `str` | Source instance id |

```python
def on_lifecycle(event):
    snap = event.lifecycle
    print(event.header.slot_id, snap.lifecycle, snap.health)

token = robot.motion.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.motion.faults()`, which returns `Faults`.

This module has no named faults yet: `Faults` currently only exposes `revision`. Changes are pushed on `fault_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md) for the shared model.

If named faults appear later, each one is a `FaultState`:

| Field | Type | Description |
|-------|------|-------------|
| `active` | `bool` | Whether the fault is still standing |
| `catalog_id` | `str` | Catalog id |
| `fault_class` | `CapabilityStateClass` | Fault class |
| `first_seen_us` / `last_seen_us` | `int` | First / last seen timestamp (microseconds) |
| `count` | `int` | Occurrence count |

## Status

This module has no `status()`. For aggregated robot status see `robot.status()`.

Shared queries:

- `health()`: current health
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `source_instance_id`)

Changes arrive on `lifecycle_changed`. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

`set_fsm_state` and `reset_fsm` hold the whole-body motion-control resource: while one of them is running, another call on the same resource is rejected outright instead of queued. `get_joints` / `stop` / `get_fsm_state` / `set_body_mode` do not hold this resource and can be called at any time.
