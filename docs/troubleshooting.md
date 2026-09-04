---
title: 故障排除
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 故障排除

按症状组织的排查条目。通用定位手段：所有失败调用抛出带 `code` / `category` / `retryable` / `trace_id` 的 `FabotError` 子类（见 [错误处理](usage/errors.md)）；整机状态与故障用 `robot.state()` / `robot.faults()` 查询（见 [状态、故障与生命周期](usage/status-faults.md)）；异步变化经事件推送（见 [事件与数据通道](usage/events-channels.md)）。

## 连不上

`Robot.connect` / `from_endpoint` / `from_config` 阻塞至连接建立，失败抛 `FabotError`。先按错误的 `category` 分类定位：

| 异常（category） | 可能原因 | 排查 |
|------------------|----------|------|
| `TransportError` / `Unavailable` | 网络不通、控制面未运行 | 确认机器人控制面端点（IP 与端口，默认 7557）正确且网络可达；确认机器人平台已启动 |
| `Unauthorized` | 鉴权失败 | 核对 `ClientConfig.auth_token` |
| `ProtocolIncompatible` | SDK 与机器人平台版本不配套 | 核对 SDK 与平台版本配套关系，见 [版本配套](install/compatibility.md) |

其他检查项：

- 确认 SDK 安装无误：`import fabot` 应正常导入，见 [安装 Python SDK](install/python.md)。
- 想先排除机器人侧因素，可用 `Robot.mock()` 离线跑通流程，见 [Mock 测试](usage/mock.md)。

```python
from fabot import Robot, FabotError

try:
    robot = Robot.connect("192.168.1.10", 7557)
except FabotError as e:
    print(e.category, e.code, e.message, e.retryable)
```

连接建立后运行中断线：用 `robot.connection.is_connected()` 查询当前状态，或用 `robot.connection.subscribe(cb)` 订阅连接变化，断线后重建 `Robot` 连接。`retryable == True` 的错误可按退避策略重试，见 [错误处理](usage/errors.md)。连接建立的完整说明见 [连接与 Robot 入口](usage/connection.md)。

## wait_ready

`wait_ready(slots=None)` 只等待**已绑定且 `enabled` + `required`** 的槽位：未绑定、被禁用或 `required=False` 的槽位直接跳过，不予等待。单个槽位的解析超时由 `ClientOptions.resolve_timeout_ms`（默认 1000 毫秒）控制，解析失败抛异常。语义详见 [Robot 入口](reference/python/robot.md)。

常见误解与排查：

- **"等了但槽位仍不可用"**：该槽位可能被跳过。先用 `robot.<slot>.has_adapter` 确认槽位已绑定；未绑定时访问其能力方法会抛 `AdapterUnbound`（`NotFound`，6002）。绑定与 `enabled` / `required` 配置见 [配置管理](usage/configuration.md)。
- **抛超时类异常**：对应 adapter 可能未启动或尚未就绪。查 `robot.<slot>.lifecycle()` 确认生命周期是否到 `Active`、健康度是否正常；机器人侧启动较慢时增大 `resolve_timeout_ms`。
- **等待范围过大**：用 `robot.wait_ready(["left_arm", "io"])` 只等业务需要的槽位，避免被无关槽位拖住。
- 不要在事件回调（SDK I/O 线程）里调用 `wait_ready` 等阻塞 API，否则抛 `ClientThreadError`（6003）。

```python
from fabot.core import ClientOptions
from fabot import Robot, FabotError

options = ClientOptions(resolve_timeout_ms=5000)
with Robot.connect("192.168.1.10", 7557, options) as robot:
    if robot.left_arm.has_adapter:
        try:
            robot.wait_ready(["left_arm"])
        except FabotError as e:
            print(e.category, e.message)
            print(robot.left_arm.lifecycle())
```

## Operation 失败

长时任务（导航、机械臂轨迹等）返回的 Operation 不抛异常表示失败，失败体现在快照里。用法详见 [命令与长时操作](usage/commands-operations.md)。

排查步骤：

1. 等到终态：`snapshot.terminal` 为 `True` 后状态不再推进；终态为 `Succeeded` / `Failed` / `Canceled` / `Timeout` 之一。
2. 取失败原因：`Failed` / `Timeout` 时读 `snapshot.error`（`FabotError`），看 `code` / `category` / `retryable` / `trace_id`；进度描述看 `snapshot.feedback.statusMessage`；终态结果看 `snapshot.result`。
3. 按类别处理：`Timeout` / `Unavailable` 且 `retryable == True` 的可重试；`Canceled` 说明任务被取消（`cancel()` 是尽力而为，已进入执行段的任务由服务端决定是否可中断）；`ResourceConflict` 说明资源被占用，同资源的新任务会排队。
4. 需要进一步定位时，用 `snapshot.error.trace_id` 关联机器人侧日志（`robot.logs.subscribe` 订阅的 `LogRecord` 带 `trace_id` 字段）。

```python
from fabot.core.types import OperationState

op = robot.left_arm.move_joints(positions=positions, wait=True)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    if snap.terminal:
        if snap.state is OperationState.Succeeded:
            print(snap.result)
        else:
            err = snap.error
            print(snap.state, err.code, err.category, err.message, err.trace_id)
        break
```

若 Operation 长时间停在 `Queued`：同资源上有前序任务在执行，等新任务排队轮到；确认没有遗忘调用的旧任务句柄。

## 急停后恢复

急停是整机闩锁：触发后整机运行状态进入 `RobotRunState.Estopped`。确认现场安全后按以下步骤恢复（API 详见 [Robot 入口](reference/python/robot.md) 的 estop 一节）：

1. 确认触发状态与来源：`robot.estop.state()` 返回 `EstopState`（`asserted` / `reason` / `source_id`）；`robot.state().is_estopped` 为 `True`。急停变化也可通过 `robot.events.estop_changed` 订阅。
2. 解除闩锁：确认现场安全后调用 `robot.estop.release(reason="...")`。
3. 确认已脱离急停：再查 `robot.state()`，确认不再是 `Estopped`。若 `release` 后仍为 `Estopped`，按 `EstopState.reason` / `source_id` 定位仍保持急停的来源。
4. 检查遗留故障：`robot.faults()` 查看急停期间记录的故障；对业务用到的槽位查 `robot.<slot>.lifecycle()` / `health()`，确认生命周期回到 `Active`、健康度正常后再继续下发任务。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    estop = robot.estop.state()
    if estop.asserted:
        print(estop.reason, estop.source_id)
        robot.estop.release(reason="site check done")

    if not robot.state().is_estopped:
        faults = robot.faults()
        print(faults.revision)
        print(robot.chassis.lifecycle())
```
