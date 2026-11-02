---
title: fabot SDK Documentation
status: draft
owner: fabot-core
updated: 2026-11-02
---

# fabot SDK Documentation

The fabot SDK is a client development kit for integrators: it connects to, controls and monitors a fabot robot from your application. This documentation covers the client SDK (the `fabot-sdk` Python wheel) only, not the robot internals.

- **Python**: `fabot-sdk` (import name `fabot`), requires Python ≥ 3.12

## One-minute quick start

After installing the SDK (see [Installation & Configuration](install/index.md)), a few lines connect to the robot and call a capability:

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    robot.screen.show_text("Hello, fabot!")
```

No robot at hand? Develop offline first: `Robot.mock()` gives you a hardware-free entry, see [Mock Testing](usage/mock.md).

## Reading guide

| Section | Content | Audience |
|---------|---------|----------|
| [Overview & Architecture](overview.md) | Where the SDK sits, terminology, the two API layers | Everyone |
| [Installation & Configuration](install/index.md) | Requirements, Python install, version compatibility | Everyone — start here |
| [Usage](usage/index.md) | Connection, Commands / Operations, events & channels, status & faults, logs & metrics, frames, configuration, errors, catalogs, mock, skills | Everyone |
| [Tutorial (Python)](tutorials/python.md) | Run your first Python program | Everyone |
| [Python Examples](examples/python/index.md) | Complete examples per capability | Application developers |
| [Capability Interfaces Overview](reference/python/index.md) | Python API reference for the robot entry and every capability module | Application developers |
| [Troubleshooting](troubleshooting.md) | Connection failures, `wait_ready`, Operation failures, e-stop recovery, frame and camera issues | Everyone |
| [Changelog](changelog.md) | What changed in each release, with compatibility notes | Read before upgrading |

## Version compatibility

See [Version Compatibility](install/compatibility.md) for the SDK and robot-side version baseline.
