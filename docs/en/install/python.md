---
title: Install the Python SDK
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Install the Python SDK

The product Python SDK for fabot robots ships as the `fabot-sdk` package; the import name after installation is `fabot`. Before installing, make sure the [Requirements](requirements.md) are met (Python ≥ 3.12).

## Install

The SDK is distributed as a wheel with the release artifacts. Once you have the wheel file, install it locally:

```console
$ pip install /path/to/fabot_sdk-<version>.whl
```

If your environment is configured with a package index that carries `fabot-sdk`, you can also install it by name:

```console
$ pip install fabot-sdk
```

Installing into a virtual environment is recommended to keep it isolated from the system Python.

## Dependencies

The following dependencies are installed automatically by pip; no manual setup is needed:

| Dependency | Version constraint | Purpose |
|------------|--------------------|---------|
| `flatbuffers` | Exactly pinned (`==23.5.26`) | Serialization format of the data channels |
| `eclipse-zenoh` | Exactly pinned (`==1.6.2`) | Communication with the robot control plane; must stay in the same version family as the robot side |
| `PyYAML` | Not pinned | Configuration file I/O (`from_yaml` / `to_yaml`) |

A mismatched `eclipse-zenoh` version against the robot side causes connection failures; see [Compatibility](compatibility.md) when upgrading the SDK.

## Verify the installation

```python
import fabot

print(fabot.__version__)   # installed SDK version
```

Verify further against a real robot (use the address and port of your actual deployment):

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print("SDK version:", robot.sdk_version)
    print("Platform version:", robot.version())
```

Without a robot, use `Robot.mock()` from [Mock testing](../usage/mock.md) to verify the installation and develop code offline.

## Next steps

- [Connection and the Robot entry point](../usage/connection.md): connection methods, timeouts, and connection state subscription
- [First program (Python)](../tutorials/python.md): a minimal runnable example
- [API reference (Python)](../reference/python/index.md): full API of each capability module
