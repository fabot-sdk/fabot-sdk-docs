---
title: 坐标系与变换
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 坐标系与变换

`robot.frames` 返回 `FrameSystem`：在应用进程内做坐标系查询与位姿 / 点云变换。它读取机器人发布的坐标树快照，**不链接 ROS**（不依赖 `rclpy` / `tf2`），因此可以在任何装了 SDK 的主机上做坐标换算。

## 快速一瞥

```python
from fabot.frames import Frame

tf = robot.frames.lookup(Frame.BASE_LINK, Frame.LEFT_EEF)
print(tf.target_frame, tf.source_frame)
print(tf.position, tf.quaternion, tf.euler_rpy)

pose_in_map = robot.frames.transform(robot.left_arm.get_pose(), Frame.MAP)
```

## 坐标树查询

```python
robot.frames.lookup(target: str, source: str, stamp_ns: int = 0) -> Transform3d
robot.frames.lookup_full(target: str, target_stamp: int, source: str, source_stamp: int, fixed: str) -> Transform3d
robot.frames.can_transform(target: str, source: str, stamp_ns: int = 0) -> bool
robot.frames.wait_for_transform(target: str, source: str, timeout: float = 1.0, *, timeout_s: float | None = None) -> Transform3d
robot.frames.list_frames() -> list[str]
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `str` | （必填） | 目标坐标系（结果表达在哪个系） |
| `source` | `str` | （必填） | 源坐标系 |
| `stamp_ns` | `int` | `0` | 查询时刻（纳秒）；`0` 表示最新 |
| `timeout` / `timeout_s` | `float` | `1.0` | 等待上限（秒）；两个写法等价 |

- `lookup` 返回 `^target T_source`，满足 `p_target = R · p_source + t`。两个坐标系的父链会追溯到最近公共祖先再组合。
- `lookup_full` 用 `fixed` 作中间系，在两侧各用各自的时刻查询，适合源和目标不在同一时基的场景。
- `can_transform` 把 `FrameError` 收敛成 `bool`，适合先判断再查询。
- `wait_for_transform` 只对「坐标名暂时不存在」轮询等待，连通性错误立即抛出。
- `list_frames` 返回当前已知的全部坐标名（父名与子名）。

坐标树来自共享内存快照，进程内自己 `set_frame()` 加入的边优先于同名共享边。

## 坐标名

坐标名必须是 `^[a-z][a-z0-9_]*(/[a-z][a-z0-9_]*)*$`，长度 1–127；不符合时抛 `InvalidFrameNameError`。

常用常量在 `fabot.frames.Frame`：

| 常量 | 名称 |
|------|------|
| `Frame.BASE_LINK` | `base_link` |
| `Frame.BASE_FOOTPRINT` | `base_footprint` |
| `Frame.ARM_BASE` | `arm_base` |
| `Frame.ODOM` | `odom` |
| `Frame.MAP` | `map` |
| `Frame.LEFT_EEF` / `Frame.RIGHT_EEF` | `left_eef` / `right_eef` |
| `Frame.HEAD_EEF` | `head_eef` |

`robot.frames.to_mermaid()` 把当前坐标树输出为 Mermaid 图，便于排查命名与父子关系：

```python
print(robot.frames.to_mermaid())
```

## Transform3d

`Transform3d` 是 SE(3) 刚体变换，字段为 `target_frame` / `source_frame` / `translation`（`tx` / `ty` / `tz`）/ `rotation`（`qx` / `qy` / `qz` / `qw`）/ `stamp_ns`。构造时四元数会被归一化，非法四元数抛 `InvalidQuaternionError`。

### 构造

```python
Transform3d(target_frame: str = "", source_frame: str = "", translation=None, rotation=None, stamp_ns: int = 0, *, tx=..., ty=..., tz=..., qx=..., qy=..., qz=..., qw=...)
Transform3d.identity(frame: str = "", stamp_ns: int = 0) -> Transform3d
Transform3d.from_euler(target_frame="", source_frame="", x=0.0, y=0.0, z=0.0, roll=0.0, pitch=0.0, yaw=0.0, *, stamp_ns=0, degrees=False) -> Transform3d
Transform3d.from_matrix(target_frame: str, source_frame: str, matrix, *, stamp_ns: int = 0) -> Transform3d
Transform3d.from_pose3d(pose, child_frame: str = "") -> Transform3d
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `translation` | 三元序列 | `None` | `(tx, ty, tz)`，米 |
| `rotation` | 四元序列 | `None` | `(qx, qy, qz, qw)`；缺省为 `(0, 0, 0, 1)` |
| `roll` / `pitch` / `yaw` | `float` | `0.0` | ZYX 内旋欧拉角，弧度（`degrees=True` 时为度） |
| `matrix` | 4×4 齐次矩阵 | （必填） | 可由 `pose_to_matrix()` 生成 |
| `child_frame` | `str` | `""` | `from_pose3d` 里位姿所属的子坐标系 |

### 代数

| 成员 | 说明 |
|------|------|
| `compose(other)` / `@` | 复合；两侧坐标系不衔接时抛 `FrameMismatchError` |
| `inverse()` / `~tf` | 逆变换 |
| `interpolate(other, alpha)` | 按 `alpha` 在两者间插值（平移线性、旋转球面插值） |
| `apply_point(p)` / `apply_vector(v)` / `apply_quaternion(q)` | 作用于点 / 向量 / 四元数 |
| `apply_points(points)` | 批量作用于 `(N, 3)` 数组（有 numpy 时走矩阵乘法） |
| `apply_twist(linear, angular, lever=True)` | 变换空间速度，`lever` 控制是否计杠杆项 |
| `apply_wrench(force, torque, lever=True)` | 变换六维力 |
| `to_matrix()` | 4×4 齐次矩阵 |
| `to_pose3d()` / `to_pose()` | 转为 `Pose3d`，`frameId` 取 `target_frame` |
| `position` / `quaternion` / `euler_rpy` | 平移、四元数、欧拉角读法 |
| `tx` / `ty` / `tz` / `qx` / `qy` / `qz` / `qw` | 分量读写 |
| `__eq__` | 坐标系、数值与时间戳全等；也接受带同名属性的对象 |

```python
from fabot.frames import Transform3d

tool = Transform3d.from_euler("left_eef", "tool0", x=0.0, z=0.12, roll=0.0)
pose = Transform3d.from_pose3d(robot.left_arm.get_pose())
in_base = pose.compose(tool)
print(in_base.position, in_base.to_matrix())
```

## 变换几何对象

```python
robot.frames.transform(entity, target_frame: str, child_frame: str = "")
robot.frames.transform_pose(pose, target_frame, *, end_frame="", current_end_frame="", stamp_ns=0)
robot.frames.transform_points(points, target_frame: str, source_frame: str, stamp_ns: int = 0)
```

| 成员 | 说明 |
|------|------|
| `transform` | 改变位姿 / 点 / 向量 / 速度 / 六维力的参考系；源系取自对象自身的 `frame_id`，`child_frame` 忽略 |
| `transform_pose` | 表达位姿到目标系，并可换受控末端：`current_end_frame` 是位姿当前所属末端，`end_frame` 是目标末端 |
| `transform_points` | 把 `(N, 3)` 点集从 `source_frame` 变到 `target_frame` |

`transform` 要求对象带可识别的参考系字段，否则抛 `TypeError`；源系与目标系相同时原样返回。

```python
from fabot.frames import Frame

points_base = robot.frames.transform_points(cloud.positions, Frame.BASE_LINK, "head_camera_depth_optical")
grasp_in_base = robot.frames.transform_pose(
    grasp_pose, Frame.BASE_LINK,
    current_end_frame="head_camera_color_optical",
    end_frame=Frame.RIGHT_EEF,
)
```

## 写入与作用域

```python
robot.frames.set_frame(parent: str, child: str, transform, authority: int = 3, persist: bool = False) -> None
robot.frames.set_tool(side: str, parent: str, tool: str, transform) -> None
robot.frames.apply_calibration(parent: str, child: str, transform, persist: bool = False) -> None
robot.frames.scoped_frame(parent: str, child: str, transform, authority: int = 4)
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `parent` / `child` | `str` | （必填） | 父子坐标名 |
| `transform` | `Transform3d` | （必填） | 子相对父的变换 |
| `authority` | `int` | `3` | 权限等级；低于现存的边会被拒绝 |
| `persist` | `bool` | `False` | 目前不支持持久化，`True` 抛 `NotImplementedError` |

写入规则：

- 父名与子名相同、或新边会形成环时抛 `FrameCycleError`。
- 覆盖受保护的运动学边抛 `FrameAuthorityError`；`authority` 低于现有边同样抛 `FrameAuthorityError`。
- `set_tool(side, parent, tool, transform)` 在设置边的同时登记该侧的 TCP，`side` 取 `"left"` / `"right"`。
- `scoped_frame()` 返回上下文管理器：进入后临时生效，退出时恢复原边（原先没有则删除）。

```python
from fabot.frames import Transform3d

tcp = Transform3d.from_euler("right_eef", "right_tcp", z=0.18)
with robot.frames.scoped_frame("right_eef", "right_tcp", tcp):
    print(robot.frames.lookup("right_eef", "right_tcp").position)   # (0, 0, 0.18)
# 退出后 right_tcp 边被撤销
```

## 像素与深度

`FrameSystem` 上还有三个相机几何便捷方法：

```python
robot.frames.deproject_pixel(u, v, depth_m, intrinsics=None, *, fx=None, fy=None, cx=None, cy=None, transform=None, target_frame="", source_frame="", stamp_ns=0) -> tuple[float, float, float]
robot.frames.project_depth_to_frame(depth_m, u, v, fx, fy, cx, cy, transform)
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `u` / `v` | `float` | （必填） | 像素坐标 |
| `depth_m` | `float` | （必填） | 该像素深度，米 |
| `intrinsics` | `OpticalIntrinsics` | `None` | 内参对象；也可用 `fx` / `fy` / `cx` / `cy` 直给 |
| `transform` | `Transform3d` | `None` | 反投影后再变到目标系 |
| `target_frame` / `source_frame` | `str` | `""` | 给 `target_frame` 时按坐标树自动查变换，此时 `source_frame` 必填 |

模块级函数（`fabot.frames` 直接导入）等价可用：`deproject_pixel`、`project_point_to_pixel`、`deproject_depth_to_points`（别名 `depth_to_points`）、`select_depth_intrinsics`、`project_depth_to_frame`，以及四元数 / 欧拉角 / 矩阵互转的 `euler_to_quaternion`、`quaternion_to_euler`、`pose_to_matrix`、`matrix_to_pose`。

```python
from fabot.frames import deproject_depth_to_points, select_depth_intrinsics

calib = robot.head_camera.get_calibration()
frame_set = robot.head_camera.capture(streams=[StreamKind.DEPTH])
intr = select_depth_intrinsics(frame_set.depth, calib)
points = deproject_depth_to_points(frame_set.depth, intr, stride=2, max_depth=5.0)
print(points.shape)
```

## 异常

| 异常 | 触发场景 |
|------|----------|
| `FrameNotFoundError` | 坐标名在树里不存在 |
| `FrameConnectivityError` | 两个坐标不在同一棵树里 |
| `FrameCycleError` | 写入的边会形成环 |
| `FrameAuthorityError` | 覆盖受保护边，或权限等级不足 |
| `FrameMismatchError` | `compose` 两侧坐标系不衔接 |
| `InvalidFrameNameError` | 坐标名不符合语法 |
| `InvalidQuaternionError` | 四元数非有限或模长接近零 |
| `FrameClockError` | 时基不一致导致无法查询 |
| `FrameTimeoutError` | `wait_for_transform` 超时 |
| `FrameExtrapolationError` | 请求时刻超出已有样本范围 |

这些异常都继承 `FabotError`（`FrameNotFoundError` / `FrameConnectivityError` 同时属 `NotFound`，`FrameMismatchError` / `FrameCycleError` / `InvalidFrameNameError` / `InvalidQuaternionError` 同时属 `InvalidArgument`，`FrameTimeoutError` 同时属 `Timeout`），可以按 `FabotError` 统一处理，见 [错误处理](errors.md)。

## 相关

- 能力方法里可用的坐标类型：`Pose3d` / `Pose2d` / `Transform3d`，见 [通用类型与枚举](../reference/python/types.md)
- 相机的内参、外参与反投影：[相机 Camera](../reference/python/camera.md)
- 机械臂的位姿运动与 `end_frame` 语义：[机械臂 Arm](../reference/python/arm.md)
