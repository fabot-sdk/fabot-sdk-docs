---
title: Your First Program (Python)
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Your First Program (Python)

This tutorial has three stages: verify the connection only (no capability involved), discover which capabilities this robot actually has, and only then call them. With that order, any failure points straight at its cause.

## Prerequisites

- The SDK is installed and `import fabot` works, see [Install the Python SDK](./install/python.md); environment requirements are in [Requirements](./install/requirements.md).
- The robot control-plane endpoint is reachable (IP + port, default 7557). When the SDK and the robot control plane run on the same host (for example, developing on the robot itself), skip the address and call `Robot.connect()`.
- No robot at hand? `Robot.mock()` works for local development, but it returns shell responses by default. Stage 1 runs as-is; stages 2 and 3 need hooks first, see [Mock Testing](../usage/testing/mock.md).

## Stage 1: connection only

This stage touches the connection and robot-wide queries only, so it works even if the robot has no screen or IO.

```python
from fabot import Robot

# Swap 127.0.0.1 for the robot's address when the control plane is on another host;
# for local use the address can be omitted entirely: Robot.connect()
with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print("platform:", robot.version())
    print("sdk:", robot.sdk_version)
    state = robot.state()
    print("mode:", state.mode.name, "health:", state.health.name)
# leaving the with block closes the connection
```

Expected output looks like:

```console
platform: 1.1.0-beta.2
sdk: 1.1.0-beta.2
mode: Idle health: Normal
```

The exact `mode` / `health` values follow the live state; printing them at all proves the connection, slot resolution and robot-wide queries work. If this stage fails, go straight to [Troubleshooting](../troubleshooting.md).

Under `Robot.mock()`, `version()` returns the `0.0.0` sentinel and `mode` / `health` are `Unknown`. That is normal mock behaviour, not a fault.

## Stage 2: discover what the robot has

Whether a capability slot is usable depends on the robot configuration. List them before deciding what to call:

```python
with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    for slot_id, proxy in sorted(robot.slots.items()):
        lc = proxy.lifecycle()
        print(f"{slot_id:22s} adapter={proxy.has_adapter!s:5s} lifecycle={lc.lifecycle.name}")
```

You should see roughly 24 lines, one per slot. Only slots with `adapter=True` and `lifecycle=Active` are safe to use directly; `adapter=False` means this robot does not carry that capability, and later calls will fail or time out.

## Stage 3: call two capabilities

Call only what you discovered. The code below checks first:

```python
from fabot.capabilities.io import PinDirection

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()

    if robot.screen.has_adapter:
        applied = robot.screen.show_text("Hello, fabot!")
        print("screen:", applied.outcome.success, applied.status.overlay_text)

    if robot.io.has_adapter:
        robot.io.acquire(
            chip="tegra264-gpio", line=17, direction=PinDirection.INPUT, value=False
        )
        try:
            print("line 17 =", robot.io.get_level(chip="tegra264-gpio", line=17).value)
        finally:
            robot.io.release(chip="tegra264-gpio", line=17)
```

Swap in your robot's address (the examples use the loopback address `127.0.0.1`; use the robot's own address when it is on another host), save it as `hello_fabot.py`, and run `python3 hello_fabot.py`.

:::note `outcome.success` may be `None`
`ScreenStatusApplied.outcome` and `LineApplied.outcome` can be `None` when the platform did not fill them in. For a strict check write `bool(applied.outcome and applied.outcome.success)`; failure details live in `Outcome.status_message`.
:::

:::note `chip` differs per machine
`tegra264-gpio` above is just this machine's kernel label. Before running it on your robot, list the chips and line offsets with `robot.io.chips()`; a chip without a label is addressed by device name such as `gpiochipN`.
:::

## What the code does

- `Robot.connect(host, port)` opens the connection; for local use (SDK and control plane on the same host) omit the arguments as `Robot.connect()` and the default configuration discovers the endpoint. `with` guarantees `close()` on exit. Other entry points (`from_endpoint` / `from_config` / `mock`) and `ClientOptions` are in [Connection & Robot Entry](../usage/basics/connection.md).
- `wait_ready()` blocks until slots that are **bound, enabled and marked essential** are ready. Unbound or non-essential slots are skipped silently — neither blocking nor raising. That is exactly why stage 2 probes the slots itself. The per-slot wait bound is `ClientOptions.resolve_timeout_ms`.
- `version()` returns the platform version string, `sdk_version` the local SDK version; `state()` returns a `RobotState` snapshot where `mode` is `RobotMode` and `health` is `HealthState`, see [Status, Faults & Lifecycle](../usage/data/status-faults.md). Both are `IntEnum`s: printing them yields numbers, and `.name` gives names like `Idle` / `Normal`.
- `robot.slots` maps slot ids to proxies (24 entries). `has_adapter` and `lifecycle()` are the two most direct "can I call this" checks. Full list in [Robot Entry](../reference/python/robot.md#slots).
- Acquire a line before reading or writing it and `release` it afterwards (inside `finally`, so an exception still releases). A line is located by chip plus line offset; field details are in [Screen](../reference/python/screen.md) and [IO](../reference/python/io.md).
- On an unbound slot capability methods are still dispatched and fail or time out platform-side, while `get_config()` / `as_adapter()` raise `AdapterUnbound`. See [Error Handling](../usage/diagnostics/errors.md).

## Next steps

- No robot? Develop offline with `Robot.mock()`, see [Mock Testing](../usage/testing/mock.md).
- Read the conventions first: [Time Bases and Coordinate Conventions](../usage/basics/conventions.md), [Concurrency, Threading and Safety](../usage/basics/concurrency-and-safety.md).
- Learn the call model: [Commands & Operations](../usage/basics/commands-operations.md), [Events & Data Channels](../usage/data/events-channels.md).
- Log, measure and capture the scene: [Logs, Metrics & Observability](../usage/diagnostics/observability.md).
- Look up a capability: [API Reference](../reference/python/index.md).
- More complete code: [Python Examples](../examples/python/index.md).
