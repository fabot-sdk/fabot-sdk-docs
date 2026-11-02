---
title: 坐标系
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 坐标系

在应用进程内查询坐标树、把位姿或点云换算到别的参考系，并把深度图反投影成点云。机制细节见 [坐标系与变换](../../usage/frames.md)。

## 查询两个坐标系的相对位姿

`lookup(target, source)` 返回 `^target T_source`，满足 `p_target = R · p_source + t`：

```python
from fabot import Robot
from fabot.frames import Frame

with Robot.connect("192.168.1.10", 7557) as robot:
    tf = robot.frames.wait_for_transform(Frame.BASE_LINK, Frame.HEAD_EEF)
    print(tf.target_frame, "->", tf.source_frame)
    print("平移:", tf.position)          # (tx, ty, tz)，米
    print("欧拉角:", tf.euler_rpy)       # (roll, pitch, yaw)，弧度
```

`wait_for_transform` 会在坐标名还没出现时轮询等待；已经确定存在时用 `lookup` 更快。

## 列出坐标树

```python
print(robot.frames.list_frames())
print(robot.frames.to_mermaid())     # 直接贴进 Markdown / Mermaid 渲染器
```

## 换算位姿到机器人基准系

`transform(entity, target_frame)` 按对象自带的 `frame_id` 找源系：

```python
pose_in_head = robot.head.get_pose()                  # frame_id 可能是 head_eef
pose_in_base = robot.frames.transform(pose_in_head, Frame.BASE_LINK)
print(pose_in_base.x, pose_in_base.y, pose_in_base.z, pose_in_base.frame_id)
```

要换「受控末端」用 `transform_pose`：`current_end_frame` 说明位姿当前属于哪个末端，`end_frame` 是目标末端，两者的固定变换会被复合进去。前提是这条末端边已在树里：

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

## 换算点云

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

## 临时替换一个工具坐标系

`scoped_frame()` 返回上下文管理器：进入后生效，退出时恢复原边。适合「只在这次抓取时用新工具的 TCP」：

```python
from fabot.frames import Transform3d

tcp = Transform3d.from_euler("right_eef", "right_tcp", z=0.18)
with robot.frames.scoped_frame("right_eef", "right_tcp", tcp):
    print(robot.frames.lookup("right_eef", "right_tcp").position)   # (0, 0, 0.18)
# 退出后 right_tcp 边被撤销
print(robot.frames.can_transform("right_eef", "right_tcp"))        # False
```

要长期生效用 `set_frame()`；给某一侧登记 TCP 用 `set_tool(side, parent, tool, transform)`。

## 单像素反投影

`robot.frames.deproject_pixel(u, v, depth_m, intrinsics)` 直接把一个像素加深度变成三维点，可一步变到目标系：

```python
intr = calib.depth
x, y, z = robot.frames.deproject_pixel(
    320.0, 240.0, 1.2, intr,
    target_frame=Frame.BASE_LINK, source_frame=calib.depth.frame_id,
)
print(x, y, z)
```

## 处理坐标错误

坐标系错误都是 `FabotError` 的子类，且多数同时带语义分类（`NotFound` / `InvalidArgument` / `Timeout`）：

```python
from fabot.frames import FrameConnectivityError, FrameNotFoundError

try:
    robot.frames.lookup(Frame.BASE_LINK, "no_such_frame")
except FrameNotFoundError as err:
    print("坐标名不存在:", err.detail)
except FrameConnectivityError as err:
    print("两棵树不连通:", err.detail)
```

先判断再查询可用 `can_transform()`，它把错误收敛成 `bool`。
