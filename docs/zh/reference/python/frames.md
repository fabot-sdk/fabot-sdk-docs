---
title: 坐标系 API
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 坐标系 API

`fabot.frames` 是坐标系功能的公开模块：`FrameSystem`（`robot.frames` 的类型）、`Transform3d` 代数、`TransformBuffer`（离线缓冲）与一批几何函数。概念与用法见 [坐标系与变换](../../usage/frames.md)。

## 模块概述

- 产品路径：`robot.frames`（`FrameSystem`）
- 不依赖 ROS，纯 Python + numpy 可选加速
- 数据来源：机器人发布的共享内存坐标树快照（可用 `FABOT_TF_SHM` 指定路径）

## API 总览

| 成员 | 说明 |
|------|------|
| `FrameSystem` | 坐标树查询与变换入口 |
| `Transform3d` | SE(3) 刚体变换 |
| `TransformBuffer` | 进程内坐标树，可离线喂数据 |
| `Frame` | 常用坐标名常量 |
| `deproject_pixel` / `project_point_to_pixel` | 单像素与三维点互转 |
| `deproject_depth_to_points` / `depth_to_points` | 深度图批量反投影 |
| `select_depth_intrinsics` | 按深度帧挑出对应内参 |
| `project_depth_to_frame` | 深度点投影到目标系 |
| `euler_to_quaternion` / `quaternion_to_euler` | 欧拉角与四元数互转（ZYX 内旋） |
| `pose_to_matrix` / `matrix_to_pose` | 位姿与 4×4 齐次矩阵互转 |

## FrameSystem

### lookup

```python
lookup(target: str, source: str, stamp_ns: int = 0) -> Transform3d
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `str` | （必填） | 目标坐标系名 |
| `source` | `str` | （必填） | 源坐标系名 |
| `stamp_ns` | `int` | `0` | 查询时刻（纳秒）；`0` 表示最新 |

**返回** `Transform3d`：满足 `p_target = R · p_source + t`。

```python
from fabot.frames import Frame

tf = robot.frames.lookup(Frame.BASE_LINK, Frame.LEFT_EEF)
print(tf.position, tf.euler_rpy)
```

### lookup_full

```python
lookup_full(target: str, target_stamp: int, source: str, source_stamp: int, fixed: str) -> Transform3d
```

两侧各用各自的时刻查询，在 `fixed` 处拼接：`lookup(target, fixed, target_stamp) @ lookup(fixed, source, source_stamp)`。适合源与目标不在同一时基的场景。

### can_transform

```python
can_transform(target: str, source: str, stamp_ns: int = 0) -> bool
```

把 `FrameError` 收敛成 `bool`，不抛异常。

### wait_for_transform

```python
wait_for_transform(target: str, source: str, timeout: float = 1.0, *, timeout_s: float | None = None) -> Transform3d
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout` | `float` | `1.0` | 等待上限（秒） |
| `timeout_s` | `float \| None` | `None` | 同义写法，给了就以它为准 |

只对 `FrameNotFoundError`（坐标名还没出现）轮询等待，其余错误立即抛出；超时抛 `FrameTimeoutError`。

### transform

```python
transform(entity, target_frame: str, child_frame: str = "") -> Any
```

改变位姿 / 点 / 向量 / 速度 / 六维力的参考系。源系取自实体自身的 `frame_id`；`child_frame` 被忽略（换末端请用 `transform_pose`）。实体没有参考系字段时抛 `TypeError`。

### transform_pose

```python
transform_pose(pose, target_frame: str, *, end_frame: str = "", current_end_frame: str = "", stamp_ns: int = 0) -> Any
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `pose` | `Pose3d` | （必填） | 要转换的位姿 |
| `target_frame` | `str` | （必填） | 目标参考系 |
| `end_frame` | `str` | `""` | 目标受控末端 |
| `current_end_frame` | `str` | `""` | 位姿当前所属末端 |
| `stamp_ns` | `int` | `0` | 变换时刻；`0` 取位姿自身时间戳 |

### transform_points

```python
transform_points(points, target_frame: str, source_frame: str, stamp_ns: int = 0) -> Any
```

`points` 为 `(N, 3)` 数组或三元组序列；有 numpy 时返回 `ndarray`，否则返回点列表。

### set_frame / set_tool / apply_calibration / scoped_frame

```python
set_frame(parent: str, child: str, transform, authority: int = 3, persist: bool = False) -> None
set_tool(side: str, parent: str, tool: str, transform) -> None
apply_calibration(parent: str, child: str, transform, persist: bool = False) -> None
scoped_frame(parent: str, child: str, transform, authority: int = 4)
```

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `parent` / `child` | `str` | （必填） | 父子坐标名 |
| `transform` | `Transform3d` | （必填） | 子相对父的变换 |
| `authority` | `int` | `3` | 权限等级；低于现有边会被拒绝 |
| `persist` | `bool` | `False` | 持久化暂未实现，`True` 抛 `NotImplementedError` |
| `side` | `str` | （必填） | `"left"` / `"right"` |

`scoped_frame()` 返回上下文管理器，退出时恢复原边。

### 查询辅助

| 方法 | 说明 |
|------|------|
| `list_frames()` | 返回已知坐标名列表（父名与子名） |
| `to_mermaid()` | 输出 Mermaid `graph TD` 文本 |
| `deproject_pixel(...)` | 单像素 + 深度 → 三维点，可带 `target_frame` / `source_frame` 直接换系 |
| `project_depth_to_frame(...)` | 深度点投影到目标系 |

### 属性

| 属性 | 说明 |
|------|------|
| `shm_path` | 共享内存路径（空串表示用缺省，可经 `FABOT_TF_SHM` 覆盖） |
| `publisher` | 可选发布回调（`set_frame` 时同步通知） |
| `buffer` | 进程内 `TransformBuffer` |

## Transform3d

```python
Transform3d(target_frame="", source_frame="", translation=None, rotation=None, stamp_ns=0, *, tx=None, ty=None, tz=None, qx=None, qy=None, qz=None, qw=None)
Transform3d.identity(frame="", stamp_ns=0)
Transform3d.from_euler(target_frame="", source_frame="", x=0.0, y=0.0, z=0.0, roll=0.0, pitch=0.0, yaw=0.0, *, stamp_ns=0, degrees=False)
Transform3d.from_matrix(target_frame, source_frame, matrix, *, stamp_ns=0)
Transform3d.from_pose3d(pose, child_frame="")
```

| 成员 | 说明 |
|------|------|
| `translation` / `rotation` | `(tx, ty, tz)` 与 `(qx, qy, qz, qw)`；四元数构造时归一化 |
| `tx` / `ty` / `tz` / `qx` / `qy` / `qz` / `qw` | 分量读写属性 |
| `target_frame` / `source_frame` / `stamp_ns` | 坐标系与时间戳 |
| `position` | 平移三元组 |
| `quaternion` | 四元数四元组 |
| `euler_rpy` | 欧拉角三元组（弧度） |
| `compose(other)` / `@` | 复合；坐标系不衔接抛 `FrameMismatchError` |
| `inverse()` / `~tf` | 逆变换 |
| `interpolate(other, alpha)` | 插值（平移线性、旋转球面插值） |
| `apply_point` / `apply_vector` / `apply_quaternion` | 作用于点 / 向量 / 四元数 |
| `apply_points` | 批量作用于 `(N, 3)` |
| `apply_twist` / `apply_wrench` | 变换速度与六维力，`lever` 控制杠杆项 |
| `to_matrix()` | 4×4 齐次矩阵 |
| `to_pose3d()` / `to_pose()` | 转为 `Pose3d`（`frameId` 取 `target_frame`） |
| `Pack(builder)` | 打包为线协议 `fabot.types.Transform3d` |

```python
from fabot.frames import Transform3d

tf = Transform3d.from_euler("base_link", "sensor", x=0.1, z=0.5, yaw=1.57)
print(tf.compose(tf.inverse()).position)        # 约等于 (0, 0, 0)
print(tf.apply_point((1.0, 0.0, 0.0)))
```

## TransformBuffer

离线场景可直接往缓冲里喂边，然后做同样的查询：

```python
from fabot.frames import Transform3d, TransformBuffer

buf = TransformBuffer()
buf.set_frame("base_link", "tool0", Transform3d.from_euler("base_link", "tool0", z=0.2), authority=4)
print(buf.known("tool0"))
print(buf.lookup("base_link", "tool0").position)
```

| 成员 | 说明 |
|------|------|
| `known(name)` | 坐标名是否已知（含只作父名的名字） |
| `set_frame(parent, child, transform, authority=4, kinematic=False)` | 写入边；受保护的 `kinematic` 边不能被覆盖 |
| `lookup(target, source, stamp_ns=0)` | 与 `FrameSystem` 相同语义 |
| `edges` / `tree_generation` / `clock_domain` / `left_tcp` / `right_tcp` | 内部状态，调试时可读 |

## 几何函数

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

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `u` / `v` | `float` | （必填） | 像素坐标 |
| `depth_m` | `float` | （必填） | 该像素深度（米） |
| `intrinsics` | `OpticalIntrinsics` | `None` | 内参对象；也可用 `fx` / `fy` / `cx` / `cy` 直给 |
| `stride` | `int` | `1` | 点云抽样步长 |
| `max_depth` / `max_depth_m` | `float \| None` | `None` | 深度上限（米），超出丢弃 |
| `transform` | `Transform3d` | `None` | 反投影后一步换系 |

`deproject_depth_to_points` 支持 `DEPTH_U16`（按 `depth_scale` 换算，缺省 0.001）与 `DEPTH_F32`（已是米）；无效深度（0 / NaN / 负数）被丢弃。`select_depth_intrinsics` 按深度帧是否配准挑选对应内参，代际或尺寸不一致时抛 `ValueError`。

## Frame 常量

| 常量 | 值 |
|------|-----|
| `Frame.BASE_LINK` | `base_link` |
| `Frame.BASE_FOOTPRINT` | `base_footprint` |
| `Frame.ARM_BASE` | `arm_base` |
| `Frame.ODOM` | `odom` |
| `Frame.MAP` | `map` |
| `Frame.LEFT_EEF` / `Frame.RIGHT_EEF` | `left_eef` / `right_eef` |
| `Frame.HEAD_EEF` | `head_eef` |

## 异常

| 异常 | 触发场景 |
|------|----------|
| `FrameNotFoundError` | 坐标名不存在（同时属 `NotFound`） |
| `FrameConnectivityError` | 两坐标不连通（同时属 `NotFound`） |
| `FrameCycleError` | 写入的边形成环（同时属 `InvalidArgument`） |
| `FrameAuthorityError` | 覆盖受保护边或权限不足 |
| `FrameMismatchError` | `compose` 两侧坐标系不衔接（同时属 `InvalidArgument`） |
| `InvalidFrameNameError` | 坐标名不符合语法（同时属 `InvalidArgument`） |
| `InvalidQuaternionError` | 四元数非有限或模长接近零（同时属 `InvalidArgument`） |
| `FrameClockError` | 时基不一致 |
| `FrameTimeoutError` | `wait_for_transform` 超时（同时属 `Timeout`） |
| `FrameExtrapolationError` | 请求时刻超出样本范围 |

## 状态

`FrameSystem` 没有状态袋与事件；坐标树变化通过重新 `lookup` / `list_frames` 观察。

## 资源

无独占资源。共享内存是只读映射；`set_frame` 只改进程内缓冲，不影响机器人端。
