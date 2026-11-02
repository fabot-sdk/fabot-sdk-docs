---
title: Frames & Transforms
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Frames & Transforms

`robot.frames` returns a `FrameSystem` that performs coordinate-frame queries and pose / point-cloud transforms inside your own process. It reads the coordinate tree snapshot published by the robot and **does not link ROS** (no `rclpy` / `tf2`), so it works on any host with the SDK installed.

## Quick look

```python
from fabot.frames import Frame

tf = robot.frames.lookup(Frame.BASE_LINK, Frame.LEFT_EEF)
print(tf.target_frame, tf.source_frame)
print(tf.position, tf.quaternion, tf.euler_rpy)

pose_in_map = robot.frames.transform(robot.left_arm.get_pose(), Frame.MAP)
```

## Querying the tree

```python
robot.frames.lookup(target: str, source: str, stamp_ns: int = 0) -> Transform3d
robot.frames.lookup_full(target: str, target_stamp: int, source: str, source_stamp: int, fixed: str) -> Transform3d
robot.frames.can_transform(target: str, source: str, stamp_ns: int = 0) -> bool
robot.frames.wait_for_transform(target: str, source: str, timeout: float = 1.0, *, timeout_s: float | None = None) -> Transform3d
robot.frames.list_frames() -> list[str]
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `target` | `str` | (required) | Target frame (the frame the result is expressed in) |
| `source` | `str` | (required) | Source frame |
| `stamp_ns` | `int` | `0` | Query time in ns; `0` means latest |
| `timeout` / `timeout_s` | `float` | `1.0` | Wait budget in seconds; both spellings are equivalent |

- `lookup` returns `^target T_source` with `p_target = R · p_source + t`. Parent chains are walked up to the nearest common ancestor and then composed.
- `lookup_full` uses `fixed` as the intermediate frame and queries each side at its own timestamp.
- `can_transform` collapses `FrameError` into `bool`.
- `wait_for_transform` only polls while the frame names are missing; connectivity errors are raised immediately.
- `list_frames` returns every known frame name (parents and children).

The tree comes from a shared-memory snapshot; edges you add with `set_frame()` in-process take precedence over the shared edge of the same child.

## Frame names

Frame names must match `^[a-z][a-z0-9_]*(/[a-z][a-z0-9_]*)*$` with a length of 1–127, otherwise `InvalidFrameNameError` is raised.

Common constants live on `fabot.frames.Frame`:

| Constant | Name |
|----------|------|
| `Frame.BASE_LINK` | `base_link` |
| `Frame.BASE_FOOTPRINT` | `base_footprint` |
| `Frame.ARM_BASE` | `arm_base` |
| `Frame.ODOM` | `odom` |
| `Frame.MAP` | `map` |
| `Frame.LEFT_EEF` / `Frame.RIGHT_EEF` | `left_eef` / `right_eef` |
| `Frame.HEAD_EEF` | `head_eef` |

`robot.frames.to_mermaid()` renders the current tree as Mermaid, handy for checking naming and parentage:

```python
print(robot.frames.to_mermaid())
```

## Transform3d

`Transform3d` is an SE(3) rigid transform with `target_frame` / `source_frame` / `translation` (`tx` / `ty` / `tz`) / `rotation` (`qx` / `qy` / `qz` / `qw`) / `stamp_ns`. Quaternions are normalized on construction; invalid ones raise `InvalidQuaternionError`.

### Construction

```python
Transform3d(target_frame: str = "", source_frame: str = "", translation=None, rotation=None, stamp_ns: int = 0, *, tx=..., ty=..., tz=..., qx=..., qy=..., qz=..., qw=...)
Transform3d.identity(frame: str = "", stamp_ns: int = 0) -> Transform3d
Transform3d.from_euler(target_frame="", source_frame="", x=0.0, y=0.0, z=0.0, roll=0.0, pitch=0.0, yaw=0.0, *, stamp_ns=0, degrees=False) -> Transform3d
Transform3d.from_matrix(target_frame: str, source_frame: str, matrix, *, stamp_ns: int = 0) -> Transform3d
Transform3d.from_pose3d(pose, child_frame: str = "") -> Transform3d
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `translation` | 3-element sequence | `None` | `(tx, ty, tz)` in meters |
| `rotation` | 4-element sequence | `None` | `(qx, qy, qz, qw)`; `(0, 0, 0, 1)` when omitted |
| `roll` / `pitch` / `yaw` | `float` | `0.0` | ZYX intrinsic Euler angles, radians unless `degrees=True` |
| `matrix` | 4×4 homogeneous | (required) | As produced by `pose_to_matrix()` |
| `child_frame` | `str` | `""` | Child frame the pose belongs to (`from_pose3d`) |

### Algebra

| Member | Description |
|--------|-------------|
| `compose(other)` / `@` | Compose; raises `FrameMismatchError` when frames do not chain |
| `inverse()` / `~tf` | Inverse |
| `interpolate(other, alpha)` | Linear translation plus spherical rotation interpolation |
| `apply_point(p)` / `apply_vector(v)` / `apply_quaternion(q)` | Apply to a point / vector / quaternion |
| `apply_points(points)` | Batch apply on `(N, 3)` arrays |
| `apply_twist(linear, angular, lever=True)` | Transform a spatial velocity, with the lever arm optional |
| `apply_wrench(force, torque, lever=True)` | Transform a wrench |
| `to_matrix()` | 4×4 homogeneous matrix |
| `to_pose3d()` / `to_pose()` | Convert to `Pose3d` (`frameId` from `target_frame`) |
| `position` / `quaternion` / `euler_rpy` | Translation, quaternion and Euler readings |
| `tx` / `ty` / `tz` / `qx` / `qy` / `qz` / `qw` | Component read/write |
| `__eq__` | Frames, numbers and timestamp all equal; also accepts objects with the same attributes |

```python
from fabot.frames import Transform3d

tool = Transform3d.from_euler("left_eef", "tool0", x=0.0, z=0.12, roll=0.0)
pose = Transform3d.from_pose3d(robot.left_arm.get_pose())
in_base = pose.compose(tool)
print(in_base.position, in_base.to_matrix())
```

## Transforming geometric objects

```python
robot.frames.transform(entity, target_frame: str, child_frame: str = "")
robot.frames.transform_pose(pose, target_frame, *, end_frame="", current_end_frame="", stamp_ns=0)
robot.frames.transform_points(points, target_frame: str, source_frame: str, stamp_ns: int = 0)
```

| Member | Description |
|--------|-------------|
| `transform` | Re-express a pose / point / vector / twist / wrench; the source frame comes from the object's own `frame_id`, `child_frame` is ignored |
| `transform_pose` | Re-express a pose and optionally change the controlled end: `current_end_frame` is where the pose currently belongs, `end_frame` the target end |
| `transform_points` | Move an `(N, 3)` point set from `source_frame` to `target_frame` |

`transform` requires an object with a recognizable frame field, otherwise `TypeError`; when source and target match the object is returned unchanged.

```python
from fabot.frames import Frame

points_base = robot.frames.transform_points(cloud.positions, Frame.BASE_LINK, "head_camera_depth_optical")
grasp_in_base = robot.frames.transform_pose(
    grasp_pose, Frame.BASE_LINK,
    current_end_frame="head_camera_color_optical",
    end_frame=Frame.RIGHT_EEF,
)
```

## Writing frames and scopes

```python
robot.frames.set_frame(parent: str, child: str, transform, authority: int = 3, persist: bool = False) -> None
robot.frames.set_tool(side: str, parent: str, tool: str, transform) -> None
robot.frames.apply_calibration(parent: str, child: str, transform, persist: bool = False) -> None
robot.frames.scoped_frame(parent: str, child: str, transform, authority: int = 4)
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `parent` / `child` | `str` | (required) | Parent and child frame names |
| `transform` | `Transform3d` | (required) | Child relative to parent |
| `authority` | `int` | `3` | Authority level; a higher existing edge wins |
| `persist` | `bool` | `False` | Persistence is not implemented; `True` raises `NotImplementedError` |

Write rules:

- Identical parent and child, or an edge that would close a cycle, raises `FrameCycleError`.
- Overwriting a protected kinematic edge raises `FrameAuthorityError`; so does an `authority` lower than the existing edge.
- `set_tool(side, parent, tool, transform)` sets the edge and registers that side's TCP; `side` is `"left"` or `"right"`.
- `scoped_frame()` returns a context manager: the edge is active inside the block and the previous edge (or absence) is restored on exit.

```python
from fabot.frames import Transform3d

tcp = Transform3d.from_euler("right_eef", "right_tcp", z=0.18)
with robot.frames.scoped_frame("right_eef", "right_tcp", tcp):
    print(robot.frames.lookup("right_eef", "right_tcp").position)   # (0, 0, 0.18)
# right_tcp is removed again after the block
```

## Pixels and depth

`FrameSystem` also carries three camera-geometry helpers:

```python
robot.frames.deproject_pixel(u, v, depth_m, intrinsics=None, *, fx=None, fy=None, cx=None, cy=None, transform=None, target_frame="", source_frame="", stamp_ns=0) -> tuple[float, float, float]
robot.frames.project_depth_to_frame(depth_m, u, v, fx, fy, cx, cy, transform)
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `u` / `v` | `float` | (required) | Pixel coordinates |
| `depth_m` | `float` | (required) | Depth at that pixel in meters |
| `intrinsics` | `OpticalIntrinsics` | `None` | Intrinsics object; `fx` / `fy` / `cx` / `cy` may be given instead |
| `transform` | `Transform3d` | `None` | Apply after deprojection |
| `target_frame` / `source_frame` | `str` | `""` | When `target_frame` is set the transform is looked up automatically and `source_frame` becomes required |

Module-level functions (`fabot.frames` directly) are equivalent: `deproject_pixel`, `project_point_to_pixel`, `deproject_depth_to_points` (alias `depth_to_points`), `select_depth_intrinsics`, `project_depth_to_frame`, plus `euler_to_quaternion`, `quaternion_to_euler`, `pose_to_matrix` and `matrix_to_pose`.

```python
from fabot.frames import deproject_depth_to_points, select_depth_intrinsics

calib = robot.head_camera.get_calibration()
frame_set = robot.head_camera.capture(streams=[StreamKind.DEPTH])
intr = select_depth_intrinsics(frame_set.depth, calib)
points = deproject_depth_to_points(frame_set.depth, intr, stride=2, max_depth=5.0)
print(points.shape)
```

## Exceptions

| Exception | When |
|-----------|------|
| `FrameNotFoundError` | A frame name is not in the tree |
| `FrameConnectivityError` | The two frames are not in the same tree |
| `FrameCycleError` | The edge would close a cycle |
| `FrameAuthorityError` | Overwriting a protected edge, or insufficient authority |
| `FrameMismatchError` | `compose` operands do not chain |
| `InvalidFrameNameError` | Frame name violates the grammar |
| `InvalidQuaternionError` | Quaternion is non-finite or near zero length |
| `FrameClockError` | Clock domains disagree |
| `FrameTimeoutError` | `wait_for_transform` timed out |
| `FrameExtrapolationError` | Requested time is outside the buffered samples |

All of them subclass `FabotError` (`FrameNotFoundError` / `FrameConnectivityError` also `NotFound`, `FrameMismatchError` / `FrameCycleError` / `InvalidFrameNameError` / `InvalidQuaternionError` also `InvalidArgument`, `FrameTimeoutError` also `Timeout`), so a single `FabotError` handler covers them, see [Error Handling](errors.md).

## Related

- Coordinate types available in capability calls: `Pose3d` / `Pose2d` / `Transform3d`, see [Shared Types & Enums](../reference/python/types.md)
- Camera intrinsics, extrinsics and deprojection: [Camera](../reference/python/camera.md)
- Arm pose motion and `end_frame` semantics: [Arm](../reference/python/arm.md)
