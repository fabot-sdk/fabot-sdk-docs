---
title: 诊断码参考
status: draft
owner: fabot-core
updated: 2026-11-16
---

# 诊断码参考

SDK 上报的错误与故障都用同一个 32 位诊断码标识。本页说明编码结构、按域 / 模块的分布，以及怎么把码变成可读文本和可执行的处置动作。逐条文案由随 SDK 嵌入的文本目录提供，用 `Catalogs` 查询，见 [文本目录 Catalogs](../../usage/catalogs.md)。

## 编码结构

```text
code = (domain << 24) | (module << 16) | reason
```

| 位段 | 宽度 | 含义 |
|------|------|------|
| domain | 高 8 位 | 领域：整机 / 底盘 / 上身 |
| module | 中 8 位 | 领域内的模块 |
| reason | 低 16 位 | 模块内的具体原因 |

- `0x00000000` 同时表示「无故障」和「调用成功」。
- 展示时统一写成 `0x` + 8 位十六进制大写，例如 `0x010E0001`。
- 同一个原因既可能作为瞬态错误码（`FabotError.code`）出现，也可能作为持续故障（`FaultState.code`）出现，两者编码一致。
- 保留区间：domain `0x00` 与 `0xFF` 不可分配；module `0x00` 是领域级公共，`0xFF` 是未知模块；reason `0x0000` 是无故障，`0xF000–0xFFEF` 是实验段，`0xFFF0–0xFFFF` 保留。

## 领域

| domain | key | 中文名 |
|--------|-----|--------|
| `0x01` | `robot` | 整机 |
| `0x02` | `chassis` | 底盘 |
| `0x03` | `body` | 上身 |

## 模块

### 整机（domain `0x01`）

| module | key | 中文名 |
|--------|-----|--------|
| `0x00` | `common` | 领域级公共 |
| `0x07` | `pdu` | 配电与输出通道 |
| `0x0A` | `compute` | 算力平台 |
| `0x0B` | `teleop` | 手柄遥操 |
| `0x0C` | `middleware` | 中间件 |
| `0x0D` | `bus` | 通信总线 |
| `0x0E` | `sdk` | SDK |

### 底盘（domain `0x02`）

| module | key | 中文名 |
|--------|-----|--------|
| `0x00` | `common` | 领域级公共 |
| `0x01` | `controller` | 底盘控制器 |
| `0x02` | `wheel_motor` | 轮毂电机 |
| `0x03` | `steer_motor` | 转向电机 |
| `0x05` | `lidar` | 激光雷达 |
| `0x06` | `imu` | IMU |
| `0x07` | `board` | 电源板 |
| `0x08` | `battery` | 电池 |
| `0x09` | `bms` | BMS |
| `0x0A` | `safety` | 安全 |
| `0x0B` | `remote` | 遥控器 |
| `0x0C` | `charger` | 充电仓充电机 |

### 上身（domain `0x03`）

| module | key | 中文名 |
|--------|-----|--------|
| `0x00` | `common` | 领域级公共 |
| `0x02` | `joint_motor` | 关节电机 |
| `0x03` | `arm` | 机械臂 |
| `0x04` | `gripper` | 夹爪 |
| `0x05` | `hand` | 灵巧手 |
| `0x06` | `lift` | 升降柱 |
| `0x09` | `stereo_camera` | 双目相机 |
| `0x0A` | `rgbd_camera` | RGBD 相机 |
| `0x0B` | `camera` | 相机 |
| `0x0D` | `audio` | 音频通道 |
| `0x0E` | `light` | 灯光 |
| `0x0F` | `screen` | 面屏 |

### SDK 自身的错误（`0x010E`）

`0x010E` 段是 SDK / 能力运行时最常遇到的一类，全部可重试性由错误子类决定：

| code | 含义 |
|------|------|
| `0x010E0001` | 能力尚未就绪，不能接受本次调用 |
| `0x010E0002` | 能力正在执行冲突的调用 |
| `0x010E0003` | 调用参数超出允许范围 |
| `0x010E0004` | 所需硬件离线 |
| `0x010E0005` | 能力不支持该操作 |
| `0x010E0006` | 调用所需的前置条件不满足 |
| `0x010E0007` | 没有能力实例匹配该请求 |
| `0x010E0008` | 匹配的能力实例不健康 |
| `0x010E0009` | 匹配的能力实例版本不兼容 |
| `0x010E000A` | 多个健康实例同时匹配该请求 |
| `0x010E000B` | 命令目标与本能力实例不符 |
| `0x010E000C` | 能力不在激活生命周期状态 |

坐标系相关的 `0x010E95xx` 段（`FrameNotFound` / `FrameDisconnected` / `FrameExtrapolation` 等）见 [坐标系与变换](../../usage/frames.md)。

## 查文案

```python
from fabot import Catalogs, FabotError

catalogs = Catalogs.load("zh-CN")

try:
    robot.chassis.servo_twist(vx=0.3, vy=0.0)
except FabotError as err:
    print(hex(err.code), catalogs.format_error(err))

for record in robot.faults().chassis.records:
    print(hex(record.code), record.severity, catalogs.format_fault(record))
```

- 查找顺序：错误表 → 故障表 → `error.message` → 原始 `0xXXXXXXXX`。所以 SDK 比平台旧时不会显示空白。
- `format_error` / `format_fault` 都接受裸整数码或带 `code` 的对象。
- `Catalogs.load()` 不访问机器人，纯查随 SDK 嵌入的快照；升级 SDK 才能拿到新码的文案。

## 处置策略

判断顺序固定为：**码 → 错误类别 → 是否幂等 → 是否重试**。

| 类别 | 典型码段 | 建议 |
|------|----------|------|
| `InvalidArgument` | `0x010E0003` / `0x010E0005` | 不重试；修参数或换接口 |
| `Unavailable` / `TransportError` | `0x010E0004` / `0x030Fxxxx` | 可退避重试；先确认机器人在线 |
| `ResourceConflict` | `0x010E0002` | 看资源策略：`queue` 会排队，`reject` 应放弃 |
| `Timeout` | 各能力 | 可重试，但先用 `get_*` 确认上一次是否已生效 |
| `ProtocolIncompatible` | 连接时 | 不重试；核对两端版本 |
| 故障类（`FaultState`） | 各域模块 | 故障是持续状态，按 `severity` 决定降级 / 停机，不要当异常重试 |

重试与幂等的完整规则见 [并发、线程与安全](../../usage/concurrency-and-safety.md)。

## 常用排查映射

| 症状 | 先看哪些码段 |
|------|--------------|
| 连不上机器人 | `0x030Fxxxx`（连接）、`0x010Cxxxx`（协议信封） |
| 底盘不动 | `0x0201xxxx`（控制器）、`0x0202xxxx`（轮毂电机）、`0x0203xxxx`（转向） |
| 单关节不响应 | `0x0202xxxx` / `0x0203xxxx`（关节电机）、`0x0303xxxx`（机械臂） |
| 相机无帧 | `0x0300xxxx`（相机）、`0x0309xxxx` / `0x030Axxxx` / `0x030Bxxxx` |
| 语音无声音 | `0x030Dxxxx`（音频通道） |
| 升降柱不动 | `0x0306xxxx`（升降柱，逐条见 [升降柱 Lift](lift.md#常见故障码)）、`0x0310xxxx`（雷赛驱动器） |
| 电池 / 充电异常 | `0x0107xxxx`（电池）、`0x0208xxxx`（电池原始码）、`0x020Cxxxx`（充电机） |
| 遥操作手柄无输入 | `0x010Bxxxx`（手柄）、`0x010Dxxxx`（CAN 总线） |
| 温度告警 | `0x010Axxxx`（热保护） |

:::note 码表会随平台演进
上面的域 / 模块分配是稳定的，具体 reason 会随版本增加。遇到本文未列出的码，以 `Catalogs` 的实际返回为准；如果查不到文案，说明 SDK 比平台旧，见 [版本配套](../../install/compatibility.md)。
:::
