---
title: Capability Interfaces Overview
status: draft
owner: fabot-core
updated: 2026-11-16
---

# Capability Interfaces Overview

The SDK ships typed proxies for 16 capability modules. You reach capabilities through the slot properties on `Robot` (`robot.<slot>`); the slot-to-module mapping is in [Robot Entry](robot.md).

## Module list

| Module | Capability id | Documentation |
|--------|--------------|---------------|
| Robot entry | — | [robot.md](robot.md) |
| Catalogs (not a capability) | — | [catalogs.md](catalogs.md) |
| Frame API (not a capability) | — | [frames.md](frames.md) |
| Common types and enums (not a capability) | — | [types.md](types.md) |
| IO | `io` | [io.md](io.md) |
| Screen | `screen` | [screen.md](screen.md) |
| Chassis | `chassis` | [chassis.md](chassis.md) |
| Motion | `motion` | [motion.md](motion.md) |
| Arm | `arm` | [arm.md](arm.md) |
| Arms | `arms` | [arms.md](arms.md) |
| Body | `body` | [body.md](body.md) |
| Gripper | `gripper` | [gripper.md](gripper.md) |
| Hand | `hand` | [hand.md](hand.md) |
| Head | `head` | [head.md](head.md) |
| Light | `light` | [light.md](light.md) |
| Power | `power` | [power.md](power.md) |
| Teleop | `teleop` | [teleop.md](teleop.md) |
| Voice | `voice` | [voice.md](voice.md) |
| Lift | `lift` | [lift.md](lift.md) |
| Camera | `camera` | [camera.md](camera.md) |

Skill interfaces (`robot.skills`) are documented in [Skills & Extensions](../../usage/skills.md).

## Common proxy surface

Every capability proxy has the following members, so module pages only document what is capability-specific:

| Member | Description |
|--------|-------------|
| `slot_id` | Slot id |
| `handle` | Slot handle `SlotHandle` (resolved lazily) |
| `events` | Capability event entry (`fault_changed` / `lifecycle_changed`, plus capability-specific events) |
| `has_adapter` | Whether an adapter is bound |
| `as_adapter(...)` | Typed view onto a concrete adapter |
| `health()` | Health snapshot `SlotHealth` |
| `lifecycle()` | Lifecycle snapshot `CapabilityLifecycleSnapshot` |
| `faults()` | Current fault bag `Faults` |
| `ping(...)` | Runtime round-trip probe, returns `PingReport` |
| `get_config()` / `set_config(cfg)` / `edit_config()` | Config-domain access for that slot, see [Configuration](../../usage/configuration.md) |

Some proxies also expose identity and frame properties: arms have `side` / `base_frame` / `eef_frame` / `tcp_frame` / `ft_frame`; grippers and hands have `side`; the chassis has `base_frame` / `map_frame` / `odom_frame`; body, head and arms have `base_frame` (head also has `eef_frame`); cameras have `color_frame` / `depth_frame` / `imu_frame`; power has `id`.

## Module page structure

Every module page follows the same eight sections: module overview → API overview → methods → channels → events → exceptions → status → resources.

- **API overview** lists every Command, Operation, channel and event with its type and purpose.
- **Methods** give a signature block, a parameter table and a return-field table per method; signatures and defaults come straight from the SDK type declarations.
- **Channels** give open parameters and frame payload fields per channel.
- **Exceptions** cover the shared `Faults` / `FaultState` structure.
- **Status** says whether the module has a `status()` bag and documents the common `health()` / `lifecycle()`.
- **Resources** state which resources the module's Operations occupy and whether they queue or reject.

## Documented SDK baseline

This site documents **fabot-sdk 1.1.0-alpha.1**. When a page and your installed wheel disagree, the installed package wins: check `fabot.__version__` and `robot.sdk_version`, then consult [Version Compatibility](../../install/compatibility.md).
