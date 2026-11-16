---
title: 时间基准与坐标系约定
status: draft
owner: fabot-core
updated: 2026-11-16
---

# 时间基准与坐标系约定

跨能力的位姿、点云与传感器融合能不能对上，取决于两件事：所有时间戳是不是同一条时基，坐标系的轴向与旋向是否一致。这一页把散落在各页的约定集中说明。

## 单位

| 量 | 单位 | 说明 |
|----|------|------|
| 长度、平移 | 米（m） | 所有 `x` / `y` / `z`、`translate`、高度 |
| 角度、关节角 | 弧度（rad） | 包括 `theta`、`yaw`、关节位置；欧拉角 API 可传 `degrees=True` |
| 线速度 | 米/秒 | `vx` / `vy` / `linear` |
| 角速度 | 弧度/秒 | `vtheta` / `angular` |
| 力、力矩 | 牛、牛·米 | `Wrench3d.force` / `.torque` |
| 时间戳 | 纳秒（`*_ns`）、微秒（`*_us`） | 字段名后缀即单位 |
| 开合度、归一化量 | 无量纲 0–1 | 夹爪、灵巧手 |

:::note 时间参数是秒
`duration` / `wait_timeout` / `timeout`（Operation 与 `wait_for_transform`）以**秒**为单位；`timeout_ms` 与 `poll_timeout_ms` 以**毫秒**为单位。同名参数出现在不同位置时，以后缀为准。
:::

## 位姿与变换

- 位姿统一用 `Pose3d`：`x` / `y` / `z`（米）+ 四元数 `qx` / `qy` / `qz` / `qw`，外加 `frame_id` 与 `stamp_ns`。
- 四元数顺序是 **`(qx, qy, qz, qw)`**，标量在最后。构造时会被归一化，模长接近零抛 `InvalidQuaternionError`。
- 平面位姿用 `Pose2d`：`x` / `y`（米）+ `theta`（弧度）。
- 变换用 `Transform3d`，表示 `^target T_source`，满足 `p_target = R · p_source + t`。做坐标运算用 `fabot.frames.Transform3d`（见 [坐标系与变换](frames.md)），不要用 `fabot.types.Transform3d` 的 wire 表。

`frame_id` 为空串时的含义随上下文变化：

| 位置 | 空串含义 |
|------|----------|
| 命令目标（如 `move_pose` 的 `target.frame_id`） | 用该槽位的缺省基准坐标系 |
| 查询参数（如 `get_pose(frame_id="")`） | 用槽位缺省基准 |
| 通道反馈（如 `pose()` 帧里的 `frame_id`） | 原样保留发布方使用的坐标系名 |

:::warning `stamp_ns = 0` 不是「现在」
`0` 表示**取最新样本 / 不做时间插值**，而不是「查询当前时刻」。要按历史时刻取值必须显式给纳秒时间戳，并落在缓冲区窗口内；越界会抛 `FrameExtrapolationError`（错误信息里带 `earliest_ns` 与 `latest_ns`）。
:::

## 坐标系朝向

关于轴向与旋转方向，SDK 本身能保证的只有这些：

- 右手系（四元数与叉积、`Transform3d` 的复合/逆都按右手系定义）；
- 欧拉角为 **ZYX 内旋**（先绕 Z 转 yaw，再绕 Y 转 pitch，最后绕 X 转 roll），`euler_rpy` 返回 `(roll, pitch, yaw)`；
- 绕 +Z 的正向旋转使 +X 转向 +Y（即从 +Z 俯视是逆时针）。

其余（`base_link` 的 +X 是否指向前方、相机光学系的轴向）由机器人自身的坐标树定义，SDK 不做校正。落地前用一处已知位姿核对：

```python
print(robot.frames.list_frames())
print(robot.frames.to_mermaid())
tf = robot.frames.lookup("base_link", "left_eef")
print(tf.position, tf.euler_rpy)     # 与示教/标定值对照，确认轴向与符号
```

相机光学系在这套坐标树里按 ROS 惯例命名为 `*_optical`，轴向是 +Z 向前、+X 向右、+Y 向下，与机器人本体系不同——所以相机到机体的变换不能只用一个旋转角近似，必须走 `frames.transform_points()` / `deproject_*` 这类带完整位姿的路径。

`robot.frames.list_frames()` 给出当前机器上真实存在的名字；`to_mermaid()` 可以看父子拓扑。名字语法是 `[a-z][a-z0-9_]*` 的分段路径，最多 127 字符。

## 时间戳与时基

- 所有 `stamp_ns` 都是**同一条机器人时基**上的时刻，不要与主机 `time.time()` 混用。
- 相机帧带 `clock_domain` 与 `clock_quality`：跨相机比较时间戳前先确认 `clock_domain` 相同。多相机同步（`robot.skills.camera_sync`）要求同一 `clock_domain`，PTP 锁定状态见 `SyncGroupList.ptp_locked`。
- 共享内存坐标树快照自带 `clock_domain`；跨时基查询会抛 `FrameClockError`。
- 需要测「客户端到机器人」的往返时延时用 `robot.ping()`，不要用两个 `stamp_ns` 相减。

## 关节顺序

`JointState.positions` 的顺序由各能力的关节定义决定，不要在客户端重排：

- 单臂：`robot.left_arm.get_joint().positions` 与 `move_joint(JointPositions(...))` 使用同一顺序，长度必须一致；
- 双臂：用 `DualJointState` / `DualJoints`，左右各自保持单臂顺序；
- 全身：`motion.get_joint()` 返回 `WholeBodyJointState`，顺序与 `motion.move_joint(WholeBodyJointTarget(...))` 一致；
- 灵巧手：`hand.get_joint()` 与 `hand.move_joint(list[float])` 按手指顺序一一对应。

顺序不一致时平台会以参数非法拒绝；需要确认具体索引含义时，用 `robot.<slot>.as_adapter(...)` 读该适配器的配置或文档，或直接读 `get_joint()` 的当前值与单关节小幅运动做对照。

## 相关

- 坐标树查询、变换代数与像素反投影：[坐标系与变换](frames.md)
- 相机内外参与多相机同步：[相机 Camera](../reference/python/camera.md)、[技能与扩展](skills.md)
- 通用类型字段：[通用类型与枚举](../reference/python/types.md)
