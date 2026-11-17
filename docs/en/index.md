---
title: fabot SDK Documentation
status: draft
owner: fabot-core
updated: 2026-11-17
---

# fabot SDK Documentation

The fabot SDK is a client development kit for integrators: it connects to, controls and monitors a fabot robot from your application. This documentation covers the client SDK (the `fabot-sdk` Python wheel) only, not the robot internals.

- **Python**: `fabot-sdk` (import name `fabot`), requires Python ≥ 3.12
- This site documents **fabot-sdk 1.1.0-alpha.1**; when it disagrees with your installation, `fabot.__version__` wins — see [Version Compatibility](install/compatibility.md)

## One-minute quick start

After installing the SDK (see [Installation & Configuration](install/index.md)), a few lines connect to the robot and call a capability:

```python
from fabot import Robot

# Explicit endpoint: loopback address plus the control-plane port (7557 by default)
with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print(robot.version(), robot.sdk_version)
    state = robot.state()
    print(state.mode.name, state.health.name)
    if robot.screen.has_adapter:
        robot.screen.show_text("Hello, fabot!")
```

When the SDK and the robot control plane run on the same host (for example, developing on the robot itself), skip the address — `Robot.connect()` discovers the endpoint from the default configuration:

```python
from fabot import Robot

with Robot.connect() as robot:      # local use, no IP needed
    robot.wait_ready()
    print(robot.version())
```

Expected output (values follow the live state; anything that prints proves connectivity — `RobotMode` / `HealthState` are `IntEnum`s, so print `.name` to get names instead of numbers):

```console
1.1.0-alpha.1 1.1.0-alpha.1
Idle Normal
```

:::note Check what this robot actually carries
`wait_ready()` only waits for slots that are bound and marked essential; capabilities that are not installed are skipped silently. The full three-stage walkthrough (connect → probe slots → call capabilities) is in [Your First Program](tutorials/python.md).
:::

No robot at hand? Develop offline first: `Robot.mock()` gives you a hardware-free entry, see [Mock Testing](usage/mock.md).

## Reading guide

| Section | Content | Audience |
|---------|---------|----------|
| [Quick Start](tutorials/python.md) | Three stages: connect, probe slots, call capabilities | Everyone — read this first |
| [Overview & Architecture](overview.md) | Where the SDK sits, terminology, the two API layers | Everyone |
| [Installation & Configuration](install/index.md) | Requirements, Python install, version compatibility | Everyone — start here |
| [Usage](usage/index.md) | Connection, conventions, Commands / Operations, concurrency & safety, events & channels, status & faults, logs & metrics, frames, errors & diagnostic codes, configuration, mock, skills, services | Everyone |
| [Python Examples](examples/python/index.md) | Complete examples per capability | Application developers |
| [Capability Interfaces Overview](reference/python/index.md) | Python API reference for the robot entry, diagnostic codes and every capability module | Application developers |
| [Troubleshooting](troubleshooting.md) | Connection failures, `wait_ready`, Operation failures, e-stop recovery, frames, camera capture and lift motion | Everyone |
| [Changelog](changelog.md) | What changed in each release, with compatibility notes | Read before upgrading |

## Version compatibility

See [Version Compatibility](install/compatibility.md) for the SDK and robot-side version baseline.
