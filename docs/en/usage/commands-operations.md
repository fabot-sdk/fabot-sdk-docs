---
title: Commands & Operations
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Commands & Operations

Capability slots expose two kinds of calls:

- **Command**: synchronous request/response; one blocking call returns a result or raises.
- **Operation**: a long-running, cancelable task; returns a handle immediately and reports progress via polling or events.

Each capability page in the [API reference](../reference/python/index.md) labels the kind, and the signature blocks are authoritative for names and defaults.

## Command

A Command is a blocking call: send, wait, decode, and raise on failure.

```python
from fabot.capabilities.io import PinDirection

# Positional and keyword arguments mix; every command has timeout_ms
robot.io.acquire(17, direction=PinDirection.OUTPUT)
applied = robot.io.set_level(17, value=True)
print(robot.io.get_level(17).value)
robot.io.release(17)

# Chassis velocity servo
from fabot.capabilities.chassis import ChassisMode

robot.chassis.set_mode(ChassisMode.MANUAL)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
robot.chassis.servo_twist(vx=0.0, vy=0.0, vtheta=0.0)
```

Behaviour:

- Parameters before `*` in the signature accept positional or keyword form; those after `*` are keyword-only.
- Timeouts raise `Timeout`. Each method has a default `timeout_ms` (see its page), overridable per call and influenced by `ClientOptions.command_timeout_ms`.
- Failures raise a concrete `FabotError` subclass carrying `code` / `category` / `retryable` / `trace_id`, see [Error Handling](errors.md).
- Return values are decoded typed objects (such as `Outcome` with `success` / `status_message`); fields are documented per capability.
- Commands block and must not run on the SDK I/O thread (event callbacks), see [Events & Data Channels](events-channels.md).

## Operation

Long-running tasks (arm trajectories, chassis navigation, voice capture) return a handle immediately without blocking the caller:

```python
from fabot.capabilities.chassis import NavigationMode

stations = robot.chassis.get_station()          # list[StationInfo]
op = robot.chassis.move_station(stations[0].id, mode=NavigationMode.AUTONOMOUS)
print(op.id)                                    # operation id

# Style 1: poll the latest snapshot
snap = op.get(timeout=1.0)
print(snap.state, snap.terminal)                # OperationState, terminal flag

# Style 2: iterate snapshots as the task advances
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)
    if snap.terminal:
        break

# Style 3: block until terminal, raising on failure
result = op.wait(timeout=60.0)

snap = op.cancel()                              # request cancellation
```

Every capability's handle has the same surface, only the snapshot type differs (`MoveJointOperation` / `MoveStationOperation` / `ListenOperation`, …):

| Member | Description |
|--------|-------------|
| `id` | Operation id |
| `get(timeout=None, *, timeout_ms=None)` | Fetch the latest snapshot, waiting at most the given budget |
| `wait(timeout=None, *, timeout_ms=None)` | Block to terminal and return `result`; raises on `Failed` / `Canceled` / `Timeout` |
| `events(poll_timeout_ms=1000, timeout_ms=None)` | Iterate snapshots until terminal; an overall timeout raises `Timeout` |
| `cancel()` | Best-effort cancel, returning the latest snapshot |
| `__iter__` / `with` | Iterating is equivalent to `events()`; leaving the context closes the event subscription |

`timeout` is in seconds and `timeout_ms` in milliseconds; they are equivalent, and `timeout` wins when both are given.

Snapshot fields:

| Field | Type | Description |
|-------|------|-------------|
| `operation_id` | `str` | Operation id |
| `state` | `OperationState` | Task state |
| `terminal` | `bool` | Whether terminal |
| `updated_at_us` / `sequence` | `int` | Snapshot timestamp (µs) and sequence |
| `feedback` | capability type \| `None` | Progress feedback (arms and chassis use `Progress`: `progress` + `status_message`) |
| `result` | capability type \| `None` | Terminal result (usually `Outcome`; voice capture uses `CaptureSummary`) |
| `error` | `FabotError` \| `None` | Failure reason |

`OperationState`: `Unknown` / `Queued` / `Running` / `Succeeded` / `Failed` / `Canceled` / `Timeout`. `Succeeded` / `Failed` / `Canceled` / `Timeout` are terminal (`terminal` is `True`) and never advance; on `Failed` / `Timeout` read the failure from `error`.

## Resources and queueing

Operations on the same resource follow the declared policy:

| Policy | Behaviour |
|--------|-----------|
| `queue` | New tasks queue behind the running one (arm, chassis navigation, motion control, gripper, hand, body, head, camera open/close) |
| `reject` | Fail immediately while the resource is busy (joystick teleop session, voice capture and playback) |

Ownership and policy are listed in each capability page's Resources section. Under `reject`, a rejected call raises `ResourceConflict` at the call site.

## Cancellation semantics

- `cancel()` is **best effort**: whether a running task can be interrupted is up to the server; on success the state becomes `Canceled`.
- The task may have finished first: inspect the returned snapshot's `state`; if it is already `Succeeded` / `Failed`, the task completed before the cancel landed.
- Tasks run on the robot; the SDK handle is only an observation and control surface, and dropping it does not affect the server-side task.
- Voice `listen()` / `play_audio()` and teleop `start_joystick_control()` exist as session-style Operations: cancelling one ends the session.

## Timeouts and budgets

Do not confuse the four time concepts:

| Concept | Where | Meaning |
|---------|-------|---------|
| Command timeout | `timeout_ms` | Wait budget for one request/response |
| Operation default budget | per capability (for example 180 s chassis navigation, 60 s motion control, 45 s teleop) | Server-side ceiling for the task; it ends automatically |
| Motion `duration` | method parameter | Requested motion time; `0` uses the controller default |
| Arrival wait `wait_timeout` | method parameter | Extra wait for arrival on top of the duration; `0` keeps the default policy |

## Low-level handles (advanced)

Below the product proxies sits `SlotHandle` (`fabot.core`) with `command()` / `start_operation()` / `subscribe()`, returning async `Future`s with raw byte payloads (`BytesPayload`) to pair with `encode_flatbuffer` / `decode_flatbuffer`. Applications rarely need it.
