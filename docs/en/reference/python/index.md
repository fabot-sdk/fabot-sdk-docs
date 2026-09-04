---
title: Capability Interfaces Overview
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Capability Interfaces Overview

The SDK ships typed proxies for 15 built-in capability modules. Capabilities are accessed via the `Robot` slot attributes (`robot.<slot>`); the slot-to-module mapping is covered in [Robot Entry](robot.md).

## Module List

| Module | Capability id | Doc | Status |
|--------|---------------|-----|--------|
| Robot Entry | — | [robot.md](robot.md) | ✅ Complete (draft) |
| Catalogs (not a capability) | — | [catalogs.md](catalogs.md) | ✅ Complete (draft) |
| IO | `io` | [io.md](io.md) | ✅ Complete (draft) |
| Screen | `screen` | [screen.md](screen.md) | ✅ Complete (draft) |
| Chassis | `chassis` | [chassis.md](chassis.md) | ✅ Complete (draft) |
| Motion | `motion` | [motion.md](motion.md) | ✅ Complete (draft) |
| Arm | `arm` | [arm.md](arm.md) | ✅ Complete (draft, exemplar) |
| Arms | `arms` | [arms.md](arms.md) | ✅ Complete (draft) |
| Body | `body` | [body.md](body.md) | ✅ Complete (draft) |
| Gripper | `gripper` | [gripper.md](gripper.md) | ✅ Complete (draft) |
| Hand | `hand` | [hand.md](hand.md) | ✅ Complete (draft) |
| Head | `head` | [head.md](head.md) | ✅ Complete (draft) |
| Light | `light` | [light.md](light.md) | ✅ Complete (draft) |
| Power | `power` | [power.md](power.md) | ✅ Complete (draft) |
| Teleop | `teleop` | [teleop.md](teleop.md) | ✅ Complete (draft) |
| Voice | `voice` | [voice.md](voice.md) | ✅ Complete (draft) |
| Camera | `camera` | [camera.md](camera.md) | ✅ Complete (draft) |

## Common Proxy Skeleton

Every capability proxy has the following common members (module docs only list capability-specific parts):

| Member | Description |
|--------|-------------|
| `slot_id` | Slot id |
| `has_adapter` | Whether an adapter is bound |
| `as_adapter(...)` | Cast to the typed view of a concrete adapter (see [Configuration](../../usage/configuration.md)) |
| `events` | Capability event subscription entry (see [Events & Data Channels](../../usage/events-channels.md)) |
| `health()` | Health state `SlotHealth` |
| `lifecycle()` | Lifecycle snapshot `CapabilityLifecycleSnapshot` |
| `faults()` | Current fault list |

## Module Doc Structure

Each module doc is organized in eight sections: Module Overview → API Overview → Methods → Channels → Events → Faults → Status → Resources.
