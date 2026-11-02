---
title: Frames
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Frames

Query the coordinate tree in-process, transform poses and point clouds between frames, and deproject depth images into point clouds. The mechanics are in [Frames & Transforms](../../usage/frames.md).

## Look up two frames

`lookup(target, source)` returns `^target T_source` with `p_target = R · p_source + t`:

```python
from fabot import Robot
from fabot.frames import Frame

with Robot.connect("192.168.1.10", 7557) as robot:
    tf = robot.frames.wait_for_transform(Frame.BASE_LINK, Frame.HEAD_EEF)
    print(tf.target_frame, "->", tf.source_frame)
    print("translation:", tf.position)     # (tx, ty, tz) in meters
    print("euler:", tf.euler_rpy)          # (roll, pitch, yaw) in radians
```

`wait_for_transform` polls while the names are still missing; once they are known, plain `lookup` is faster.

## List the tree

```python
print(robot.frames.list_frames())
print(robot.frames.to_mermaid())     # paste into any Markdown / Mermaid renderer
```

## Transform a pose into the base frame

`transform(entity, target_frame)` takes the source frame from the object's own `frame_id`:

```python
pose_in_head = robot.head.get_pose()                  # frame_id may be head_eef
pose_in_base = robot.frames.transform(pose_in_head, Frame.BASE_LINK)
print(pose_in_base.x, pose_in_base.y, pose_in_base.z, pose_in_base.frame_id)
```

To change the controlled end use `transform_pose`: `current_end_frame` says where the pose currently belongs, `end_frame` is the target end, and the fixed transform between them is composed in. The end edge must already exist in the tree:

```python
from fabot.frames import Transform3d
from fabot.types import Pose3d

robot.frames.set_tool(
    "right", "right_eef", "right_tcp",
    Transform3d.from_euler("right_eef", "right_tcp", z=0.18),
)

flange_pose = Pose3d(z=0.0, qw=1.0, frame_id="right_eef")
tcp_pose = robot.frames.transform_pose(
    flange_pose, "right_eef", current_end_frame="right_eef", end_frame="right_tcp",
)
print(tcp_pose.z, tcp_pose.frame_id)     # 0.18 right_eef
```

## Transform point clouds

```python
from fabot.capabilities.camera import StreamKind
from fabot.frames import deproject_depth_to_points, select_depth_intrinsics

frame_set = robot.head_camera.capture(streams=[StreamKind.DEPTH])
calib = robot.head_camera.get_calibration()
intr = select_depth_intrinsics(frame_set.depth, calib)

points_cam = deproject_depth_to_points(frame_set.depth, intr, stride=4, max_depth=3.0)
points_base = robot.frames.transform_points(points_cam, Frame.BASE_LINK, frame_set.depth.frame_id)
print(points_base[:3])
```

## Temporarily swap a tool frame

`scoped_frame()` returns a context manager: the edge is live inside the block and restored on exit. Useful when only this grasp should use a new tool TCP:

```python
from fabot.frames import Transform3d

tcp = Transform3d.from_euler("right_eef", "right_tcp", z=0.18)
with robot.frames.scoped_frame("right_eef", "right_tcp", tcp):
    print(robot.frames.lookup("right_eef", "right_tcp").position)   # (0, 0, 0.18)
# the right_tcp edge is removed on exit
print(robot.frames.can_transform("right_eef", "right_tcp"))        # False
```

For a lasting edge use `set_frame()`; to register a side's TCP use `set_tool(side, parent, tool, transform)`.

## Deproject a single pixel

`robot.frames.deproject_pixel(u, v, depth_m, intrinsics)` turns one pixel plus depth into a 3D point, optionally transformed in one step:

```python
intr = calib.depth
x, y, z = robot.frames.deproject_pixel(
    320.0, 240.0, 1.2, intr,
    target_frame=Frame.BASE_LINK, source_frame=calib.depth.frame_id,
)
print(x, y, z)
```

## Handle frame errors

Frame errors subclass `FabotError` and mostly also carry a semantic category (`NotFound` / `InvalidArgument` / `Timeout`):

```python
from fabot.frames import FrameConnectivityError, FrameNotFoundError

try:
    robot.frames.lookup(Frame.BASE_LINK, "no_such_frame")
except FrameNotFoundError as err:
    print("unknown frame name:", err.detail)
except FrameConnectivityError as err:
    print("trees not connected:", err.detail)
```

To test before querying use `can_transform()`, which collapses errors into a `bool`.
