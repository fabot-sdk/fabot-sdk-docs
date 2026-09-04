---
title: fabot SDK Documentation
status: draft
owner: fabot-core
updated: 2026-09-04
---

# fabot SDK Documentation

The fabot SDK is a client development kit for integration developers, used to connect to, control, and monitor a fabot robot from the application side. This documentation covers only the client SDK (the `fabot-sdk` Python wheel), not the robot's internal implementation.

- **Python**: `fabot-sdk` (import name `fabot`), requires Python ≥ 3.12

## One-Minute Quick Start

After installing the SDK (see [Installation & Configuration](install/index.md)), a few lines of code connect to the robot and call a capability:

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    robot.screen.show_text(text="Hello, fabot!")
```

No robot at hand? You can develop offline first: `Robot.mock()` provides a hardware-free simulation entry point. See [Mock Testing](usage/mock.md).

## Reading Guide

| Section | Content | Audience |
|---------|---------|----------|
| [Overview & Architecture](overview.md) | Where the SDK sits, terminology, two-layer API | All readers |
| [Installation & Configuration](install/index.md) | Requirements, Python install, version compatibility | All readers — start here |
| [General Operations](usage/index.md) | Connection, Command / Operation, events & channels, status & faults, configuration, error handling, Mock | All readers |
| [Your First Program (Python)](tutorials/python.md) | Run your first Python program | All readers |
| [Python Examples](examples/python/index.md) | Complete Python examples by capability | Application developers |
| [Capability Interfaces Overview](reference/python/index.md) | Python interface reference for each capability module | Application developers |
| [Troubleshooting](troubleshooting.md) | Cannot connect, `wait_ready`, Operation failure, recovering after e-stop | All readers |

## Version Compatibility

See [Version Compatibility](install/compatibility.md) for the SDK and robot-side version baseline.
