---
title: Requirements
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Requirements

The fabot SDK is a pure Python package that runs embedded in your application process and **does not depend on ROS** (it links neither `rclcpp` nor `rclpy`). Any host that meets the software and network conditions below can act as an SDK client.

## Software environment

| Item | Requirement |
|------|-------------|
| Operating system | Ubuntu 24.04 (development and validation baseline) |
| CPU architecture | x86_64 (amd64) or AArch64 (arm64) |
| Python | ≥ 3.12 (`fabot-sdk` declares `requires-python >= 3.12`) |
| Package manager | `pip` (recommended together with `venv`) |

The SDK's runtime dependencies (`flatbuffers` / `eclipse-zenoh` / `PyYAML`) are installed automatically by `pip install`; `eclipse-zenoh` is pinned exactly to the same version family as the robot-side control plane. See [Compatibility](./compatibility.md).

:::note Other Linux distributions
The SDK may work on other distributions, but only Ubuntu 24.04 is a validated baseline. For production, follow the baseline or validate thoroughly yourself first.
:::

## Network requirements

The SDK talks to the robot-side control plane over Zenoh. The host running your application needs:

- Network reachability to the robot control-plane port (zenohd, **TCP 7557 by default**); firewalls must allow this port;
- Acceptable latency and packet loss between host and robot — control calls (Commands/Operations) are latency-tolerant, but high-frequency [data channels](../../usage/data/events-channels.md) such as camera frames or joint positions benefit from wired or stable LAN connectivity.

Specify the endpoint by IP and port:

```python
from fabot import Robot

# Explicit endpoint: loopback address plus the control-plane port (7557 by default)
robot = Robot.connect("127.0.0.1", 7557)
```

When the SDK and the robot control plane run on the **same host** (for example, developing on the robot itself), you do not need an address — `Robot.connect()` discovers the control plane from the default transport configuration:

```python
robot = Robot.connect()      # local use, no address
```

For connection methods and the `ClientConfig` / `ClientOptions` parameters, see [Connection and the Robot entry point](../../usage/basics/connection.md); for connectivity troubleshooting, see [Troubleshooting](../../troubleshooting.md).

## Offline development

No network is needed when no real robot is available: `Robot.mock()` provides a local mock implementation for development and integration testing. See [Mock testing](../../usage/testing/mock.md).

## Next steps

- [Install the Python SDK](./python.md): install the wheel and verify `import fabot`
- [Compatibility](./compatibility.md): how to check both versions, read a version number, and where compatibility stands today
- [Python tutorial](../quickstart.md): run your first program from scratch
