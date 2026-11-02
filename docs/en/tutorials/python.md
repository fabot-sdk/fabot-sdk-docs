---
title: Your First Program (Python)
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Your First Program (Python)

This tutorial walks through a complete session in a dozen lines: connect to the robot → wait until ready → read robot-wide info → call two capabilities → disconnect automatically.

## Prerequisites

- The SDK is installed and `import fabot` works; see [Installing the Python SDK](../install/python.md) and [Requirements](../install/requirements.md).
- The robot's control-plane endpoint (IP + port, default 7557) is reachable over the network.
- No real robot? Run the same flow offline with `Robot.mock()`; see [Mock Testing](../usage/mock.md).

## Complete code

```python
from fabot import Robot
from fabot.capabilities.io import PinDirection

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()                       # wait for bound and essential slots to become ready

    print("Platform version:", robot.version())
    print("SDK version:", robot.sdk_version)
    state = robot.state()
    print("Run mode:", state.mode, "health:", state.health)

    # Call a capability: show text on the face screen
    applied = robot.screen.show_text("Hello, fabot!")
    print("Screen result:", applied.outcome.success)

    # Acquire an IO pin and read its level
    robot.io.acquire(17, direction=PinDirection.INPUT)
    level = robot.io.get_level(17)
    print("pin 17 =", level.value)
    robot.io.release(17)
# close() runs automatically when the with block exits
```

Replace the IP with your robot's address, save as `hello_fabot.py`, and run `python3 hello_fabot.py`.

## Walkthrough

- `Robot.connect(host, port)`: connects to the control-plane endpoint; the `with` block guarantees `close()` on exit. For other connection styles (`from_endpoint` / `from_config` / `mock`) and `ClientOptions`, see [Connection & Robot Entry](../usage/connection.md).
- `wait_ready()`: blocks until the bound, enabled and essential slots are ready; unbound optional slots do not block startup. The wait budget comes from `ClientOptions.resolve_timeout_ms`.
- `version()` returns the platform version string and `sdk_version` the local SDK version. `state()` returns a `RobotState` snapshot: `mode` is the run mode (`RobotMode`) and `health` the health (`HealthState`), see [Status, Faults & Lifecycle](../usage/status-faults.md).
- Capabilities are accessed through read-only slot properties (`robot.screen`, `robot.io`, … — 23 in total). Every call returns a result object: `applied.outcome.success` from `show_text` reports success, and `level.value` from `get_level` is the current level. Acquire a pin before reading or writing it, and `release` it afterwards. Field details are on the [Screen](../reference/python/screen.md) and [IO](../reference/python/io.md) pages.
- Calling an unbound slot fails (the platform rejects or times out); on a real robot check `robot.io.has_adapter` first. See [Error Handling](../usage/errors.md).

## Next steps

- No robot? Develop offline with [Mock Testing](../usage/mock.md): `Robot.mock()`.
- Understand the call model: [Commands & Operations](../usage/commands-operations.md), [Events & Data Channels](../usage/events-channels.md).
- Log, measure, and capture the scene: [Logs, Metrics & Observability](../usage/observability.md).
- Look up a capability: [Reference](../reference/python/index.md).
- More complete code: [Examples (Python)](../examples/python/index.md).
