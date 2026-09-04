---
title: Commands & Operations
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Commands & Operations

Capability slots expose two kinds of calls:

- **Command**: synchronous request-response; one blocking call returns the result or raises an error.
- **Operation**: a long-running, cancelable task; returns a handle immediately, with progress polled or streamed via events.

All parameters of both kinds are keyword-only. See the [API reference](../reference/python/index.md) for each capability's methods.

## Command

A Command is a single blocking call: send the request, wait for the response, return the decoded result object, or raise a `FabotError` subclass on failure.

```python
# Keyword arguments; every command has timeout_ms (defaults documented per capability)
applied = robot.io.set_digital_output(channel="relay1", value=True)
level = robot.io.get_digital_input(channel="di_1")
print(level.value)

# Chassis speed limit and velocity command
applied = robot.chassis.set_max_speed(linear=0.5, angular=0.8)
print(applied.appliedLinear, applied.appliedAngular)
robot.chassis.set_velocity(vx=0.3, vy=0.0, vtheta=0.2)
robot.chassis.stop()
```

Behavioral conventions:

- A timeout raises `Timeout` (one of the error categories; see [Error Handling](errors.md)). Each method has a default `timeout_ms` (documented per capability) that can be overridden with a call-level argument.
- Failures raise concrete `FabotError` subclasses preserving `code` / `category` / `retryable` / `trace_id`.
- Return values are decoded typed objects (e.g. `success` / `statusMessage` on `OutcomeT`); field details are documented per capability.
- Commands are blocking calls and must not run on the SDK I/O thread (event callbacks); see [Events & Data Channels](events-channels.md).

## Operation

Long-running tasks (e.g. station navigation, relative moves, arm trajectories) return an Operation handle immediately without blocking the calling thread:

```python
from fabot.capabilities.chassis import NavigationMode

# station_id comes from list_stations() and is an int
stations = robot.chassis.list_stations().stations
op = robot.chassis.navigate_to_station(
    station_id=stations[0].stationId, mode=NavigationMode.AUTONOMOUS,
)
print(op.id)                                # task id

# Option 1: poll the latest snapshot
snap = op.get(timeout_ms=1000)
print(snap.state, snap.terminal)            # OperationState, whether terminal

# Option 2: iterate the event stream, yielding snapshots as the task advances
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)        # progress feedback (e.g. ChassisProgressT)
    # iteration ends automatically once a terminal state is reached

if snap.error is not None: ...              # FabotError on failure
result = snap.result                        # terminal result (e.g. ChassisOutcomeT)

snap = op.cancel()                          # request cancellation, returns the latest snapshot
```

Operation handles expose the same members across capabilities; only the snapshot type is specialized per capability (e.g. `MoveRelativeOperation` / `NavigateToStationOperation`):

| Member | Description |
|--------|-------------|
| `id` | Task id |
| `get(timeout_ms=None)` | Fetch the latest snapshot, waiting at most `timeout_ms` milliseconds |
| `events(poll_timeout_ms=1000, timeout_ms=None)` | Iterate the snapshot stream; ends automatically at a terminal state; raises the built-in `TimeoutError` if `timeout_ms` elapses first |
| `cancel()` | Best-effort cancellation; returns the latest snapshot |

Snapshot fields:

| Field | Type | Description |
|-------|------|-------------|
| `operation_id` | `str` | Task id |
| `state` | `OperationState` | Task state |
| `terminal` | `bool` | Whether the state is terminal |
| `updated_at_us` / `sequence` | `int` | Snapshot timestamp (microseconds) and sequence number |
| `feedback` | per-capability type \| `None` | Progress feedback (e.g. `ChassisProgressT`) |
| `result` | per-capability type \| `None` | Terminal result (e.g. `ChassisOutcomeT`) |
| `error` | `FabotError` \| `None` | Failure reason |

`OperationState` values: `Unknown` / `Queued` / `Running` / `Succeeded` / `Failed` / `Canceled` / `Timeout`. `Succeeded` / `Failed` / `Canceled` / `Timeout` are terminal (`terminal` is `True`) and no further progress occurs afterwards; on `Failed` / `Timeout`, get the failure reason from `error`.

Operations on the same resource are queued and never run concurrently; resource ownership is documented in the "Resources" section of each capability reference page.

## Cancellation Semantics

- `cancel()` is **best effort**: whether a task that has entered its execution phase can be interrupted is decided by the server; after successful cancellation the state is `Canceled`.
- The task may already have finished before the cancellation: check the `state` of the snapshot returned by `cancel()` — if it is already terminal (`Succeeded` / `Failed` / ...), the task completed before the cancel request took effect.
- The task runs on the robot; the SDK handle is only an observation and control entry point, so dropping the handle does not affect the server-side task.

## Low-Level Handles (Advanced)

Under the product-layer proxies lies `SlotHandle` (`fabot.core`): `command()` / `start_operation()` / `subscribe()`, returning asynchronous `Future`s with raw byte payloads (`BytesPayload`), used together with `encode_flatbuffer` / `decode_flatbuffer`. Ordinary applications do not need to use it directly.
