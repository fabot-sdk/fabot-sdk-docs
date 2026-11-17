---
title: Example Index
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Example Index

Browse complete examples by capability. See [Usage](../../usage/index.md) for shared mechanisms and the [Python API](../../reference/python/index.md) for signatures.

Every example connects through the loopback address, `Robot.connect("127.0.0.1", 7557)`; swap in the robot's actual address when the control plane is on another host. When the SDK and the control plane run on the same host, you can also omit the address and write `Robot.connect()`, which discovers the endpoint from the default configuration — see [Connection & Robot Entry](../../usage/connection.md).

## Available examples

| Topic | Page |
|-------|------|
| E-stop and fault events | [E-Stop](robot.md) |
| Chassis navigation, pose moves and velocity servo | [Navigation](chassis.md) |
| Whole-body motion regime, homing and center of mass | [Motion](motion.md) |
| Single-arm joint / pose motion, wrench and compliance | [Arm Motion](arm.md) |
| Dual-arm coupling, servo and impedance drag | [Dual-Arm Motion](arms.md) |
| Torso joints and waist lift / forward reach | [Body](body.md) |
| Gripper opening with velocity and force limits | [Gripper](gripper.md) |
| Dexterous hand opening and tactile arrays | [Dexterous Hand](hand.md) |
| Head yaw / pitch and modes | [Head Motion](head.md) |
| Screen text, image and video | [Screen](screen.md) |
| Light strip mode, color and brightness | [Light](light.md) |
| Battery level and charging state | [Power](power.md) |
| Lift height, homing and servo | [Lift](lift.md) |
| Capture, calibration and image streams | [Camera](camera.md) |
| Audio capture, playback and wake word | [Voice](voice.md) |
| Joystick teleop sessions | [Teleop](teleop.md) |
| GPIO line acquire and level I/O | [IO Lines](io.md) |
| Frame lookups, pose transforms and deprojection | [Frames](frames.md) |
| Offline development | [Mock](mock.md) |
| Configuration conflict retry | [Configuration Retry](configuration.md) |
