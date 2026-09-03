---
title: Commands & Operations
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Commands & Operations

Capabilities expose two kinds of calls: **Command** (synchronous request-response) and **Operation** (long-running, cancelable tasks).

## Command

A Command is a single blocking call: send the request, wait for the response, get the result or raise an error.

```python
# Keyword arguments; every command has timeout_ms (defaults documented per capability)
robot.io.set_digital_output(channel="relay1", value=True)
level = robot.io.get_digital_input(channel="di_1")

# Chassis speed limit
robot.chassis.set_max_speed(vx=0.5, vtheta=0.8, timeout_ms=1000)
```

Behavioral conventions:

- A timeout raises `Timeout` (one of the error categories; see [Error Handling](errors.md)). Default timeouts are documented per capability and can be overridden by `ClientOptions.command_timeout_ms` and call-level arguments.
- Raises concrete `FabotError` subclasses (preserving `code` / `category` / `retryable` / `trace_id`).

## Operation

Long-running tasks (e.g. navigation, relative moves, arm trajectories) return an Operation handle without blocking the calling thread:

```python
op = robot.chassis.navigate_to_station(station_id="charging", mode=NavigationMode.NAVIGATE)

# Poll the status snapshot (you can also iterate op.events() to wait for progress)
snapshot = op.get(timeout_ms=1000)
print(snapshot.state, snapshot.terminal)   # OperationState, whether terminal

for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)       # progress feedback (e.g. ChassisProgressT)
    if snap.terminal:
        break

if snapshot.error is not None: ...          # FabotError on failure
result = snapshot.result                    # terminal result (e.g. ChassisOutcomeT)

op.cancel()                                 # cancel the task
```

`OperationState`: `Queued` / `Running` / `Succeeded` / `Failed` / `Canceled` / `Timeout`. No further progress after a terminal state (`terminal`); on `Failed` / `Timeout`, get the failure reason from `error`.

## Cancellation Semantics

- `cancel()` is **best effort**: whether a task that has entered its execution phase can be interrupted is decided by the server; after successful cancellation the state is `Canceled`.
- Calling `close()` on the handle does not affect the server-side task itself (the task runs on the robot).

## Low-Level Handles (Advanced)

Under the product-layer proxies lies `SlotHandle` (`fabot.core`): `command()` / `start_operation()` / `subscribe()`, with raw byte payloads (`BytesPayload`), used together with `encode_flatbuffer` / `decode_flatbuffer`. Ordinary applications do not need to use it directly.
