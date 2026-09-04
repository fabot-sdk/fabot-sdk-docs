---
title: Installation & Configuration
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Installation & Configuration

This section covers the environment requirements, installation steps, and version compatibility rules of the fabot Python SDK. The SDK is distributed as a Python wheel; the import name after installation is `fabot`, with no dependency on ROS.

## Quick start

Once the [Requirements](requirements.md) are met, install the SDK and verify:

```console
$ pip install fabot-sdk        # or install the wheel file from the release artifacts
```

```python
import fabot
print(fabot.__version__)       # verify the installation; prints the installed SDK version
```

Connect to a real robot (use the address and port of your actual deployment; the control-plane port defaults to 7557):

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print(robot.version())
```

Without a robot, use `Robot.mock()` to verify the installation and develop offline — see [Mock testing](../usage/mock.md).

## In this section

| Page | Contents |
|------|----------|
| [Requirements](requirements.md) | Operating system, CPU architecture, Python version, and network conditions |
| [Install the Python SDK](python.md) | Installing the wheel, dependencies, and verifying the installation |
| [Version Compatibility](compatibility.md) | How SDK versions map to robot platform versions |

## Next steps

- [First program (Python)](../tutorials/python.md): run a minimal example from scratch
- [Connection and the Robot entry point](../usage/connection.md): connection methods, timeouts, and connection state subscription
- If the robot is unreachable or `wait_ready` times out, see [Troubleshooting](../troubleshooting.md)
