---
title: 故障排除
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 故障排除

按症状组织的排查条目。通用定位手段：所有失败调用抛出带 `code`（诊断码）/ `retryable` / `trace_id` 的 `FabotError` 子类（见 [错误处理](usage/errors.md)）；整机状态与故障用 `robot.state()` / `robot.faults()` 查询（见 [状态、故障与生命周期](usage/status-faults.md)）；异步变化经事件推送（见 [事件与数据通道](usage/events-channels.md)）。

## 连不上

`Robot.connect` / `from_endpoint` / `from_config` 阻塞至连接建立，失败抛 `FabotError`。先按错误类型定位：

| 现象 | 可能原因 | 排查 |
|------|----------|------|
| `TransportError` / `Unavailable` / `Timeout` | 网络不通、控制面未运行、端口被拦 | 确认控制面端点（IP 与端口，默认 7557）正确且网络可达；确认机器人平台已启动；放行防火墙 |
| `Unauthorized` | 鉴权失败 | 核对 `ClientConfig.auth_token` |
| `ProtocolIncompatible` | SDK 与机器人平台版本不配套 | 核对版本配套关系，见 [版本配套](install/compatibility.md) |

其他检查项：

- 确认 SDK 安装无误：`import fabot` 应正常导入，见 [安装 Python SDK](install/python.md)。
- 想先排除机器人侧因素，可用 `Robot.mock()` 离线跑通流程，见 [Mock 测试](usage/mock.md)。

```python
from fabot import Robot, FabotError

try:
    robot = Robot.connect("192.168.1.10", 7557)
except FabotError as e:
    print(hex(e.code), e.retryable, e.message, e.trace_id)
```

连接建立后运行中断线：用 `robot.connection.is_connected()` 查询当前状态，或用 `robot.connection.subscribe(cb)` 订阅连接变化，断线后重建 `Robot` 连接。`retryable == True` 的错误可按退避策略重试，见 [错误处理](usage/errors.md)。连接建立的完整说明见 [连接与 Robot 入口](usage/connection.md)。

## wait_ready

`wait_ready(slots=None)` 只等待**已绑定且 `enabled` + `essential`** 的槽位：未绑定、被禁用或非必需的槽位直接跳过，不予等待。单个槽位的解析超时由 `ClientOptions.resolve_timeout_ms`（默认 1000 毫秒）控制，解析失败抛异常。语义详见 [Robot 入口](reference/python/robot.md)。

常见误解与排查：

- **"等了但槽位仍不可用"**：该槽位可能被跳过。先用 `robot.<slot>.has_adapter` 确认槽位已绑定；未绑定时 `get_config()` / `as_adapter()` 抛 `AdapterUnbound`，能力方法下发后会失败或超时。绑定与 `enabled` / `required` 配置见 [配置管理](usage/configuration.md)。
- **抛超时类异常**：对应 adapter 可能未启动或尚未就绪。查 `robot.<slot>.lifecycle()` 确认生命周期是否到 `Active`、`health()` 是否可用；机器人侧启动较慢时增大 `resolve_timeout_ms`。
- **等待范围过大**：用 `robot.wait_ready(["left_arm", "io"])` 只等业务需要的槽位，避免被无关槽位拖住。
- 不要在事件回调（SDK I/O 线程）里调用 `wait_ready` 等阻塞 API，否则抛 `ClientThreadError`。

```python
from fabot import Robot, FabotError
from fabot.core import ClientOptions

options = ClientOptions(resolve_timeout_ms=5000)
with Robot.connect("192.168.1.10", 7557, options) as robot:
    if robot.left_arm.has_adapter:
        try:
            robot.wait_ready(["left_arm"])
        except FabotError as e:
            print(hex(e.code), e.message)
            print(robot.left_arm.lifecycle(), robot.left_arm.health())
```

## Operation 失败

长时任务（导航、机械臂轨迹等）返回的 Operation 不抛异常表示失败，失败体现在快照里。用法详见 [命令与长时操作](usage/commands-operations.md)。

排查步骤：

1. 等到终态：`snapshot.terminal` 为 `True` 后状态不再推进；终态为 `Succeeded` / `Failed` / `Canceled` / `Timeout` 之一。
2. 取失败原因：`Failed` / `Timeout` 时读 `snapshot.error`（`FabotError`），看 `code` / `retryable` / `trace_id`；进度描述看 `snapshot.feedback.status_message`；终态结果看 `snapshot.result`。
3. 按类别处理：`retryable == True` 的可重试；`Canceled` 说明任务被取消（`cancel()` 是尽力而为，已进入执行段的任务由服务端决定是否可中断）；`ResourceConflict` 说明资源被占用——策略为 `queue` 的资源会排队，策略为 `reject` 的会直接拒绝。
4. 需要进一步定位时，用 `snapshot.error.trace_id` 关联机器人侧日志（`robot.logs.history()` / `robot.logs.subscribe()` 的 `LogRecord` 带 `trace_id`），见 [日志、指标与可观测性](usage/observability.md)。

```python
from fabot.core import OperationState
from fabot.types import JointPositions

positions = list(robot.left_arm.get_joint().positions)
op = robot.left_arm.move_joint(JointPositions(positions=positions), duration=2.0)
for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    if snap.terminal:
        if snap.state is OperationState.Succeeded:
            print(snap.result)
        else:
            err = snap.error
            print(snap.state, hex(err.code) if err else None, err.message if err else "")
        break
```

若 Operation 长时间停在 `Queued`：同资源上有前序任务在执行，等新任务排队轮到；确认没有遗忘调用的旧任务句柄。

## 急停后恢复

急停是整机闩锁：触发后 `robot.state().mode` 进入 `RobotMode.Estopped`。确认现场安全后按以下步骤恢复（API 详见 [Robot 入口](reference/python/robot.md) 的 estop 一节）：

1. 确认触发状态与来源：`robot.estop.state()` 返回 `EstopState`（`asserted` / `reason` / `source_id`）；`robot.state().is_estopped` 为 `True`。急停变化也可通过 `robot.events.estop_changed` 订阅。
2. 解除闩锁：确认现场安全后调用 `robot.estop.release(reason="...")`。
3. 确认已脱离急停：再查 `robot.state()`，确认 `mode` 不再是 `Estopped`。若 `release` 后仍为 `Estopped`，按 `EstopState.reason` / `source_id` 定位仍保持急停的来源。
4. 检查遗留故障：`robot.faults()` 查看急停期间记录的故障（每条 `FaultState` 的 `code` / `severity`）；对业务用到的槽位查 `lifecycle()` / `health()`，确认生命周期回到 `Active`、健康度正常后再继续下发任务。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    estop = robot.estop.state()
    if estop.asserted:
        print(estop.reason, estop.source_id)
        robot.estop.release(reason="site check done")

    st = robot.state()
    if not st.is_estopped:
        print(st.mode, st.health)
        for record in robot.faults().chassis.records:
            print(hex(record.code), record.severity)
        print(robot.chassis.lifecycle())
```

## 坐标系查询失败

`robot.frames.lookup()` 抛 `FrameError` 的子类时，按类型区分原因（详见 [坐标系与变换](usage/frames.md)）：

| 异常 | 原因 | 处理 |
|------|------|------|
| `FrameNotFoundError` | 坐标名不在树里 | 用 `robot.frames.list_frames()` 核对名字；启动早期用 `wait_for_transform()` |
| `FrameConnectivityError` | 两个坐标不在同一棵树 | 检查是否有中间坐标缺失，用 `to_mermaid()` 看拓扑 |
| `InvalidFrameNameError` | 名字不符合语法 | 只允许小写字母、数字、下划线，段之间用 `/` |
| `FrameTimeoutError` | 等待超时 | 加长 `timeout`，或确认发布方已启动 |
| `FrameAuthorityError` | 覆盖受保护边 / 权限不足 | 换更大的 `authority`，或避免覆盖运动学边 |

## 相机抓帧超时

`capture()` 抛 `Timeout` 时按顺序检查：

1. 相机是否在出流：`robot.head_camera.status().color_active` 与 `state`（应为 `streaming`）。能力激活后会自动开流；配置异常时用 `open()` 显式开。
2. 会话状态：`get_state()` 的 `awaiting_external_trigger` 为 `True` 表示在等外部触发，需要 `trigger()` 或外部信号。
3. 帧年龄：`wait_for_fresh=True` 且 `max_age_ms` 很小时，低帧率流会频繁超时，适当放大 `max_age_ms` 或放宽 `timeout_ms`。
4. 传输方式：大帧优先走共享内存，跨主机时共享内存不可用，SDK 会自动回退内联传输；内联传大图会明显变慢。
