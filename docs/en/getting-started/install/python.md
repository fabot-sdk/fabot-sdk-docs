---
title: Installing the Python SDK
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Installing the Python SDK

The product Python SDK for fabot robots ships as the `fabot-sdk` package and installs under the import name `fabot`. Confirm the [Requirements](./requirements.md) first (Python ≥ 3.12).

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

A mismatched `eclipse-zenoh` version against the robot side breaks the connection; see [Version Compatibility](./compatibility.md) when upgrading.

:::warning numpy is required for point-cloud deprojection
`deproject_depth_to_points()` (alias `depth_to_points`) **requires numpy** and raises `ImportError` without it. `transform_points()` returns `ndarray` and uses matrix math when `numpy` is installed, and falls back to a per-point pure-Python loop otherwise: correct but noticeably slower. Install `numpy` if you process point clouds.
:::

## Verify

```python
import fabot

print(fabot.__version__)   # installed SDK version
```

Then verify against a real robot (the example uses the loopback address `127.0.0.1`; swap in the actual address when the robot is on another host):

```python
from fabot import Robot

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print("SDK version:", robot.sdk_version)
    print("Platform version:", robot.version())
    print("Run mode:", robot.state().mode.name, "health:", robot.state().health.name)
```

When the control plane runs on this same host, you can also connect without an address:

```python
with Robot.connect() as robot:      # local use, no IP needed
    print(robot.version())
```

Without a robot, verify the installation and your code offline with `Robot.mock()` from [Mock Testing](../../usage/testing/mock.md):

```python
from fabot import Robot

robot = Robot.mock()
print(robot.connection.is_connected())     # True
print(robot.chassis.get_pose())
```

## Next steps

- [Connection & Robot Entry](../../usage/basics/connection.md): connection styles, timeouts, connection-state subscription
- [Your First Program (Python)](../quickstart.md): the smallest runnable example
- [Python API Reference](../../reference/python/index.md): the full API per capability
