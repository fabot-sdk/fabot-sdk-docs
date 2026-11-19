---
title: Installation Overview
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Installation Overview

This section covers the environment requirements, installation steps, and version compatibility rules of the fabot Python SDK. The SDK is distributed as a Python wheel; the import name after installation is `fabot`, with no dependency on ROS.

## Quick start

Once the [Requirements](./requirements.md) are met, install the SDK and verify:

```console
$ pip install fabot-sdk        # or install the wheel file from the release artifacts
```

```python
import fabot
print(fabot.__version__)       # verify the installation; prints the installed SDK version
```

Connect to a real robot (the example uses the loopback address and the default port 7557; swap in the actual address when the robot is on another host):

```python
from fabot import Robot

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print(robot.version())
```

When the control plane runs on this same host, omit the address: `Robot.connect()` discovers the endpoint from the default configuration.

Without a robot, use `Robot.mock()` to verify the installation and develop offline — see [Mock testing](../../usage/testing/mock.md).

## In this section

| Page | Contents |
|------|----------|
| [Requirements](./requirements.md) | Operating system, CPU architecture, Python version, and network conditions |
| [Install the Python SDK](./python.md) | Installing the wheel, dependencies, and verifying the installation |
| [Version Compatibility](./compatibility.md) | How SDK versions map to robot platform versions |

## Next steps

- [First program (Python)](../quickstart.md): run a minimal example from scratch
- [Connection and the Robot entry point](../../usage/basics/connection.md): connection methods, timeouts, and connection state subscription
- If the robot is unreachable or `wait_ready` times out, see [Troubleshooting](../../troubleshooting.md)
