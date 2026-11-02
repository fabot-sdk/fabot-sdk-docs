---
title: Changelog
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Changelog

User-visible changes listed in reverse version order. Each release pairs with the robot platform of the same version number; see [Version Compatibility](install/compatibility.md) for version semantics and upgrade steps.

The version dropdown in the top bar switches the documentation for each version; the changelog of a historical version only lists entries up to that version.

## 1.1.0

2026-11-02 · Current development release

### Added

- Logs: `robot.logs.history()` for persisted history (`limit` / `slot` / `unit` filters), `robot.logs.emit()` / `debug` / `info` / `warn` / `error` for custom records, and `robot.logs.freeze()` to freeze the flight recorder — see [Logs, Metrics & Observability](usage/observability.md).
- Metrics: the new `robot.metrics` entry — `subscribe()`, `snapshot()` for the SDK's own counters, `records()` to project them into `MetricRecord`s, and `gauge` / `counter` / `histogram` for custom metrics.
- Frames: `robot.frames` (a `FrameSystem`) with `lookup` / `transform` / `transform_points` / `lookup_full` / `scoped_frame`, plus `Transform3d` algebra and pixel geometry helpers, with no ROS dependency — see [Frames & Transforms](usage/frames.md).
- Events: `robot.events.emit()` publishes custom events; `robot.events.subscribe()` accepts `name` / `slot` filters.
- Skills: new `robot.skills.camera_sync` (multi-camera time pairing) and `robot.skills.voice_aiui` (transcripts, intents and synthesized speech) — see [Skills & Extensions](usage/skills.md).
- Telemetry: `robot.ping()` probes runtime round-trip latency, and every slot proxy exposes the same method.

### Changed

- State model: `RobotState` splits into two independent axes, `mode` (`RobotMode`) and `health` (`HealthState`), adds `root_causes` (`DiagnosticReason`) and `domains` (`DomainHealth`), and provides `is_normal` / `is_fatal` and friends. The old `.state` / `.reasons` fields no longer apply.
- Faults: every fault bag is now `Faults(revision, records: list[FaultState])`, where a `FaultState` is `code` (diagnostic code) / `source` / `state` / `severity` / `timestamp_us`, replacing the per-name fields.
- Errors: `FabotError` is identified by a 32-bit diagnostic code; `category` is only a local construction tag used to pick a subclass and is not transmitted. `retryable` is derived from the subclass (`Timeout` / `ResourceConflict` / `TransportError` / `Unavailable`).
- Catalogs: lookups are keyed by diagnostic code `0xXXXXXXXX`, `format_metric` is new, and `format_fault` no longer takes `capability_id`.
- Camera: `capture()` returns a full `FrameSet` (color / depth / registered depth / infrared / confidence); `get_calibration()` (intrinsics, extrinsics, baseline, depth scale), `get_imaging()` / `set_imaging()`, `trigger()` and `perf_frame_shm()` are new; channels grow from 5 to 12. Cameras now start streaming automatically once active.
- Chassis: `servo_twist` / `move_pose` / `move_pose_relative` / `move_station` replace `move` / `move_relative` / `navigate_to_station` / `stop` / `pause` / `resume`; `get_station()` replaces `list_stations()`; `set_pose` (relocalization), `get_twist`, `get_stage`, parking / lock / pause accessors and velocity / acceleration limits are new.
- Arm / arms / body / head: motion is unified as `move_joint` / `move_joint_path` / `move_pose` / `move_pose_relative` / `move_pose_path` / `move_pose_arc_by_points` / `move_pose_arc_by_center`, with `servo_pose` / `servo_twist` for short-cycle servoing, plus arrival thresholds and velocity / acceleration limits.
- Motion: `get_mode` / `set_mode` (`MotionMode`) replace the FSM interface; `get_wbc_state`, `get_center_of_mass`, `move_home`, `move_preset` and whole-body joint / pose goals are new.
- Gripper / hand: opening is normalized to [0, 1]; velocity and force limits are persistent settings; the hand gains five-finger tactile arrays and a `tactile()` channel.
- Voice: the hardware capability focuses on capture and playback (`listen` / `play_audio` / `begin_playback` / `write_audio` plus three channels), while semantic features moved to the `voice_aiui` skill.
- Light: `set_mode` gains `target_light`, and `LightStatus` fields become `period_ms` / `led_count`.
- Configuration: capability and skill config domains use `get_config()` / `set_config()` / `edit_config()` while robot bindings use `robot.configuration`; `edit_config()` submits only changed domains.

### Compatibility

- **Breaking changes**: the state model, fault shape, parameter names (`positions` → `get_joint().positions`, `wait` → `duration` / `wait_timeout`, …) and most motion method names differ from 1.0.x. Application code written for 1.0.x needs to migrate method by method against the reference pages.
- The wire protocol is still `fabot/v1`, and SDK and platform still pair on identical version numbers; upgrade both ends before adapting code.

## 1.0.2

2026-10-23 · Milestone release

### Added

- Camera: new `get_intrinsics()`, returning the color and depth intrinsics (K and distortion, no extrinsics) — see [Camera](reference/python/camera.md).
- Slots: new `robot.waist_camera`; camera slots go from 4 to 5 and total robot slots from 22 to 23 — see [Robot Entry](reference/python/robot.md#slots).
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
