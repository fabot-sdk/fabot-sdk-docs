---
title: Requirements
status: draft
owner: fabot-core
updated: 2026-09-04
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

The SDK's runtime dependencies (`flatbuffers` / `eclipse-zenoh` / `PyYAML`) are installed automatically by `pip install`; `eclipse-zenoh` is pinned exactly to the same version family as the robot-side control plane. See [Compatibility](compatibility.md).

:::note Other Linux distributions
The SDK may work on other distributions, but only Ubuntu 24.04 is a validated baseline. For production, follow the baseline or validate thoroughly yourself first.
:::

## Network requirements

The SDK talks to the robot-side control plane over Zenoh. The host running your application needs:

- Network reachability to the robot control-plane port (zenohd, **TCP 7557 by default**); firewalls must allow this port;
- Acceptable latency and packet loss between host and robot — control calls (Commands/Operations) are latency-tolerant, but high-frequency [data channels](../usage/events-channels.md) such as camera frames or joint positions benefit from wired or stable LAN connectivity.

Specify the endpoint by IP and port when connecting:

```python
from fabot import Robot

robot = Robot.connect("192.168.1.10", 7557)
```

For connection methods and the `ClientConfig` / `ClientOptions` parameters, see [Connection and the Robot entry point](../usage/connection.md); for connectivity troubleshooting, see [Troubleshooting](../troubleshooting.md).

## Offline development

No network is needed when no real robot is available: `Robot.mock()` provides a local mock implementation for development and integration testing. See [Mock testing](../usage/mock.md).

## Next steps

- [Install the Python SDK](python.md): install the wheel and verify `import fabot`
- [Compatibility](compatibility.md): how SDK versions map to robot platform versions
- [Python tutorial](../tutorials/python.md): run your first program from scratch
