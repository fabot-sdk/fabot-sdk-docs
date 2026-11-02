---
title: Frames API
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Frames API

`fabot.frames` is the public coordinate-frame module: `FrameSystem` (the type behind `robot.frames`), `Transform3d` algebra, `TransformBuffer` (offline buffer) and a set of geometry helpers. Concepts and usage are in [Frames & Transforms](../../usage/frames.md).

## Module overview

- Product path: `robot.frames` (a `FrameSystem`)
- No ROS dependency; pure Python with optional numpy acceleration
- Data source: the robot's shared-memory coordinate tree snapshot (override the path with `FABOT_TF_SHM`)

## API overview

| Member | Description |
|--------|-------------|
| `FrameSystem` | Coordinate-tree queries and transforms |
| `Transform3d` | SE(3) rigid transform |
| `TransformBuffer` | In-process tree you can feed offline |
| `Frame` | Well-known frame name constants |
| `deproject_pixel` / `project_point_to_pixel` | Pixel ↔ 3D point |
| `deproject_depth_to_points` / `depth_to_points` | Batch depth deprojection |
| `select_depth_intrinsics` | Pick intrinsics matching a depth frame |
| `project_depth_to_frame` | Project a depth point into a target frame |
| `euler_to_quaternion` / `quaternion_to_euler` | Euler ↔ quaternion (ZYX intrinsic) |
| `pose_to_matrix` / `matrix_to_pose` | Pose ↔ 4×4 homogeneous matrix |

## FrameSystem

### lookup

```python
lookup(target: str, source: str, stamp_ns: int = 0) -> Transform3d
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `target` | `str` | (required) | Target frame name |
| `source` | `str` | (required) | Source frame name |
| `stamp_ns` | `int` | `0` | Query time in ns; `0` means latest |

**Returns** `Transform3d` with `p_target = R · p_source + t`.

```python
from fabot.frames import Frame

tf = robot.frames.lookup(Frame.BASE_LINK, Frame.LEFT_EEF)
print(tf.position, tf.euler_rpy)
```

### lookup_full

```python
lookup_full(target: str, target_stamp: int, source: str, source_stamp: int, fixed: str) -> Transform3d
```

Queries each side at its own timestamp and stitches them at `fixed`: `lookup(target, fixed, target_stamp) @ lookup(fixed, source, source_stamp)`. Useful when source and target live on different clocks.

### can_transform

```python
can_transform(target: str, source: str, stamp_ns: int = 0) -> bool
```

Collapses `FrameError` into `bool` without raising.

### wait_for_transform

```python
wait_for_transform(target: str, source: str, timeout: float = 1.0, *, timeout_s: float | None = None) -> Transform3d
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout` | `float` | `1.0` | Wait budget in seconds |
| `timeout_s` | `float \| None` | `None` | Equivalent spelling; takes precedence when given |

Only `FrameNotFoundError` (names not yet published) is retried; other errors are raised immediately. On expiry it raises `FrameTimeoutError`.

### transform

```python
transform(entity, target_frame: str, child_frame: str = "") -> Any
```

Re-expresses a pose / point / vector / twist / wrench. The source frame comes from the entity's own `frame_id`; `child_frame` is ignored (use `transform_pose` to change the end). Raises `TypeError` when the entity carries no frame field.

### transform_pose

```python
transform_pose(pose, target_frame: str, *, end_frame: str = "", current_end_frame: str = "", stamp_ns: int = 0) -> Any
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `pose` | `Pose3d` | (required) | Pose to convert |
| `target_frame` | `str` | (required) | Target reference frame |
| `end_frame` | `str` | `""` | Target controlled end |
| `current_end_frame` | `str` | `""` | End the pose currently belongs to |
| `stamp_ns` | `int` | `0` | Transform time; `0` uses the pose timestamp |

### transform_points

```python
transform_points(points, target_frame: str, source_frame: str, stamp_ns: int = 0) -> Any
```

`points` is an `(N, 3)` array or a sequence of triples; returns an `ndarray` with numpy available, otherwise a list of points.

### set_frame / set_tool / apply_calibration / scoped_frame

```python
set_frame(parent: str, child: str, transform, authority: int = 3, persist: bool = False) -> None
set_tool(side: str, parent: str, tool: str, transform) -> None
apply_calibration(parent: str, child: str, transform, persist: bool = False) -> None
scoped_frame(parent: str, child: str, transform, authority: int = 4)
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `parent` / `child` | `str` | (required) | Parent and child names |
| `transform` | `Transform3d` | (required) | Child relative to parent |
| `authority` | `int` | `3` | Authority level; a stronger existing edge wins |
| `persist` | `bool` | `False` | Not implemented; `True` raises `NotImplementedError` |
| `side` | `str` | (required) | `"left"` / `"right"` |

`scoped_frame()` returns a context manager that restores the previous edge on exit.

### Query helpers

| Method | Description |
|--------|-------------|
| `list_frames()` | Known frame names (parents and children) |
| `to_mermaid()` | Mermaid `graph TD` text |
| `deproject_pixel(...)` | One pixel plus depth to a 3D point, optionally transformed |
| `project_depth_to_frame(...)` | Project a depth point into a target frame |

### Attributes

| Attribute | Description |
|-----------|-------------|
| `shm_path` | Shared-memory path (empty means the default, overridable via `FABOT_TF_SHM`) |
| `publisher` | Optional publish callback notified by `set_frame` |
| `buffer` | The in-process `TransformBuffer` |

## Transform3d

```python
Transform3d(target_frame="", source_frame="", translation=None, rotation=None, stamp_ns=0, *, tx=None, ty=None, tz=None, qx=None, qy=None, qz=None, qw=None)
Transform3d.identity(frame="", stamp_ns=0)
Transform3d.from_euler(target_frame="", source_frame="", x=0.0, y=0.0, z=0.0, roll=0.0, pitch=0.0, yaw=0.0, *, stamp_ns=0, degrees=False)
Transform3d.from_matrix(target_frame, source_frame, matrix, *, stamp_ns=0)
Transform3d.from_pose3d(pose, child_frame="")
```

| Member | Description |
|--------|-------------|
| `translation` / `rotation` | `(tx, ty, tz)` and `(qx, qy, qz, qw)`; quaternions are normalized on construction |
| `tx` / `ty` / `tz` / `qx` / `qy` / `qz` / `qw` | Component properties |
| `target_frame` / `source_frame` / `stamp_ns` | Frames and timestamp |
| `position` | Translation triple |
| `quaternion` | Quaternion quadruple |
| `euler_rpy` | Euler angles in radians |
| `compose(other)` / `@` | Compose; raises `FrameMismatchError` when frames do not chain |
| `inverse()` / `~tf` | Inverse |
| `interpolate(other, alpha)` | Interpolation (linear translation, spherical rotation) |
| `apply_point` / `apply_vector` / `apply_quaternion` | Apply to point / vector / quaternion |
| `apply_points` | Batch apply on `(N, 3)` |
| `apply_twist` / `apply_wrench` | Transform velocity and wrench; `lever` toggles the lever arm |
| `to_matrix()` | 4×4 homogeneous matrix |
| `to_pose3d()` / `to_pose()` | Convert to `Pose3d` (`frameId` from `target_frame`) |
| `Pack(builder)` | Pack as the wire `fabot.types.Transform3d` |

```python
from fabot.frames import Transform3d

tf = Transform3d.from_euler("base_link", "sensor", x=0.1, z=0.5, yaw=1.57)
print(tf.compose(tf.inverse()).position)        # approximately (0, 0, 0)
print(tf.apply_point((1.0, 0.0, 0.0)))
```

## TransformBuffer

For offline work, feed edges into a buffer and query it the same way:

```python
from fabot.frames import Transform3d, TransformBuffer

buf = TransformBuffer()
buf.set_frame("base_link", "tool0", Transform3d.from_euler("base_link", "tool0", z=0.2), authority=4)
print(buf.known("tool0"))
print(buf.lookup("base_link", "tool0").position)
```

| Member | Description |
|--------|-------------|
| `known(name)` | Whether the name is known (parents included) |
| `set_frame(parent, child, transform, authority=4, kinematic=False)` | Write an edge; protected `kinematic` edges cannot be overwritten |
| `lookup(target, source, stamp_ns=0)` | Same semantics as `FrameSystem` |
| `edges` / `tree_generation` / `clock_domain` / `left_tcp` / `right_tcp` | Internal state, readable for debugging |

## Geometry functions

```python
deproject_pixel(u, v, depth_m, intrinsics=None, *, fx=None, fy=None, cx=None, cy=None, transform=None) -> tuple[float, float, float]
project_point_to_pixel(point, intrinsics=None, *, fx=None, fy=None, cx=None, cy=None) -> tuple[float, float]
deproject_depth_to_points(depth, intrinsics, *, stride=1, max_depth=None, max_depth_m=None, transform=None)
select_depth_intrinsics(depth, intrinsics)
project_depth_to_frame(depth_m, u, v, fx, fy, cx, cy, transform)
euler_to_quaternion(roll=0.0, pitch=0.0, yaw=0.0, *, degrees=False) -> tuple[float, float, float, float]
quaternion_to_euler(quat, *, degrees=False) -> tuple[float, float, float]
pose_to_matrix(translation, rotation)
matrix_to_pose(matrix)
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `u` / `v` | `float` | (required) | Pixel coordinates |
| `depth_m` | `float` | (required) | Depth at that pixel in meters |
| `intrinsics` | `OpticalIntrinsics` | `None` | Intrinsics object; `fx` / `fy` / `cx` / `cy` may be given instead |
| `stride` | `int` | `1` | Point-cloud decimation stride |
| `max_depth` / `max_depth_m` | `float \| None` | `None` | Depth ceiling in meters; farther points are dropped |
| `transform` | `Transform3d` | `None` | Applied after deprojection |

`deproject_depth_to_points` supports `DEPTH_U16` (scaled by `depth_scale`, default 0.001) and `DEPTH_F32` (already meters); invalid depths (0 / NaN / negative) are dropped. `select_depth_intrinsics` picks intrinsics matching whether the depth frame is registered, raising `ValueError` on a generation or size mismatch.

## Frame constants

| Constant | Value |
|----------|-------|
| `Frame.BASE_LINK` | `base_link` |
| `Frame.BASE_FOOTPRINT` | `base_footprint` |
| `Frame.ARM_BASE` | `arm_base` |
| `Frame.ODOM` | `odom` |
| `Frame.MAP` | `map` |
| `Frame.LEFT_EEF` / `Frame.RIGHT_EEF` | `left_eef` / `right_eef` |
| `Frame.HEAD_EEF` | `head_eef` |

## Exceptions

| Exception | When |
|-----------|------|
| `FrameNotFoundError` | Frame name unknown (also `NotFound`) |
| `FrameConnectivityError` | Frames not connected (also `NotFound`) |
| `FrameCycleError` | The edge would close a cycle (also `InvalidArgument`) |
| `FrameAuthorityError` | Protected edge or insufficient authority |
| `FrameMismatchError` | `compose` operands do not chain (also `InvalidArgument`) |
| `InvalidFrameNameError` | Frame name violates the grammar (also `InvalidArgument`) |
| `InvalidQuaternionError` | Quaternion non-finite or near zero length (also `InvalidArgument`) |
| `FrameClockError` | Clock domains disagree |
| `FrameTimeoutError` | `wait_for_transform` timed out (also `Timeout`) |
| `FrameExtrapolationError` | Requested time outside the buffered samples |

## Status

`FrameSystem` has no status bag or events; observe tree changes by re-running `lookup` / `list_frames`.

## Resources

No exclusive resources. The shared memory is read-only; `set_frame` only changes the in-process buffer and never the robot side.
