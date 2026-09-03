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
| Robot Entry | — | [robot.md](robot.md) | 📝 To be written |
| IO | `io` | [io.md](io.md) | ✅ Published (example) |
| Screen | `screen` | [screen.md](screen.md) | ✅ Published (example) |
| Chassis | `chassis` | [chassis.md](chassis.md) | ✅ Published (example) |
| Motion | `motion` | [motion.md](motion.md) | 📝 To be written |
| Arm | `arm` | [arm.md](arm.md) | 📝 To be written |
| Arms | `arms` | [arms.md](arms.md) | 📝 To be written |
| Body | `body` | [body.md](body.md) | 📝 To be written |
| Gripper | `gripper` | [gripper.md](gripper.md) | 📝 To be written |
| Hand | `hand` | [hand.md](hand.md) | 📝 To be written |
| Head | `head` | [head.md](head.md) | 📝 To be written |
| Light | `light` | [light.md](light.md) | 📝 To be written |
| Power | `power` | [power.md](power.md) | 📝 To be written |
| Teleop | `teleop` | [teleop.md](teleop.md) | 📝 To be written |
| Voice | `voice` | [voice.md](voice.md) | 📝 To be written |
| Camera | `camera` | [camera.md](camera.md) | 📝 To be written |

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
