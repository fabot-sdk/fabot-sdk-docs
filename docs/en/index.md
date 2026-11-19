---
title: fabot SDK Documentation
status: draft
owner: fabot-core
updated: 2026-11-18
---

# fabot SDK Documentation

The fabot SDK is a client development kit for integrators: it connects to, controls and monitors a fabot robot from your application. This documentation covers the client SDK (the `fabot-sdk` Python wheel) only, not the robot internals; the system software preinstalled on the robot host is covered as background in [Robot System & Local Console](./usage/testing/robot-system.md).

- **Python**: `fabot-sdk` (import name `fabot`), requires Python ≥ 3.12
- This site documents **fabot-sdk 1.1.0-beta.2**; when it disagrees with your installation, `fabot.__version__` wins — see [Version Compatibility](./getting-started/install/compatibility.md)

## One-minute quick start

After installing the SDK (see [Installation & Configuration](./getting-started/install/index.md)), a few lines connect to the robot and call a capability:

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
1.1.0-beta.2 1.1.0-beta.2
Idle Normal
```

:::note Check what this robot actually carries
`wait_ready()` only waits for slots that are bound and marked essential; capabilities that are not installed are skipped silently. The full three-stage walkthrough (connect → probe slots → call capabilities) is in [Your First Program](./getting-started/quickstart.md).
:::

No robot at hand? Develop offline first: `Robot.mock()` gives you a hardware-free entry, see [Mock Testing](./usage/testing/mock.md).

## Reading guide

The docs are organized into three chapters: **Getting Started** gets you running, **Sections** covers the shared mechanics and examples in depth, and **Reference** is for lookup.

**Getting Started**

| Page | Content |
|------|---------|
| [Overview & Architecture](./getting-started/overview.md) | Where the SDK sits, terminology, the two API layers |
| [Installation & Configuration](./getting-started/install/index.md) | Requirements, Python install, version compatibility |
| [Quick Start](./getting-started/quickstart.md) | Three stages: connect, probe slots, call capabilities |

**Sections**

| Page | Content | Audience |
|------|---------|----------|
| [Usage](./usage/index.md) | Five themed chapters: basics, data & status, errors & diagnostics, configuration / skills / services, testing / migration / background | Everyone |
| [Python Examples](./examples/python/index.md) | Complete examples per capability | Application developers |
| [Robot System & Local Console](./usage/testing/robot-system.md) | How the robot system relates to the SDK, the `fabot` command, the `fabot console` UI | On-site operations |
| [Troubleshooting](./troubleshooting.md) | Connection failures, `wait_ready`, Operation failures, e-stop recovery, frames, camera capture and lift motion | Everyone |

**Reference**

| Page | Content | Audience |
|------|---------|----------|
| [Reference Overview](./reference/python/index.md) | Python API reference for the robot entry, diagnostic codes, every capability module, plus skills and platform services | Application developers |
| [Changelog](./changelog.md) | What changed in each release, with compatibility notes | Read before upgrading |

## Version compatibility

See [Version Compatibility](./getting-started/install/compatibility.md) for the SDK and robot-side version baseline.
