---
title: Migrating from 1.0.x to 1.1.0
status: draft
owner: fabot-core
updated: 2026-11-16
---

# Migrating from 1.0.x to 1.1.0

1.1.0 is a breaking release: the state model, fault structure, method names and config surface all changed. This page gives the old→new mapping, three worked conversions, and a checklist you can grep for. Version semantics and upgrade steps are in [Version Compatibility](../install/compatibility.md).

## 30-second check

If your code contains any of the following, it fails immediately on 1.1.0 with `AttributeError` / `TypeError`:

| Old | New |
|-----|-----|
| `robot.state().state` | `robot.state().mode` (`RobotMode`) |
| `robot.state().reasons` | `robot.state().root_causes` (`list[DiagnosticReason]`) |
| Per-name expanded fields from `robot.<slot>.faults()` | `Faults(revision, records: list[FaultState])` |
| `Catalogs.format_fault(record, capability_id=...)` | `Catalogs.format_fault(record)` |
| `get_joints()` / `move_joints()` | `get_joint()` / `move_joint()` |
| `move(...)` / `move_relative(...)` | `servo_twist(...)` / `move_pose_relative(...)` |
| `navigate_to_station(...)` / `list_stations()` | `move_station(...)` / `get_station()` |

## Symbol mapping

### State and faults

| 1.0.x | 1.1.0 | Difference |
|-------|-------|------------|
| `RobotState.state` (`RobotRunState`) | `RobotState.mode` (`RobotMode`) | Mode and health are now separate axes |
| — | `RobotState.health` (`HealthState`) | New; driven by faults and self-test |
| `RobotState.reasons: list[str]` | `RobotState.root_causes: list[DiagnosticReason]` | Strings became structured `code` / `source` |
| — | `RobotState.domains: list[DomainHealth]` | New per-domain aggregation |
| `is_running` / `is_idle` / `is_degraded` / `is_fault` / `is_estopped` | `is_running` / `is_idle` / `is_estopped` (mode) + `is_normal` / `is_degraded` / `is_fault` / `is_fatal` (health) | Convenience properties split per axis |
| Expanded fault fields | `Faults.revision` + `Faults.records: list[FaultState]` | Unified record list; each record has `code` / `source` / `state` / `severity` / `timestamp_us` |
| `format_fault(record, capability_id=...)` | `format_fault(record)` | The diagnostic code is already unique |

### Chassis

| 1.0.x | 1.1.0 |
|-------|-------|
| `move(vx=..., vy=..., vtheta=...)` | `servo_twist(vx=..., vy=..., vtheta=...)` |
| `move_relative(dx=, dy=, dtheta=)` | `move_pose_relative(Pose2d(...))` |
| `navigate_to_station(station_id=, mode=)` | `move_station(station_id, mode=...)` |
| `list_stations()` | `get_station()` |
| `relocalize(pose=...)` | `set_pose(x=, y=, theta=)` |
| `set_max_speed(linear=, angular=)` / `get_max_speed()` | `set_linear_velocity_limit()` / `set_angular_velocity_limit()` and the matching getters |
| `set_max_acceleration(...)` | `set_linear_acceleration_limit()` / `set_angular_acceleration_limit()` |
| `get_status()` | combine `get_pose()` / `get_twist()` / `get_stage()` / `get_odometer()` |
| `pause()` / `resume()` | `set_pause(paused=...)` |
| `stop()` | Kept as `stop()` |

### Arm / body / head / arms

| 1.0.x | 1.1.0 |
|-------|-------|
| `get_joints()` | `get_joint()` (returns `JointState`) |
| `move_joints(positions, wait=...)` | `move_joint(JointPositions(...), duration=, wait_timeout=)` |
| `smooth_move_pose(pose, wait=, frame_id=)` | `move_pose(pose, end_frame=, duration=, wait_timeout=)` |
| `direct_move_pose(pose)` | `servo_pose(pose)` (short cycle) |
| `set_enabled(enabled)` | `set_enable(enabled)` |
| `get_move_duration()` / `set_move_duration()` | Removed; use the `duration` argument of each `move_*` |
| `check_arrive()` | Removed; use `get_arrival_thresholds()` and the arrival-wait arguments |
| `lift_waist()` / `turn_waist()` / `move_waist()` | `move_waist(WaistPose(...))` / `move_waist_relative(...)` or `servo_waist_twist(...)` |

### Gripper / dexterous hand

| 1.0.x | 1.1.0 |
|-------|-------|
| `get_joints()` | `get_joint()` / `get_opening()` |
| `move_joints(...)` | `move_joint(...)` / `move_opening(target)` |
| `get_velocity()` / `set_velocity()` | `get_velocity_limit()` / `set_velocity_limit()` |
| `get_torque()` / `set_torque()` | `get_force_limit()` / `set_force_limit()` |

Gripper and hand opening values are normalised to `[0, 1]`.

### Motion

| 1.0.x | 1.1.0 |
|-------|-------|
| `get_fsm_state()` / `set_fsm_state()` / `reset_fsm()` | `get_mode()` / `set_mode(MotionMode)` |
| `get_joints()` / `stop()` | `get_joint()`; stop through `robot.estop` or the relevant capability's `stop()` |
| — | `get_wbc_state()` / `get_center_of_mass()` / `move_home()` / `move_preset()` |

### Camera

| 1.0.x | 1.1.0 |
|-------|-------|
| `capture()` / `capture_color()` / `capture_depth()` | `capture(streams=[...])` returning a `FrameSet` |
| `get_intrinsics()` | `get_calibration()` (`get_intrinsics` is an alias) |
| 5 channels | 12 channels (registered depth, left/right infrared, confidence, points, IMU, preview) |

### Voice / light / configuration

| 1.0.x | 1.1.0 |
|-------|-------|
| `voice.speak()` / `transcript()` / `intent()` | Semantic features moved to `robot.skills.voice_aiui`; the hardware side keeps `listen()` / `play_audio()` |
| `voice.set_speaker()` / `list_speakers()` / `set_speaking_rate()` | Moved to `skills.voice_aiui` |
| `light.set_mode(mode=...)` | `light.set_mode(mode, color=..., target_light=...)` |
| Old `LightStatus` fields | `period_ms` / `led_count` |
| Capability config spread over setters | `get_config()` / `set_config()` / `edit_config()` config domains |

## Worked conversions

### 1. State checks

```python
# 1.0.x
st = robot.state()
if st.is_degraded:
    print(st.reasons)
```

```python
# 1.1.0
st = robot.state()
if st.is_degraded:
    for cause in st.root_causes:
        print(hex(cause.code), cause.source)
```

### 2. Sending motion

```python
# 1.0.x
robot.left_arm.move_joints(positions, wait=True)
robot.chassis.move(vx=0.2, vy=0.0, vtheta=0.1)
```

```python
# 1.1.0
from fabot.types import JointPositions

robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0).wait(timeout=10.0)
robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
```

### 3. Showing faults

```python
# 1.0.x
print(catalogs.format_fault(record, capability_id="chassis"))

# 1.1.0
for record in robot.faults().chassis.records:
    print(hex(record.code), catalogs.format_fault(record))
```

## Migration checklist

Search your repository for these strings and work through the tables above:

```console
$ grep -rn "\.state\.state\|\.reasons\b\|get_joints\|move_joints\|set_enabled\|smooth_move_pose\|direct_move_pose\|navigate_to_station\|list_stations\|get_fsm_state\|set_fsm_state\|reset_fsm\|capture_color\|capture_depth\|set_max_speed\|set_max_acceleration\|format_fault(.*capability_id" .
```

Then confirm three things:

1. Both `fabot.__version__` and `robot.version()` report 1.1.0 (see [Version Compatibility](../install/compatibility.md));
2. No `except` branch depends on `message` text — branch on `code` / category instead (see [Error Handling](errors.md));
3. Custom UIs read the new state and fault structures.

## Compatibility boundary

- The wire protocol is still `fabot/v1`, but the Python API is not backward compatible; 1.0.x application code must be migrated as described here.
- 1.0.1 and 1.0.0 share the same public API — the difference was a robot-side runtime fix — so migration steps are identical from either.
- After migrating, re-run [Your First Program (Python)](../tutorials/python.md) and [Mock Testing](mock.md) to confirm connection, state and error paths.
