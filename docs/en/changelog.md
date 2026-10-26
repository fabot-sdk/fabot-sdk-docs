---
title: Changelog
status: draft
owner: fabot-core
updated: 2026-10-26
---

# Changelog

User-visible changes listed in reverse version order. Each release pairs with the robot platform of the same version number; see [Version Compatibility](install/compatibility.md) for version semantics and the upgrade steps.

The version dropdown in the top bar switches the documentation for each version; the changelog of a historical version only lists entries up to that version.

## 1.0.2

2026-10-23 · Recommended

### Added

- Camera: new `get_intrinsics()`, returning the color and depth intrinsics (K and distortion, no extrinsics) — see [Camera](reference/python/camera.md#get_intrinsics).
- Slots: new `robot.waist_camera`; camera slots go from 4 to 5 and total robot slots from 22 to 23 — see [Robot Entry Point](reference/python/robot.md#slots).
- Services: new `robot.services.orbbec_sdk_ros2` (Orbbec ROS camera backend, not started by default) — see [Platform Services](usage/services.md).

### Compatibility

- No breaking changes: the `fabot/v1` interfaces stay compatible, so application code written for 1.0.0 / 1.0.1 keeps working.

## 1.0.1

2026-09-21 · Runtime fix only

- No changes to the public SDK interfaces; the robot side isolates its runtime libraries so they no longer conflict with other versions of the communication library on the system.
- Upgrading the SDK to 1.0.1 is still recommended so both ends share the same version — see [Version Compatibility](install/compatibility.md).

## 1.0.0

2026-09-17 · First stable release

- First published `fabot-sdk` (import name `fabot`): 15 capability modules, 22 slots, `fabot/v1` interfaces, Python ≥ 3.12 required.
- Runtime dependencies are pinned to exact versions; see the dependency table in [Installing the Python SDK](install/python.md).
- Starting from scratch? Read [Your First Program (Python)](tutorials/python.md) first.
