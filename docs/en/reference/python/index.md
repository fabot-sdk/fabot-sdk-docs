---
title: Reference Overview
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Reference Overview

This reference covers every public Python interface in the SDK, across three kinds of entry:

| Entry | Shape | Count | Reached through |
|-------|-------|-------|-----------------|
| Capability | A domain feature unit on the robot, installed on a slot | 16 modules / 24 slots | `robot.<slot>` |
| Skill | A higher-level semantic unit composed over several capabilities | 2 | `robot.skills.<name>` |
| Platform service | A long-running process on the robot, exposing only lifecycle and config | 2 services + 1 runtime environment | `robot.services.<name>` / `robot.environments.ros2` |

Plus robot-wide entries that occupy no slot: `Robot` itself (connection, state, e-stop, logs, metrics, events, frames, robot config), and two client-side helpers — the `Catalogs` text catalog and the frame API.

## Find the page for the task

| What you want to do | Go to |
|---------------------|-------|
| Connect, set timeouts, wait for slots | [Robot Entry](./robot.md) |
| Look up a capability's methods, parameter defaults and return fields | The module page in the tables below |
| Tell Commands, Operations, channels and events apart | [Commands & Operations](../../usage/basics/commands-operations.md), [Events & Data Channels](../../usage/data/events-channels.md) |
| Capture one instant across several cameras | [Multi-camera Sync CameraSync](./skills/camera_sync.md) |
| Transcribe speech, recognize intents, synthesize speech | [Voice Semantics VoiceAiui](./skills/voice_aiui.md) |
| Start / stop the ROS 2 service, use graph access and actions | [ROS 2 Service Ros2](./services/ros2.md) |
| Change observability quota and retention | [Observability Collector ObsCollector](./services/obs_collector.md) |
| Change the ROS 2 domain id or router ownership | [Runtime Environment Ros2Environment](./services/ros2_environment.md) |
| Turn a diagnostic code into readable text | [Diagnostic Code Reference](./error-codes.md), [Catalogs](./catalogs.md) |
| Do frame math or read extrinsics | [Frame API](./frames.md), [Frames & Transforms](../../usage/data/frames.md) |
| Build a `Pose3d` / `Twist3d` / `JointPositions` request | [Common Types & Enums](./types.md) |

## Capability module list

Capabilities are reached through slot properties on `robot`. One capability can be installed in several slots (left and right arm, two power rails, five cameras), and each slot is an independent instance of the same API. `robot.slots` is a dict keyed by slot id whose values are the very same objects as the slot properties.

### Motion and actuation

| Module | Slots | Capability id | Domain | Covers |
|--------|-------|---------------|--------|--------|
| [Motion](./motion.md) | `robot.motion` | `motion` | `motion` | Whole-body regime, joint / pose goals, homing and presets |
| [Chassis](./chassis.md) | `robot.chassis` | `chassis` | `motion` | Velocity servo, map navigation, station navigation, parking / locking |
| [Arm](./arm.md) | `robot.left_arm` / `robot.right_arm` | `arm` | `motion` | Joint motion, end-effector poses, wrench and compliance |
| [Arms](./arms.md) | `robot.arms` | `arms` | `motion` | Dual-arm coupling, impedance drag and synchronized paths |
| [Body](./body.md) | `robot.body` | `body` | `motion` | Body joints, waist pose and velocity servo |
| [Head](./head.md) | `robot.head` | `head` | `motion` | Head yaw / pitch, pose motion and constraint mode |
| [Gripper](./gripper.md) | `robot.left_gripper` / `robot.right_gripper` | `gripper` | `motion` | Opening, velocity / force limits and servo |
| [Hand](./hand.md) | `robot.left_hand` / `robot.right_hand` | `hand` | `motion` | Finger opening, joints and tactile arrays |
| [Teleop](./teleop.md) | `robot.teleop` | `teleop` | `motion` | Joystick teleop session start and stop |
| [Lift](./lift.md) | `robot.lift` | `lift` | `motion` | Height read/write, absolute and relative moves, homing and servo |

### Perception

| Module | Slots | Capability id | Domain | Covers |
|--------|-------|---------------|--------|--------|
| [Camera](./camera.md) | `robot.head_camera` / `robot.chest_camera` / `robot.waist_camera` / `robot.left_wrist_camera` / `robot.right_wrist_camera` | `camera` | `perception` | Capture, calibration, imaging control and 12 streams |

### Interaction and hardware

| Module | Slots | Capability id | Domain | Covers |
|--------|-------|---------------|--------|--------|
| [Voice](./voice.md) | `robot.voice` | `voice` | `interaction` | Microphone capture, speaker playback, volume and wake word |
| [Screen](./screen.md) | `robot.screen` | `screen` | `screen` | Text, image and video display |
| [Light](./light.md) | `robot.light` | `light` | `light` | Strip mode, colour, brightness and animation period |
| [Power](./power.md) | `robot.power_1` / `robot.power_2` | `power` | `power` | Energy, voltage, current, temperature and charging |
| [IO](./io.md) | `robot.io` | `io` | `io` | GPIO line acquire, release, level I/O and chip inventory |

## Skills and platform services

These entries sit outside the slot system. They look like capability proxies but are not resolved through slot lookup. Each has an overview page plus one chapter per entity.

| Entry | Entities | Chapters |
|-------|----------|----------|
| Skills | `camera_sync` (multi-camera sync) / `voice_aiui` (voice semantics) | [Skills Overview](./skills/index.md) |
| Platform services | `ros2` (ROS 2 graph access) / `obs_collector` (observability collector) | [Platform Services Overview](./services/index.md) |
| Runtime environment | `ros2` (domain id / loopback isolation / router) | [Runtime Environment Ros2Environment](./services/ros2_environment.md) |

Whether a skill is deployed comes from the robot configuration; read `is_available` before calling anything else, see [Skills & Extensions](../../usage/configuration/skills.md). Service management conventions are in [Platform Services](../../usage/configuration/services.md).

## Common proxy surface

Every capability proxy has the following members, so module pages only document what is capability-specific. Skill proxies are a subset (no capability-adapter semantics behind `as_adapter`, but they do read and write their own config domains).

**Identity and handle**

| Member | Description |
|--------|-------------|
| `slot_id` | Slot id, such as `"left_arm"` |
| `handle` | Slot handle `SlotHandle`, resolved lazily; accessing it while unbound raises |

**Health and lifecycle**

| Member | Description |
|--------|-------------|
| `health()` | Health snapshot `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed`) |
| `lifecycle()` | Lifecycle snapshot `CapabilityLifecycleSnapshot` |
| `faults()` | Current fault bag `Faults` (`revision` plus `records`) |
| `self_check(...)` | Run this slot's self-check on demand, returns `SelfCheckReport`; writes the fault latch, see [Self-check](../../usage/diagnostics/self-check.md) |
| `ping(...)` | Runtime round-trip probe `PingReport` |

**Events**

| Member | Description |
|--------|-------------|
| `events.fault_changed` | Fault set changed; payload is `Faults` |
| `events.lifecycle_changed` | Lifecycle changed; payload is `CapabilityLifecycleSnapshot` |
| `events.subscribe(cb)` | Wildcard subscription to every event on this slot |

Some capabilities add their own events (such as `camera_session_changed` on `camera` or `lift_state_changed` on `lift`); see each module page.

**Config and adapters**

| Member | Description |
|--------|-------------|
| `has_adapter` | Whether an adapter is bound |
| `as_adapter(type)` | Typed view onto a concrete adapter, for adapter-private extensions |
| `get_config()` | Read this slot's config domains as a typed dataclass |
| `set_config(cfg)` | CAS commit; raises `ConfigurationConflict` |
| `edit_config()` | Context manager committing only changed domains on exit |

The rules are in [Configuration](../../usage/configuration/configuration.md). Some proxies also expose identity and frame properties: arms have `side` / `base_frame` / `eef_frame` / `tcp_frame` / `ft_frame`; grippers and hands have `side`; the chassis has `base_frame` / `map_frame` / `odom_frame`; body, head and arms have `base_frame` (head also has `eef_frame`); cameras have `color_frame` / `depth_frame` / `imu_frame`; power has `id`.

## How to read a module page

Every module page follows the same eight sections: module overview → API overview → methods → channels → events → exceptions → status → resources.

- **Module overview** gives the capability id, slots and domain, plus a one-line positioning statement and the key units.
- **API overview** is the index: every Command / Operation / channel / event with its default timeout, so you can locate a name first.
- **Methods** give a signature block, a parameter table and a return-field table per method. Signatures and defaults come straight from the SDK type declarations and are the **authoritative** source — trust the signature block for defaults and keyword-only rules.
- **Channels** give open parameters and frame payload fields per channel.
- **Events** list the capability's own events plus the two common ones.
- **Exceptions** cover the shared `Faults` / `FaultState` structure; some modules add common fault codes.
- **Status** says whether the module has a `status()` bag and documents its fields, plus the common `health()` / `lifecycle()`.
- **Resources** state which resources the module's Operations occupy and whether they queue (`queue`) or reject (`reject`).

Field names are always snake_case (`frame_id`, `group_id`); the generated types also accept the original camelCase alias (`frameId`), and the two are equivalent.

## Documented SDK baseline

This site documents **fabot-sdk 1.1.0-beta.2**. When a page and your installed wheel disagree, the installed package wins: check `fabot.__version__` and `robot.sdk_version`, then consult [Version Compatibility](../../getting-started/install/compatibility.md).

After adding or changing an interface, run `npm run check:api` to verify that every `robot.*` call name in the docs really exists on `Robot.mock()`.
