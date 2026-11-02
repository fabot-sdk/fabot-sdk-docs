---
title: Installing the Python SDK
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Installing the Python SDK

The product Python SDK for fabot robots ships as the `fabot-sdk` package and installs under the import name `fabot`. Confirm the [Requirements](requirements.md) first (Python ≥ 3.12).

## Install

The SDK is distributed as a wheel. Install it locally once you have the file:

```console
$ pip install /path/to/fabot_sdk-<version>.whl
```

If your environment has a package index carrying `fabot-sdk`, you can install by name instead:

```console
$ pip install fabot-sdk
```

A virtual environment is recommended so the SDK does not interfere with the system Python.

## Dependencies

These are installed by pip automatically:

| Dependency | Constraint | Purpose |
|------------|-----------|---------|
| `flatbuffers` | Exactly pinned (`==23.5.26`) | Serialization of requests, responses and channel frames |
| `eclipse-zenoh` | Exactly pinned (`==1.6.2`) | Communication with the robot control plane; must stay in the same version family as the robot side |
| `PyYAML` | Not pinned | Configuration file I/O (`from_yaml` / `to_yaml`) |

A mismatched `eclipse-zenoh` version against the robot side breaks the connection; see [Version Compatibility](compatibility.md) when upgrading.

:::note numpy is optional
The point-cloud helpers in `robot.frames` (`deproject_depth_to_points` and friends) and `transform_points` return `ndarray` and use matrix math when `numpy` is installed. Without it they fall back to a pure-Python path (lists, per-point loops): correct but noticeably slower. Install `numpy` yourself if you process point clouds.
:::

## Verify

```python
import fabot

print(fabot.__version__)   # installed SDK version
```

Then verify against a real robot (address and port per your deployment):

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print("SDK version:", robot.sdk_version)
    print("Platform version:", robot.version())
    print("Run mode:", robot.state().mode, "health:", robot.state().health)
```

Without a robot, verify the installation and your code offline with `Robot.mock()` from [Mock Testing](../usage/mock.md):

```python
from fabot import Robot

robot = Robot.mock()
print(robot.connection.is_connected())     # True
print(robot.chassis.get_pose())
```

## Next steps

- [Connection & Robot Entry](../usage/connection.md): connection styles, timeouts, connection-state subscription
- [Your First Program (Python)](../tutorials/python.md): the smallest runnable example
- [Python API Reference](../reference/python/index.md): the full API per capability
