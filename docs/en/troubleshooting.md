---
title: Troubleshooting
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Troubleshooting

Issue entries organized by symptom. General tools: every failed call raises a `FabotError` subclass carrying `code` / `category` / `retryable` / `trace_id` (see [Error Handling](usage/errors.md)); whole-robot state and faults are queried via `robot.state()` / `robot.faults()` (see [Status, Faults & Lifecycle](usage/status-faults.md)); asynchronous changes are pushed via events (see [Events & Data Channels](usage/events-channels.md)).

## Cannot connect

`Robot.connect` / `from_endpoint` / `from_config` block until the connection is established and raise `FabotError` on failure. Start by classifying the error's `category`:

| Exception (category) | Likely cause | What to check |
|----------------------|--------------|---------------|
| `TransportError` / `Unavailable` | Network unreachable, control plane not running | Verify the robot control-plane endpoint (IP and port, default 7557) is correct and reachable; verify the robot platform is up |
| `Unauthorized` | Authentication failure | Check `ClientConfig.auth_token` |
| `ProtocolIncompatible` | SDK and robot platform versions not matched | Check the SDK/platform version pairing, see [Version Compatibility](install/compatibility.md) |

Other checks:

- Verify the SDK installation: `import fabot` should import cleanly, see [Install the Python SDK](install/python.md).
- To rule out robot-side factors first, run the flow offline with `Robot.mock()`, see [Mock Testing](usage/mock.md).

```python
from fabot import Robot, FabotError

try:
    robot = Robot.connect("192.168.1.10", 7557)
except FabotError as e:
    print(e.category, e.code, e.message, e.retryable)
```

If the connection drops after being established: query the current state with `robot.connection.is_connected()`, or subscribe to connection changes with `robot.connection.subscribe(cb)` and rebuild the `Robot` connection after a drop. Errors with `retryable == True` can be retried with backoff, see [Error Handling](usage/errors.md). For full connection details see [Connection & Robot Entry](usage/connection.md).

## wait_ready

`wait_ready(slots=None)` only waits for slots that are **bound and `enabled` + `required`**: unbound, disabled, or `required=False` slots are skipped without waiting. Per-slot resolution timeout is controlled by `ClientOptions.resolve_timeout_ms` (default 1000 ms); a failed resolution raises an exception. See [Robot Entry](reference/python/robot.md) for the full semantics.

Common misunderstandings and checks:

- **"Waited, but the slot is still unusable"**: the slot may have been skipped. Check `robot.<slot>.has_adapter` first; calling capability methods on an unbound slot raises `AdapterUnbound` (`NotFound`, 6002). See [Configuration](usage/configuration.md) for binding and the `enabled` / `required` flags.
- **Timeout-class exception raised**: the corresponding adapter may not be started or not ready yet. Check `robot.<slot>.lifecycle()` to confirm the lifecycle has reached `Active` and health is normal; increase `resolve_timeout_ms` when the robot side starts slowly.
- **Waiting scope too broad**: use `robot.wait_ready(["left_arm", "io"])` to wait only for the slots your application needs, instead of being held up by unrelated slots.
- Do not call blocking APIs such as `wait_ready` inside an event callback (the SDK I/O thread), or `ClientThreadError` (6003) is raised.

```python
from fabot.core import ClientOptions
from fabot import Robot, FabotError

options = ClientOptions(resolve_timeout_ms=5000)
with Robot.connect("192.168.1.10", 7557, options) as robot:
    if robot.left_arm.has_adapter:
        try:
            robot.wait_ready(["left_arm"])
        except FabotError as e:
            print(e.category, e.message)
            print(robot.left_arm.lifecycle())
```

## Operation failure

An Operation returned by a long-running task (navigation, arm trajectories, etc.) does not signal failure by raising; failures appear in the snapshot. See [Commands & Operations](usage/commands-operations.md) for usage.

Troubleshooting steps:

1. Wait for a terminal state: once `snapshot.terminal` is `True` the state no longer advances; the terminal state is one of `Succeeded` / `Failed` / `Canceled` / `Timeout`.
2. Read the failure cause: on `Failed` / `Timeout`, inspect `snapshot.error` (a `FabotError`) for `code` / `category` / `retryable` / `trace_id`; see `snapshot.feedback.statusMessage` for progress text and `snapshot.result` for the terminal result.
3. Handle by category: `Timeout` / `Unavailable` with `retryable == True` can be retried; `Canceled` means the task was canceled (`cancel()` is best-effort — whether a task already in its execution phase can be interrupted is decided by the server); `ResourceConflict` means the resource is occupied and new tasks on the same resource queue up.
4. For deeper investigation, correlate `snapshot.error.trace_id` with robot-side logs (`LogRecord` from `robot.logs.subscribe` carries a `trace_id` field).

```python
from fabot.core.types import OperationState

op = robot.left_arm.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    if snap.terminal:
        if snap.state is OperationState.Succeeded:
            print(snap.result)
        else:
            err = snap.error
            print(snap.state, err.code, err.category, err.message, err.trace_id)
        break
```

If an Operation stays in `Queued` for a long time: a previous task on the same resource is still executing and the new task is queued; make sure no old task handles were left running.

## Recovering after e-stop

The e-stop is a robot-wide latch: once engaged, the robot run state becomes `RobotRunState.Estopped`. After confirming the scene is safe, recover as follows (see the estop section of [Robot Entry](reference/python/robot.md) for the API):

1. Confirm the state and source: `robot.estop.state()` returns an `EstopState` (`asserted` / `reason` / `source_id`); `robot.state().is_estopped` is `True`. E-stop changes can also be subscribed via `robot.events.estop_changed`.
2. Release the latch: after confirming the scene is safe, call `robot.estop.release(reason="...")`.
3. Confirm the robot has left the e-stop state: query `robot.state()` again and confirm it is no longer `Estopped`. If it is still `Estopped` after `release`, use `EstopState.reason` / `source_id` to locate the source still holding the e-stop.
4. Check for leftover faults: inspect `robot.faults()` for faults recorded while estopped; for the slots your application uses, check `robot.<slot>.lifecycle()` / `health()` and confirm the lifecycle is back to `Active` and health is normal before issuing new tasks.

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    estop = robot.estop.state()
    if estop.asserted:
        print(estop.reason, estop.source_id)
        robot.estop.release(reason="site check done")

    if not robot.state().is_estopped:
        faults = robot.faults()
        print(faults.revision)
        print(robot.chassis.lifecycle())
```
