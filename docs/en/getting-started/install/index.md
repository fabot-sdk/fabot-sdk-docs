---
title: Installation Overview
status: draft
owner: fabot-core
updated: 2026-11-20
---

# Installation Overview

This chapter covers two things: installing the **SDK client** on an application machine, and installing and configuring the **robot system** on the robot host.

| Component | Runs on | What you install | Page |
|-----------|---------|------------------|------|
| SDK | Your application process | The `fabot-sdk` wheel, import name `fabot`, no ROS dependency | [Installing the Python SDK](./python.md) |
| Robot system | The robot host | The whole-robot release zip, providing the control plane, capabilities, skills and platform services | [Installing & Upgrading the Robot System](./robot-system.md) |

Most projects only install the SDK: the robot system ships with the robot, installed and configured at the factory. Installing the robot system yourself is for reinstalls, upgrades, building a test machine, or recovering a damaged system.

Release zips, SDK wheels and motion-control packages are listed by version and channel on the [software delivery portal](https://app.five-ages.ai/downloads#p=0eec0050-0430-4e36-acb4-627be7bdd6ed); the top-bar **Download** menu links to the same page.

## SDK quick start

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

## Robot system quick start

On the robot host, unpack the release zip of the same version, run the installer, then start and check it:

```console
$ sudo ./fabot-install.sh
$ fabot status
$ fabot doctor
$ fabot start
```

The release carries the matching SDK wheel, so on the robot host `fabot sdk install <env>` installs it into your environment without hunting for a package. The full install, upgrade, rollback and uninstall guide is [Installing & Upgrading the Robot System](./robot-system.md); parameters and first-boot setup are in [Configuring the Robot System](./robot-system-config.md).

## In this section

| Page | Contents |
|------|----------|
| [Requirements](./requirements.md) | Operating system, CPU architecture, Python version, and network conditions |
| [Installing the Python SDK](./python.md) | Installing the wheel, dependencies, and verifying the installation |
| [Installing & Upgrading the Robot System](./robot-system.md) | Release contents, install, upgrade and rollback, uninstall, directory layout |
| [Configuring the Robot System](./robot-system-config.md) | Configuration sources, ports and environment variables, first-boot setup, logs |
| [Version Compatibility](./compatibility.md) | How to check both versions, read a version number, and where compatibility stands today |

## Next steps

- [First program (Python)](../quickstart.md): run a minimal example from scratch
- [Connection and the Robot entry point](../../usage/basics/connection.md): connection methods, timeouts, and connection state subscription
- [Robot System Operations & Local Console](../../usage/testing/robot-system.md): the `fabot` command and the `fabot console` UI
- If the robot is unreachable or `wait_ready` times out, see [Troubleshooting](../../troubleshooting.md)
