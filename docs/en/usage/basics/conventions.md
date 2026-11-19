---
title: Time Bases and Coordinate Conventions
status: draft
owner: fabot-core
updated: 2026-11-16
---

# Time Bases and Coordinate Conventions

Whether poses, point clouds and sensor fusion line up across capabilities depends on two things: all timestamps sharing one time base, and a consistent axis and rotation convention. This page collects the conventions that are otherwise scattered across pages.

## Units

| Quantity | Unit | Notes |
|----------|------|-------|
| Length, translation | metres (m) | All `x` / `y` / `z`, `translation`, lift height |
| Angles, joint angles | radians | Including `theta`, `yaw`, joint positions; Euler APIs accept `degrees=True` |
| Linear velocity | m/s | `vx` / `vy` / `linear` |
| Angular velocity | rad/s | `vtheta` / `angular` |
| Force, torque | N, N·m | `Wrench3d.force` / `.torque` |
| Timestamps | nanoseconds (`*_ns`), microseconds (`*_us`) | The suffix is the unit |
| Opening, normalised values | dimensionless 0–1 | Gripper, dexterous hand |

:::note Duration parameters are seconds
`duration` / `wait_timeout` / `timeout` (Operations and `wait_for_transform`) are in **seconds**; `timeout_ms` and `poll_timeout_ms` are in **milliseconds**. When the same concept appears in several places, the suffix decides.
:::

## Poses and transforms

- Poses use `Pose3d`: `x` / `y` / `z` (metres) plus the quaternion `qx` / `qy` / `qz` / `qw`, with `frame_id` and `stamp_ns`.
- Quaternion order is **`(qx, qy, qz, qw)`** — scalar last. Constructors normalise it; a near-zero norm raises `InvalidQuaternionError`.
- Planar poses use `Pose2d`: `x` / `y` (metres) plus `theta` (radians).
- Transforms use `Transform3d`, representing `^target T_source`, satisfying `p_target = R · p_source + t`. Do the algebra with `fabot.frames.Transform3d` (see [Frames & Transforms](../data/frames.md)), not the `fabot.types.Transform3d` wire table.

The meaning of an empty `frame_id` depends on context:

| Where | Empty string means |
|-------|-------------------|
| Command target (for example `move_pose`'s `target.frame_id`) | That slot's default base frame |
| Query parameter (for example `get_pose(frame_id="")`) | The slot's default base frame |
| Channel feedback (for example `pose()` frames) | The publisher's frame name, preserved verbatim |

:::warning `stamp_ns = 0` does not mean "now"
`0` means **take the latest sample / skip interpolation**, not "query the current instant". To sample a historical instant, pass an explicit nanosecond stamp that falls inside the buffer window; outside it you get `FrameExtrapolationError` (the message carries `earliest_ns` and `latest_ns`).
:::

## Frame orientation

What the SDK itself guarantees about axes and rotation direction is limited to:

- a right-handed frame (quaternion maths and `Transform3d` composition/inverse assume it);
- Euler angles in **ZYX intrinsic** order (yaw about Z first, then pitch about Y, then roll about X); `euler_rpy` returns `(roll, pitch, yaw)`;
- a positive rotation about +Z carries +X towards +Y (counter-clockwise seen from +Z).

Everything else — whether `base_link` +X points forward, what the camera optical axes are — is defined by the robot's own frame tree and is not normalised by the SDK. Verify with one known pose before relying on it:

```python
print(robot.frames.list_frames())
print(robot.frames.to_mermaid())
tf = robot.frames.lookup("base_link", "left_eef")
print(tf.position, tf.euler_rpy)     # compare against a taught/calibrated value
```

Camera optical frames are named `*_optical` and follow the ROS convention (+Z forward, +X right, +Y down), which differs from the robot body frame — so a camera-to-body transform cannot be approximated by a single rotation angle; use `frames.transform_points()` / `deproject_*`, which carry the full pose.

`robot.frames.list_frames()` lists every name that actually exists on this robot; `to_mermaid()` shows the parent/child topology. Names are `/`-separated segments of `[a-z][a-z0-9_]*`, at most 127 characters.

## Timestamps and time bases

- Every `stamp_ns` is on the **same robot time base**; never mix it with host `time.time()`.
- Camera frames carry `clock_domain` and `clock_quality`: confirm the `clock_domain` matches before comparing timestamps across cameras. Multi-camera sync (`robot.skills.camera_sync`) requires one `clock_domain`; PTP lock state is in `SyncGroupList.ptp_locked`.
- The shared-memory frame-tree snapshot carries its own `clock_domain`; a cross-domain query raises `FrameClockError`.
- To measure client-to-robot round-trip latency use `robot.ping()`, not the difference of two `stamp_ns` values.

## Joint ordering

The order of `JointState.positions` is defined per capability; never reorder client-side:

- Single arm: `robot.left_arm.get_joint().positions` and `move_joint(JointPositions(...))` use the same order and require the same length;
- Both arms: use `DualJointState` / `DualJoints`, each side keeping its single-arm order;
- Whole body: `motion.get_joint()` returns `WholeBodyJointState`, ordered like `motion.move_joint(WholeBodyJointTarget(...))`;
- Dexterous hand: `hand.get_joint()` and `hand.move_joint(list[float])` map one-to-one over the finger order.

A mismatch is rejected as an invalid argument. To confirm what each index means, read the adapter config through `robot.<slot>.as_adapter(...)`, or nudge one joint a little and compare against `get_joint()`.

## Related

- Frame-tree queries, transform algebra and pixel deprojection: [Frames & Transforms](../data/frames.md)
- Camera intrinsics/extrinsics and multi-camera sync: [Camera](../../reference/python/camera.md), [Skills & Extensions](../configuration/skills.md)
- Common type fields: [Common Types and Enums](../../reference/python/types.md)
