---
title: IO (Digital/Analog Input & Output)
status: draft
owner: fabot-core
updated: 2026-09-03
---

# IO (Digital/Analog Input & Output)

## Module Overview

- Capability id: `io`; slot: `robot.io`
- Read and write the robot's digital / analog IO channels, and subscribe to the digital channel level-change stream. Digital levels are `bool`; analog levels are `float`, and analog output values are normalized to `[0.0, 1.0]`.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `set_digital_input` | `channel`, `value` | `DigitalLevelAppliedT` | Command |
| `get_digital_input` | `channel` | `DigitalLevelAppliedT` | Command |
| `set_digital_output` | `channel`, `value` | `DigitalLevelAppliedT` | Command |
| `get_digital_output` | `channel` | `DigitalLevelAppliedT` | Command |
| `set_analog_input` | `channel`, `value` | `AnalogLevelAppliedT` | Command |
| `get_analog_input` | `channel` | `AnalogLevelAppliedT` | Command |
| `set_analog_output` | `channel`, `value` | `AnalogLevelAppliedT` | Command |
| `get_analog_output` | `channel` | `AnalogLevelAppliedT` | Command |

Command default `timeout_ms`: 1000 for every method (all overridable). All parameters are keyword-only. This module has no Operation.

| Channel | Content |
|---------|---------|
| `digital_events()` | Digital channel level-change stream (`DigitalEventT`) |

## Methods

All method parameters are keyword-only. Command timeouts are documented in [Commands & Operations](../../usage/commands-operations.md); they are not repeated in each section.

### set_digital_input

Write a digital input channel level (for simulation injection and similar scenarios).

```python
set_digital_input(*, channel: str, value: bool, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `value` | `bool` | (required) | Target level |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`DigitalLevelAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `channel` | `str` | Channel name |
| `value` | `bool` | The level actually applied |

```python
applied = robot.io.set_digital_input(channel="di_1", value=True)
print(applied.outcome.success, applied.channel, applied.value)
```

### get_digital_input

Read the current level of a digital input channel.

```python
get_digital_input(*, channel: str, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`DigitalLevelAppliedT`: same fields as `set_digital_input`; `value` is the level currently read.

```python
level = robot.io.get_digital_input(channel="di_1")
print(level.value)
```

### set_digital_output

Write a digital output channel level.

```python
set_digital_output(*, channel: str, value: bool, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `value` | `bool` | (required) | Target level |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`DigitalLevelAppliedT`: same fields as `set_digital_input`.

```python
applied = robot.io.set_digital_output(channel="relay1", value=True)
print(applied.outcome.success, applied.outcome.statusMessage)
```

### get_digital_output

Read the current level of a digital output channel.

```python
get_digital_output(*, channel: str, timeout_ms: int = 1000) -> DigitalLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`DigitalLevelAppliedT`: same fields as `set_digital_input`; `value` is the level currently read.

```python
level = robot.io.get_digital_output(channel="relay1")
print(level.value)
```

### set_analog_input

Write an analog input channel level (for simulation injection and similar scenarios).

```python
set_analog_input(*, channel: str, value: float, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `value` | `float` | (required) | Target level |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`AnalogLevelAppliedT`:

| Field | Type | Description |
|-------|------|-------------|
| `outcome` | `OutcomeT` | `success` / `statusMessage` |
| `channel` | `str` | Channel name |
| `value` | `float` | The level actually applied |

```python
applied = robot.io.set_analog_input(channel="ai_1", value=0.5)
print(applied.outcome.success, applied.channel, applied.value)
```

### get_analog_input

Read the current level of an analog input channel.

```python
get_analog_input(*, channel: str, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`AnalogLevelAppliedT`: same fields as `set_analog_input`; `value` is the level currently read.

```python
level = robot.io.get_analog_input(channel="ai_1")
print(level.value)
```

### set_analog_output

Write an analog output channel level; output values are normalized to `[0.0, 1.0]`.

```python
set_analog_output(*, channel: str, value: float, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `value` | `float` | (required) | Target level, range `[0.0, 1.0]` |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`AnalogLevelAppliedT`: same fields as `set_analog_input`.

```python
applied = robot.io.set_analog_output(channel="ao_1", value=0.8)
print(applied.outcome.success, applied.outcome.statusMessage)
```

### get_analog_output

Read the current level of an analog output channel.

```python
get_analog_output(*, channel: str, timeout_ms: int = 1000) -> AnalogLevelAppliedT
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `channel` | `str` | (required) | Channel name |
| `timeout_ms` | `int` | `1000` | Command timeout (milliseconds) |

**Returns**

`AnalogLevelAppliedT`: same fields as `set_analog_input`; `value` is the level currently read.

```python
level = robot.io.get_analog_output(channel="ao_1")
print(level.value)
```

## Channels

Open parameters and frame fields are below; see [Events & Data Channels](../../usage/events-channels.md) for shared usage.

### digital_events()

Subscribe to the digital channel level-change stream.

```python
digital_events(qos_profile: str = "latest") -> DigitalEventsChannel
```

**Open parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `qos_profile` | `str` | `"latest"` | `"latest"` / `"realtime"` / `"reliable"` |

**Frame** (`DigitalEventsChannelFrame`)

| Field | Type | Description |
|-------|------|-------------|
| `channel_id` | `str` | Channel id |
| `sequence` | `int` | Frame sequence |
| `timestamp_us` | `int` | Timestamp (microseconds) |
| `payload` | `DigitalEventT` | See the table below |

`payload` (`DigitalEventT`) fields:

| Field | Type | Description |
|-------|------|-------------|
| `channel` | `str` | Channel name |
| `value` | `bool` | Level after the change |
| `edge` | `DigitalEdge` | Edge type |
| `timestampNs` | `int` | Edge timestamp (nanoseconds) |

`DigitalEdge` values: `UNKNOWN` (0, the edge could not be classified, for example a first sample with no prior level), `RISING` (1, rising edge), `FALLING` (2, falling edge).

Iterate frames with `frames(poll_timeout_ms=..., timeout_ms=...)`.

```python
from fabot.capabilities.io import DigitalEdge

ch = robot.io.digital_events(qos_profile="latest")
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    p = frame.payload
    if p.edge == DigitalEdge.RISING:
        print(p.channel, "rising ->", p.value)
```

## Events

Subscribe via `robot.io.events`. Callbacks run on the SDK I/O thread: keep them light and do not call blocking APIs; see [Events & Data Channels](../../usage/events-channels.md).

Every event includes an `EventHeader`: `name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`.

### fault_changed

Pushed when this slot's fault set changes.

Subscribe with `robot.io.events.fault_changed.subscribe(callback)`.

**Payload**

`FaultChangedEvent.faults`: `Faults`. Today `Faults` only has `revision`; this module has no named faults yet. See [Faults](#faults).

```python
def on_fault(event):
    print(event.header.slot_id, event.faults.revision)

token = robot.io.events.fault_changed.subscribe(on_fault)
```

### lifecycle_changed

Pushed when this slot's lifecycle or health changes.

Subscribe with `robot.io.events.lifecycle_changed.subscribe(callback)`.

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

token = robot.io.events.lifecycle_changed.subscribe(on_lifecycle)
```

## Faults

Query with `robot.io.faults()`, which returns `Faults`.

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

This module declares no exclusive resources: every method is a short-lived Command with no queuing or mutual-exclusion constraint, and reads/writes on different channels do not interfere with each other.
