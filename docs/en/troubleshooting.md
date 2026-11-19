---
title: Troubleshooting
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Troubleshooting

Symptom-oriented checklist. General tools: every failed call raises a `FabotError` subclass carrying `code` (a diagnostic code) / `retryable` / `trace_id` (see [Error Handling](./usage/diagnostics/errors.md)); robot state and faults come from `robot.state()` / `robot.faults()` (see [Status, Faults & Lifecycle](./usage/data/status-faults.md)); asynchronous changes arrive as events (see [Events & Data Channels](./usage/data/events-channels.md)).

## Cannot connect

`Robot.connect` / `from_endpoint` / `from_config` block until the connection is up and raise `FabotError` on failure. Start from the error type:

| Symptom | Likely cause | Check |
|---------|--------------|-------|
| `TransportError` / `Unavailable` / `Timeout` | Network unreachable, control plane not running, blocked port | Confirm the control-plane endpoint (IP and port, default 7557) and reachability; confirm the platform is running; open the firewall |
| `Unauthorized` | Authentication failure | Check `ClientConfig.auth_token` |
| `ProtocolIncompatible` | SDK and platform versions do not match | Check version compatibility, see [Version Compatibility](./getting-started/install/compatibility.md) |

Other checks:

- Verify the installation: `import fabot` should work, see [Installing the Python SDK](./getting-started/install/python.md).
- When the SDK and the control plane share a host, first try `Robot.connect()` without an address (discovered from the default configuration) to rule out a wrong address.
- To rule out the robot side, run the flow offline with `Robot.mock()`, see [Mock Testing](./usage/testing/mock.md).

```python
from fabot import Robot, FabotError

try:
    robot = Robot.connect("127.0.0.1", 7557)
except FabotError as e:
    print(hex(e.code), e.retryable, e.message, e.trace_id)
```

If the connection drops while running: query `robot.connection.is_connected()` or subscribe with `robot.connection.subscribe(cb)`, then rebuild the `Robot`. Errors with `retryable == True` can be retried with backoff, see [Error Handling](./usage/diagnostics/errors.md). Full connection details are in [Connection & Robot Entry](./usage/basics/connection.md).

## wait_ready

`wait_ready(slots=None)` only waits for slots that are **bound, `enabled` and `essential`**; unbound, disabled or non-essential slots are skipped. The per-slot budget is `ClientOptions.resolve_timeout_ms` (default 1000 ms) and a failed resolution raises. Details are in [Robot Entry](./reference/python/robot.md).

Common misunderstandings:

- **"It returned but the slot is still unusable"**: the slot was probably skipped. Check `robot.<slot>.has_adapter`; on an unbound slot `get_config()` / `as_adapter()` raise `AdapterUnbound` and capability methods fail or time out once dispatched. Binding plus `enabled` / `required` configuration is in [Configuration](./usage/configuration/configuration.md).
- **A timeout was raised**: the adapter may not be started or not ready yet. Check that `robot.<slot>.lifecycle()` reached `Active` and what `health()` reports; if the robot starts slowly, raise `resolve_timeout_ms`.
- **Waiting on too much**: use `robot.wait_ready(["left_arm", "io"])` to wait only for what your business needs.
- Do not call blocking APIs such as `wait_ready` from an event callback (SDK I/O thread); it raises `ClientThreadError`.

```python
from fabot import Robot, FabotError
from fabot.core import ClientOptions

options = ClientOptions(resolve_timeout_ms=5000)
with Robot.connect("127.0.0.1", 7557, options) as robot:
    if robot.left_arm.has_adapter:
        try:
            robot.wait_ready(["left_arm"])
        except FabotError as e:
            print(hex(e.code), e.message)
            print(robot.left_arm.lifecycle(), robot.left_arm.health())
```

## Operation failure

Long-running tasks (navigation, arm trajectories) do not raise on runtime failure; the failure shows up in the snapshot. See [Commands & Operations](./usage/basics/commands-operations.md).

1. Wait for a terminal state: once `snapshot.terminal` is `True` the state stops advancing, and it is one of `Succeeded` / `Failed` / `Canceled` / `Timeout`.
2. Read the cause: on `Failed` / `Timeout` read `snapshot.error` (a `FabotError`) for `code` / `retryable` / `trace_id`; the progress text is in `snapshot.feedback.status_message` and the terminal payload in `snapshot.result`.
3. React by class: `retryable == True` can be retried; `Canceled` means the task was cancelled (`cancel()` is best effort, and a running task may or may not be interruptible); `ResourceConflict` means the resource is busy — `queue` policies queue, `reject` policies refuse outright.
4. For deeper analysis, correlate `snapshot.error.trace_id` with robot logs (`robot.logs.history()` / `robot.logs.subscribe()` records carry `trace_id`), see [Logs, Metrics & Observability](./usage/diagnostics/observability.md).

```python
from fabot.core import OperationState
from fabot.types import JointPositions

positions = list(robot.left_arm.get_joint().positions)
op = robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    if snap.terminal:
        if snap.state is OperationState.Succeeded:
            print(snap.result)
        else:
            err = snap.error
            print(snap.state, hex(err.code) if err else None, err.message if err else "")
        break
```

If an Operation sits in `Queued` for a long time: another task on the same resource is running. Confirm no stale handles are holding it.

## Recovering from e-stop

The e-stop is a robot-wide latch: after engaging, `robot.state().mode` becomes `RobotMode.Estopped`. Once the site is confirmed safe, recover as follows (API in the estop section of [Robot Entry](./reference/python/robot.md)):

1. Confirm the latch and its source: `robot.estop.state()` returns `EstopState` (`asserted` / `reason` / `source_id`) and `robot.state().is_estopped` is `True`. Changes can also be watched through `robot.events.estop_changed`.
2. Clear the latch: after confirming safety, call `robot.estop.release(reason="...")`.
3. Confirm it cleared: check `robot.state()` again and verify `mode` is no longer `Estopped`. If it still is, use `EstopState.reason` / `source_id` to find the source still holding the latch.
4. Inspect leftover faults: `robot.faults()` lists faults recorded while stopped (each `FaultState` has `code` / `severity`); check `lifecycle()` / `health()` on the slots you use and continue only once they are `Active` and healthy.

```python
from fabot import Robot

with Robot.connect("127.0.0.1", 7557) as robot:
    estop = robot.estop.state()
    if estop.asserted:
        print(estop.reason, estop.source_id)
        robot.estop.release(reason="site check done")

    st = robot.state()
    if not st.is_estopped:
        print(st.mode, st.health)
        for record in robot.faults().chassis.records:
            print(hex(record.code), record.severity)
        print(robot.chassis.lifecycle())
```

## Frame lookup failures

When `robot.frames.lookup()` raises a `FrameError` subclass, the type tells you why (see [Frames & Transforms](./usage/data/frames.md)):

| Exception | Cause | Action |
|-----------|-------|--------|
| `FrameNotFoundError` | The name is not in the tree | Check names with `robot.frames.list_frames()`; use `wait_for_transform()` early at startup |
| `FrameConnectivityError` | The frames are in different trees | Look for missing intermediate frames and inspect `to_mermaid()` |
| `InvalidFrameNameError` | Name violates the grammar | Lowercase letters, digits and underscores only, `/` between segments |
| `FrameTimeoutError` | Wait timed out | Increase `timeout`, or confirm the publisher is running |
| `FrameAuthorityError` | Protected edge or low authority | Use a higher `authority`, or stop overwriting kinematic edges |

## Camera capture timeouts

When `capture()` raises `Timeout`, check in order:

1. Is the camera streaming? `robot.head_camera.status().color_active` and `state` (should be `streaming`). Cameras start streaming once active; if the configuration looks off, call `open()` explicitly.
2. Session state: `get_state().awaiting_external_trigger` being `True` means it is waiting for a trigger — supply the external trigger signal.
3. Frame age: with `wait_for_fresh=True` and a small `max_age_ms`, low frame-rate streams time out often; raise `max_age_ms` or relax `timeout_ms`.
4. Transport: large frames prefer shared memory, which is unavailable across hosts; the SDK then falls back to inline transport, which is noticeably slower for big images.

## The lift will not move

Rejected `robot.lift` motion has three usual causes:

1. **Not homed**: with `require_homed` on and `robot.lift.get_height().homed` `False`, absolute height targets are refused — run `move_home()`, or `set_height_zero()` at a known mechanical position;
2. **Enable is not a cause**: position commands and `move_home` do their own fault recovery and reach Operation Enabled, so no `set_enable(True)` is needed first; `set_enable(False)` only drops torque deliberately;
3. **No slot**: `robot.lift.has_adapter` is `False` when this robot has no lift.

`homed` is a software flag in `home.yaml` that survives a power cycle and disappears only after an encoder fault `0x7321`–`0x7328`. Separately, the client `wait(timeout=...)` does not extend the motion: the server-side budget is the command's `wait_timeout`, defaulting to `default_wait_timeout_s` (15 s in the template).

For drive-side faults compare `robot.lift.faults()` with `robot.lift.get_height().fault_code`; with the Leadshine adapter you can also read raw diagnostics via `as_adapter(LiftLeadshine).get_diagnostics()`.

## Where to look up motor / chassis / camera codes

The high byte of a diagnostic code locates the domain and module, see [Diagnostic Codes](./reference/python/error-codes.md). Render text with `Catalogs.format_error()` / `format_fault()`; no text means your SDK is older than the platform.

## Threads and disconnects

- Calling a blocking API inside a callback raises `ClientThreadError`; the thread model and the recommended pattern are in [Concurrency, Threading and Safety](./usage/basics/concurrency-and-safety.md).
- After a disconnect, `SubscriptionToken`s and channels are no longer guaranteed valid and must be re-created; `Robot` cannot reconnect — see "Disconnects and reconnects" on the same page.
