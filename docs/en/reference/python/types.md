---
title: Shared Types & Enums
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Shared Types & Enums

The data types reused across capability requests and responses live in `fabot.types` (importable from `fabot` directly). They are FlatBuffers object-API dataclasses whose fields use snake_case, while the original camelCase aliases (`frame_id` ↔ `frameId`) are also accepted.

## Geometry and motion

| Type | Fields | Description |
|------|--------|-------------|
| `Pose3d` | `x` / `y` / `z` (m), `qx` / `qy` / `qz` / `qw`, `frame_id`, `stamp_ns` | 3D pose; an empty `frame_id` in a command means the slot default base, `stamp_ns=0` means latest |
| `Pose2d` | `x` / `y` (m), `theta` (rad), `frame_id`, `stamp_ns` | Planar pose |
| `PoseQuery` | `frame_id` / `end_frame` | Reference frame and controlled end for pose queries |
| `Point3d` | `x` / `y` / `z` (m) | 3D point |
| `Quaterniond` | `qx` / `qy` / `qz` / `qw` | Quaternion |
| `Vector2d` | `x` / `y` | 2D vector |
| `Vector3d` | `x` / `y` / `z` | 3D vector |
| `Twist2d` | `vx` / `vy` (m/s), `vtheta` (rad/s) | Planar velocity |
| `Twist3d` | `linear` / `angular` (`Vector3d`) | Spatial velocity in m/s and rad/s |
| `Wrench3d` | `force` / `torque` (`Vector3d`) | Wrench in N and N·m |
| `Transform3d` | `target_frame` / `source_frame` / `tx` / `ty` / `tz` / `qx`…`qw` / `stamp_ns` | Rigid transform `^target T_source` |
| `PoseArcByPoints` | `via` / `end` | Three-point arc (start is the current pose) |
| `PoseArcByCenter` | `center` / `axis` / `angle` / `end_orientation` | Center arc |

`Pose3d` also carries conveniences: `position` / `quaternion` / `euler_rpy` / `to_matrix()` / `to_transform()` plus `from_euler()` / `from_matrix()` constructors. Full `Transform3d` algebra is in [Frames & Transforms](../../usage/frames.md).

## Joints and containers

| Type | Fields | Description |
|------|--------|-------------|
| `JointPositions` | `positions: list[float]` | Joint angles in radians |
| `JointState` | `positions` / `velocities` / `efforts` / `stamp_ns` | One joint sample; the three arrays share a length |
| `Doubles` | `values: list[float]` | Scalar list; **an absent table differs from an empty list** |
| `Rgb8` | `r` / `g` / `b` | Color, each 0–255 |
| `Empty` | — | Empty request |

## Results and progress

| Type | Fields | Description |
|------|--------|-------------|
| `Outcome` | `success: bool`, `status_message: str` | Result of a Command or Operation |
| `Progress` | `progress: float` (0–1), `status_message: str` | Operation progress feedback |

## Scalars and bytes

`Bool` / `Int32` / `Int64` / `UInt32` / `UInt64` / `Float32` / `Float64` / `String` / `Bytes` are single-field wrapper tables holding `value`. `KeyValue` is a `key` / `value` string pair. `SharedMemoryHandle` describes a shared-memory region (`region` / `generation` / `offset` / `length` / `capacity` / `schema`).

:::note Why wrapper tables
The wire format requires every root type to be a table, so a single scalar needs a wrapper. Product-level methods usually take plain Python scalars (for example `set_volume(0.7)`); wrappers appear in fields and response objects.
:::

## Core-layer types

`fabot.core` also exports transport-level types you mostly touch indirectly:

| Type | Description |
|------|-------------|
| `RobotState` / `RobotMode` / `HealthState` / `LifecycleState` | Robot state and health, see [Status, Faults & Lifecycle](../../usage/status-faults.md) |
| `OperationState` / `OperationSnapshot` | Operation state and snapshots |
| `LogLevel` / `LogRecord` / `LogIdentity` | Logs, see [Logs, Metrics & Observability](../../usage/observability.md) |
| `MetricType` / `MetricRecord` / `MetricValue` / `MetricIdentity` / `SdkMetricSnapshot` | Metrics |
| `FreezeRequest` / `PingReport` / `PingSample` | Freezing and round-trip probing |
| `QosProfile` / `SubscribeOptions` / `ChannelDescriptor` / `ChannelFrame` | Channel subscription |
| `ClientConfig` / `ClientOptions` / `CallOptions` | Client options, see [Connection & Robot Entry](../../usage/connection.md) |
| `ConfigState` / `SlotRuntime` / `ServiceState` | Config and service state |

## Capability-specific types

Each capability defines its own request / response tables under `fabot.capabilities.<cap>` (such as `fabot.capabilities.arm.PoseMove` or `fabot.capabilities.camera.CaptureOptions`); field descriptions are in the matching reference page.

## Enum index

| Enum | Values | Page |
|------|--------|------|
| `PinDirection` | `INPUT` / `OUTPUT` | [IO](io.md) |
| `LightMode` | `OFF` / `SOLID` / `BLINK` / `BREATHE` / `RAINBOW` / `CHASE` | [Light](light.md) |
| `ChassisMode` / `NavigationMode` / `ChassisStage` | see page | [Chassis](chassis.md) |
| `ArmsMode` / `ImpedanceMode` | `INDEPENDENT` / `COUPLED`, `DISABLED` / `LOW` / `HIGH` | [Arms](arms.md) |
| `BodyMode` / `HeadMode` | see pages | [Body](body.md) / [Head](head.md) |
| `MotionMode` / `HomePose` / `SupportStatus` | see page | [Motion](motion.md) |
| `StreamKind` / `PixelFormat` / `RegistrationMode` / `FrameTransportHint` | see page | [Camera](camera.md) |
| `CaptureEnd` / `PlaybackState` | see page | [Voice](voice.md) |

Enum values are integer constants defined in the capability `types` module; some also expose name constants, and they compare directly against integers.
