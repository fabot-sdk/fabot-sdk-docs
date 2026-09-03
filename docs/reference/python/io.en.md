---
title: IO (Digital/Analog Input & Output)
status: draft
owner: fabot-core
updated: 2026-09-03
---

# IO (Digital/Analog Input & Output)

## Module Overview

- Capability id: `io`; slot: `robot.io`
- Read and write the robot's digital / analog IO channels, and subscribe to channel level-change streams.

## API Overview

| Method | Request | Response | Type |
|--------|---------|----------|------|
| `set_digital_output` | `channel`, `value` | `DigitalLevelAppliedT` | Command |
| `get_digital_output` | `channel` | `DigitalLevelAppliedT` | Command |
| `get_digital_input` | `channel` | `DigitalLevelAppliedT` | Command |
| `set_analog_output` | `channel`, `value: float` | `AnalogLevelAppliedT` | Command |
| `get_analog_output` | `channel` | `AnalogLevelAppliedT` | Command |
| `get_analog_input` | `channel` | `AnalogLevelAppliedT` | Command |

| Channel | Content |
|---------|---------|
| `digital_events` | Digital channel level-change stream |

## Methods

All methods default to `timeout_ms=1000` (keyword argument).

```python
robot.io.set_digital_output(channel="relay1", value=True)
level = robot.io.get_digital_input(channel="di_1")
voltage = robot.io.get_analog_input(channel="ai_1")
```

Error behavior: a nonexistent channel name raises `InvalidArgument`; hardware read/write failures raise capability-private error codes (9xxxx).

## Channels

Digital level changes go through a data channel:

```python
ch = robot.io.digital_events(qos_profile=QosProfile.Realtime)
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload)   # payload: DigitalEventT
```

## Events

Fault and lifecycle changes are subscribed via `fault_changed` / `lifecycle_changed` on `robot.io.events`.

## Faults

## Status

This module has no `status()`; for whole-robot status see `robot.status()`.

## Resources
