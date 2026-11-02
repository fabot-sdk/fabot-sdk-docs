---
title: Robot 入口
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Robot 入口

`Robot` 是 Python SDK 的统一入口：建立连接、按槽位暴露能力 Proxy、聚合整机急停 / 状态 / 故障，并给出日志、指标、事件、坐标系、配置、服务与技能的入口。连接的生命周期与选项见 [连接与 Robot 入口](../../usage/connection.md)。

## connect

`connect` / `from_endpoint` / `from_config` 建立连接；`close()` 或 `with` 上下文关闭。

```python
Robot.connect(host: str | None = None, port: int = 7557, options: ClientOptions | None = None, *, config: ClientConfig | None = None, wait_ready: bool = False) -> Robot
Robot.from_endpoint(ip: str, port: int, options: ClientOptions | None = None) -> Robot
Robot.from_config(config: ClientConfig | None = None, options: ClientOptions | None = None) -> Robot
Robot.from_backend(backend, options: ClientOptions | None = None) -> Robot
Robot.mock() -> MockRobot
robot.close() -> None
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `host` | `str \| None` | `None` | 控制面地址；`None` 表示按配置缺省发现端点 |
| `port` | `int` | `7557` | 控制面端口 |
| `options` | `ClientOptions` | `None` | 超时与缓存选项，见下表 |
| `config` | `ClientConfig` | `None` | 客户端标识与传输选项，见下表；与 `host` 互斥 |
| `wait_ready` | `bool` | `False` | 为 `True` 时在返回前顺带调用 `wait_ready()` |

`connect` 同时传 `host` 与 `config` 会抛 `TypeError`。`from_endpoint` 是显式端点写法；`from_backend` 接入自定义传输后端（高级用法）；`mock()` 返回无需真实机器人的 `MockRobot`，见 [Mock 测试](../../usage/mock.md)。

`ClientConfig`（客户端标识与传输）：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `client_id` | `str` | `"fabot_sdk"` | 客户端标识 |
| `zenoh_config_file` | `str` | `""` | 自定义传输配置文件路径 |
| `auth_token` | `bytes` | `b""` | 认证令牌 |
| `max_control_message_bytes` | `int` | `1048576` | 控制消息上限（字节） |

`ClientOptions`（超时与缓存）：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `resolve_timeout_ms` | `int` | `1000` | 槽位解析超时（毫秒），也是 `wait_ready` 单槽位等待上限 |
| `command_timeout_ms` | `int` | `3000` | Command 默认超时（毫秒） |
| `resolve_cache_ttl_ms` | `int` | `30000` | 解析缓存有效期（毫秒） |
| `resolve_cache_capacity` | `int` | `256` | 解析缓存容量 |
| `completion_executor` | — | `None` | 异步回调的完成执行器 |
| `channel_renew_threads` | `int` | `2` | 通道续租工作线程数（全客户端共享） |
| `preview_host` | `str` | `""` | 由 `from_endpoint` 记录的路由器主机，用于改写回环预览地址 |

工厂方法阻塞至连接建立，失败抛 `FabotError`；不得在事件回调（SDK I/O 线程）中调用，否则抛 `ClientThreadError`。`close()` 关闭全部订阅与连接；`with` 上下文退出时自动 `close()`。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print(robot.sdk_version, robot.version())
```

## wait_ready

`wait_ready(slots=None)` 阻塞等待指定槽位（默认全部）可用。

```python
wait_ready(slots: Sequence[str] | None = None) -> None
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `slots` | `Sequence[str]` | `None` | 要等待的槽位 id；`None` 表示全部 23 个槽位 |

语义：读取当前槽位配置，对每个**已启用、必需（`essential`）且已绑定 adapter** 的目标槽位阻塞解析句柄；未绑定、被禁用或非必需的槽位直接跳过。单槽位解析超时由 `ClientOptions.resolve_timeout_ms` 控制，解析失败抛异常。

```python
robot.wait_ready()                       # 全部已绑定槽位
robot.wait_ready(["left_arm", "io"])     # 只等指定槽位
```

## slots

能力以只读属性按槽位暴露，共 23 个槽位；`robot.slots` 返回 `dict[str, object]` 形式的全部槽位 Proxy。

| 槽位属性 | 能力 id | 文档 |
|----------|---------|------|
| `body` | `body` | [躯干 Body](body.md) |
| `left_arm` / `right_arm` | `arm` | [机械臂 Arm](arm.md) |
| `left_hand` / `right_hand` | `hand` | [灵巧手 Hand](hand.md) |
| `left_gripper` / `right_gripper` | `gripper` | [夹爪 Gripper](gripper.md) |
| `head` | `head` | [头部 Head](head.md) |
| `chassis` | `chassis` | [底盘 Chassis](chassis.md) |
| `power_1` / `power_2` | `power` | [电源 Power](power.md) |
| `io` | `io` | [IO](io.md) |
| `motion` | `motion` | [运动 Motion](motion.md) |
| `teleop` | `teleop` | [遥操作 Teleop](teleop.md) |
| `arms` | `arms` | [双臂 Arms](arms.md) |
| `head_camera` / `chest_camera` / `waist_camera` | `camera` | [相机 Camera](camera.md) |
| `left_wrist_camera` / `right_wrist_camera` | `camera` | [相机 Camera](camera.md) |
| `screen` | `screen` | [面屏 Screen](screen.md) |
| `light` | `light` | [灯效 Light](light.md) |
| `voice` | `voice` | [语音 Voice](voice.md) |

所有槽位 Proxy 的公共成员：

| 成员 | 说明 |
|------|------|
| `slot_id` | 槽位 id |
| `handle` | 槽位句柄 `SlotHandle`（惰性解析，解析失败抛异常） |
| `events` | 该槽位的类型化事件入口 |
| `health()` | 当前健康度 `SlotHealth` |
| `lifecycle()` | `CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`） |
| `faults()` | 该槽位当前故障袋 `Faults` |
| `ping(...)` | 运行库往返时延探测，返回 `PingReport` |
| `has_adapter` | 槽位是否已绑定 adapter（只读属性） |
| `as_adapter(adapter_type)` | 转为 `fabot.adapters` 下的强类型 adapter 视图 |
| `get_config()` / `set_config()` / `edit_config()` | 该槽位 adapter 配置域读写，见 [配置管理](../../usage/configuration.md) |

槽位未绑定 adapter 时，能力方法本身仍会下发（平台侧返回失败或超时），`as_adapter()` 与 `get_config()` 则会抛 `AdapterUnbound`（属 `NotFound`）；用 `has_adapter` 先判断。`as_adapter` 要求 `adapter_type` 暴露 `ADAPTER_ID`（否则 `TypeError`）；槽位未绑定抛 `AdapterUnbound`，绑定的 adapter 与 `adapter_type` 不符抛 `AdapterMismatch`。

```python
if robot.left_arm.has_adapter:
    print(robot.left_arm.get_joint().positions)

from fabot.adapters import Arm

arm = robot.left_arm.as_adapter(Arm)
```

## estop

`robot.estop` 提供 `engage` / `release` / `state`，三个方法均返回最新的 `EstopState` 快照；`is_asserted` 属性是 `state().asserted` 的便捷写法。

```python
robot.estop.engage(reason: str = "", source: str = "") -> EstopState
robot.estop.release(reason: str = "", source: str = "") -> EstopState
robot.estop.state() -> EstopState
robot.estop.is_asserted -> bool
```

**参数**（`engage` / `release`）

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `reason` | `str` | `""` | 触发 / 解除原因 |
| `source` | `str` | `""` | 来源标识 |

**`EstopState` 字段**

| 字段 | 类型 | 说明 |
|------|------|------|
| `asserted` | `bool` | 急停是否处于触发状态 |
| `revision` | `int` | 状态修订号 |
| `asserted_at_us` / `cleared_at_us` | `int` | 最近触发 / 解除的时间戳（微秒） |
| `reason` | `str` | 触发原因 |
| `source_id` | `str` | 触发来源 id |

`engage` 触发整机急停闩锁，`robot.state().mode` 进入 `RobotMode.Estopped`（`robot.state().is_estopped` 为 `True`）；`release` 解除闩锁。急停变化通过 `robot.events.estop_changed` 推送。恢复步骤：确认现场安全后 `release`，再查 `robot.state()` 确认已脱离 `Estopped`，并通过 `robot.faults()` 检查急停期间记录的故障。

```python
state = robot.estop.engage(reason="safety check")
print(state.asserted, state.reason)

robot.estop.release(reason="check done")
print(robot.estop.state().asserted)
```

## state / status / faults

整机状态分三个层次：运行状态（`state()`）、能力状态袋聚合（`status()`）、故障聚合（`faults()`）。三者都是主动查询，没有订阅接口，变化走事件。模型见 [状态、故障与生命周期](../../usage/status-faults.md)。

| 方法 | 返回 | 说明 |
|------|------|------|
| `state()` | `RobotState` | 整机运行模式、健康度、根因与分域健康 |
| `status()` | `RobotStatus` | 各能力状态袋聚合 |
| `faults()` | `RobotFaults` | 全部槽位当前故障聚合 |
| `version()` | `str` | 机器人平台版本 |
| `sdk_version` | `str` | SDK 自身版本（属性） |

`RobotState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `mode` | `RobotMode` | `Unknown` / `Idle` / `Running` / `Estopped` |
| `health` | `HealthState` | `Unknown` / `Normal` / `Degraded` / `Fault` / `Fatal` |
| `root_causes` | `list[DiagnosticReason]` | 健康度不为 `Normal` 时的结构化根因；正常时为空 |
| `domains` | `list[DomainHealth]` | 按域聚合的健康度与根因，按域键排序 |
| `revision` | `int` | 状态修订号 |
| `timestamp_us` | `int` | 最近一次状态或根因变化的时刻（微秒） |
| `source_instance_id` | `str` | 来源实例 id |

便捷属性：`is_running` / `is_idle` / `is_estopped`（看 `mode`），`is_normal` / `is_degraded` / `is_fault` / `is_fatal`（看 `health`）。运行模式与健康度是两条独立的轴：急停只改变 `mode`，`health` 仍由故障与自检决定。

`RobotStatus`：`generation` / `revision` 加上各能力状态袋字段 `power_1` / `power_2` / `head_camera` / `chest_camera` / `waist_camera` / `left_wrist_camera` / `right_wrist_camera` / `screen` / `voice`。只有提供 `status()` 的能力参与聚合，其余字段保持默认值。

`RobotFaults`：`revision` 加 23 个槽位故障袋字段（`body` / `left_arm` / `right_arm` / `left_hand` / `right_hand` / `left_gripper` / `right_gripper` / `head` / `chassis` / `power_1` / `power_2` / `io` / `motion` / `teleop` / `arms` / `head_camera` / `chest_camera` / `waist_camera` / `left_wrist_camera` / `right_wrist_camera` / `screen` / `light` / `voice`），每袋含 `revision` 与 `records: list[FaultState]`。

```python
st = robot.state()
print(st.mode, st.health)
for cause in st.root_causes:
    print(cause.code, cause.source)

agg = robot.status()
print(agg.generation, agg.power_1.energy, agg.screen.activity)

faults = robot.faults()
print(faults.revision, faults.chassis.records)
```

## events

`robot.events` 订阅整机事件，也可以向事件总线发布自定义事件。

```python
robot.events.subscribe(callback, *, name: str | None = None, slot: str | None = None, on_error=None) -> SubscriptionToken
robot.events.emit(event_or_name, payload=None, *, level=..., attrs=None, slot: str = "", capability_id: str = "", code: int = 0, duration_ms: int = 0, trace_id: str = "", ts_us: int = 0) -> None
```

**参数**（`subscribe`）

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `callback` | `Callable[[Event], None]` | （必填） | 收到原始 `Event`，用事件类型的 `matches()` / `from_event()` 解码 |
| `name` | `str` | `None` | 只收该事件名 |
| `slot` | `str` | `None` | 只收该槽位的事件 |
| `on_error` | — | `None` | 投递错误回调，不传则在回调线程抛出 |

类型化入口（各自只推送一种事件）：

| 入口 | 事件类型 | payload |
|------|----------|---------|
| `estop_changed` | `EstopChangedEvent` | `estop`：`EstopState` |
| `robot_state_changed` | `RobotStateChangedEvent` | `robot_state`：`RobotState` |
| `registry_changed` | `RegistryChangedEvent` | `registry`：`RegistryEvent`（`registry_revision` / `capability_id`） |
| `config_changed` | `ConfigChangedEvent` | `config`：`ConfigState` |
| `service_state_changed` | `ServiceStateChangedEvent` | `service_state`：`ServiceState`（`is_running` / `is_ready` 便捷属性） |
| `faults_changed` | `FaultsChangedEvent` | `faults`：`RobotFaults`（按槽位组织的类型化故障袋） |

每个事件都带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。订阅均返回 `SubscriptionToken`，用 `token.close()` 退订；`robot.close()` 统一关闭全部订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。

```python
def on_estop(event):
    print(event.header.timestamp_us, event.estop.asserted, event.estop.reason)

token = robot.events.estop_changed.subscribe(on_estop)
# ...
token.close()
```

注意 `faults_changed` 的 payload 与 `faults()` 不同：事件里是按槽位组织的 `RobotFaults`，而原始总线上是扁平的 `RobotFaultSnapshot`。见 [事件与数据通道](../../usage/events-channels.md)。

## logs

`robot.logs` 订阅与查询结构化日志，并可上报自定义日志与冻结快照。

```python
robot.logs.subscribe(callback, min_level=..., *, slot=None, on_error=None) -> SubscriptionToken
robot.logs.history(min_level=..., *, slot=None, unit=None, limit: int = 200) -> list[LogRecord]
robot.logs.emit(log, *, level=..., action=..., component=..., slot=..., attrs=None, trace_id=..., unit=..., domain=..., module=..., source=..., code=..., ts_us=...) -> None
robot.logs.debug(message: str, **kwargs) -> None
robot.logs.info(message: str, **kwargs) -> None
robot.logs.warn(message: str, **kwargs) -> None
robot.logs.error(message: str, **kwargs) -> None
robot.logs.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
```

| 成员 | 说明 |
|------|------|
| `subscribe(...)` | 实时日志流；`min_level` 取 `LogLevel.Debug` / `Info` / `Warn` / `Error`，`slot` 只收该槽位 |
| `history(...)` | 从观测侧拉取历史日志尾部，`unit` 按运行单元过滤，`limit` 默认 200 条 |
| `emit(...)` | 上报一条或一批 `LogRecord`，也可直接传字符串；`debug` / `info` / `warn` / `error` 是便捷包装 |
| `freeze(...)` | 请求观测侧冻结飞行记录器快照，用于事后分析 |

`LogRecord` 主要字段：`ts_us` / `level` / `component` / `action` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `attrs` / `identity`（`unit` / `domain` / `module` / `source`）/ `code` / `src` / `seq` / `is_raw`。

```python
from fabot.core import LogLevel

token = robot.logs.subscribe(lambda r: print(r.level, r.message), min_level=LogLevel.Warn)
robot.logs.info("application started", component="app", domain="integration")
recent = robot.logs.history(min_level=LogLevel.Error, limit=50)
token.close()
```

## metrics

`robot.metrics` 订阅指标、读取 SDK 自身指标，并上报自定义指标。

```python
robot.metrics.subscribe(callback, *, name=None, unit=None, on_error=None) -> SubscriptionToken
robot.metrics.snapshot() -> SdkMetricSnapshot
robot.metrics.records() -> list[MetricRecord]
robot.metrics.emit(metric, value=None, *, metric_type=..., labels=None, unit=..., domain=..., module=..., source=..., ts_us=..., start_ts_us=...) -> None
robot.metrics.gauge(name: str, value, **kwargs) -> None
robot.metrics.counter(name: str, value, *, start_ts_us: int = 0, **kwargs) -> None
robot.metrics.histogram(name: str, *, count=..., sum=..., minimum=..., maximum=..., bounds=..., counts=..., samples=None, start_ts_us=..., **kwargs) -> None
```

| 成员 | 说明 |
|------|------|
| `subscribe(...)` | 指标流，`name` / `unit` 过滤 |
| `snapshot()` | SDK 自身计数的快照（连接、解析、命令、订阅、日志等） |
| `records()` | 把同一份计数导出为 `MetricRecord` 列表，便于上报 |
| `gauge` / `counter` / `histogram` | 上报三种指标；`histogram` 可直接给样本列表，由 SDK 计算分桶 |

`SdkMetricSnapshot` 字段：`connected` / `resolve_success` / `resolve_failure` / `resolve_cache_hits` / `command_success` / `command_failure` / `command_errors`（按错误分类计数）/ `channel_subscriptions` / `log_counts`（按级别计数）/ `log_records_dropped` / `ts_us` / `start_ts_us`。其中 `connected` 是当前读数（gauge），其余是进程启动以来的累计值（counter）。

```python
robot.metrics.gauge("app.queue.depth", 3, unit="count")
robot.metrics.counter("app.jobs.done", 1)
robot.metrics.histogram("app.job.ms", samples=[12.0, 18.5, 41.0], unit="ms")

snap = robot.metrics.snapshot()
print(snap.connected, snap.command_success, snap.command_errors)
```

## frames

`robot.frames` 返回 `FrameSystem`：在进程内做坐标系查询与变换，数据来自机器人发布的共享内存坐标树，不依赖 ROS。

```python
robot.frames.lookup(target: str, source: str, stamp_ns: int = 0) -> Transform3d
robot.frames.can_transform(target: str, source: str, stamp_ns: int = 0) -> bool
robot.frames.wait_for_transform(target: str, source: str, timeout: float = 1.0, *, timeout_s: float | None = None) -> Transform3d
robot.frames.list_frames() -> list[str]
robot.frames.transform(entity, target_frame: str, child_frame: str = "")
robot.frames.transform_pose(pose, target_frame, *, end_frame="", current_end_frame="", stamp_ns=0)
robot.frames.transform_points(points, target_frame: str, source_frame: str, stamp_ns: int = 0)
robot.frames.set_frame(parent: str, child: str, transform, authority: int = 3, persist: bool = False) -> None
robot.frames.set_tool(side: str, parent: str, tool: str, transform) -> None
robot.frames.scoped_frame(parent: str, child: str, transform, authority: int = 4)
robot.frames.to_mermaid() -> str
```

**参数**（`lookup` / `can_transform`）

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `target` | `str` | （必填） | 目标坐标系名 |
| `source` | `str` | （必填） | 源坐标系名 |
| `stamp_ns` | `int` | `0` | 查询时刻（纳秒）；`0` 表示最新 |

坐标系名的语法是 `^[a-z][a-z0-9_]*(/[a-z][a-z0-9_]*)*$`，长度 1–127。查询失败抛 `FrameError` 的子类：`FrameNotFoundError`（名字未知）、`FrameConnectivityError`（两棵树不连通）、`FrameCycleError`、`FrameAuthorityError`、`InvalidFrameNameError`、`FrameTimeoutError` 等。

常用坐标系常量在 `fabot.frames.Frame`：`BASE_LINK` / `BASE_FOOTPRINT` / `ARM_BASE` / `ODOM` / `MAP` / `LEFT_EEF` / `RIGHT_EEF` / `HEAD_EEF`。

```python
from fabot.frames import Frame, Transform3d

tf = robot.frames.wait_for_transform(Frame.BASE_LINK, "head_camera_color_optical")
print(tf.target_frame, tf.source_frame, tf.position, tf.euler_rpy)

pose_in_map = robot.frames.transform(robot.left_arm.get_pose(), Frame.MAP)
points = robot.frames.transform_points([[0.0, 0.0, 1.0]], "base_link", "map")
print(robot.frames.to_mermaid())
```

完整的代数（`Transform3d` 的复合、逆、插值、作用于点 / 向量 / 速度 / 力）、`TransformBuffer` 与 `FrameSystem` 的缓存语义见 [坐标系与变换](../../usage/frames.md)，变换矩阵与相机反投影的辅助函数见 [坐标系 API](../python/frames.md)。

## configuration / connection / services / skills

其余整机入口：

| 入口 | 说明 |
|------|------|
| `robot.configuration` | 整机配置读写（`get()` / `apply()`），CAS 提交，见 [配置管理](../../usage/configuration.md) |
| `robot.connection` | 连接状态查询与订阅（`is_connected()` / `connected` / `subscribe()`） |
| `robot.services` | 平台服务句柄（`ocs2` / `orbbec_sdk_ros2`），见 [平台服务管理](../../usage/services.md) |
| `robot.skills` | 技能句柄（`camera_sync` / `voice_aiui`），见 [技能与扩展](../../usage/skills.md) |

## ping / freeze

`ping` 探测运行库往返时延，`freeze` 请求观测侧冻结飞行记录器；`logs.freeze()` 是同一能力的便捷入口。

```python
robot.ping(payload: bytes = b"", count: int = 1, timeout_ms: int = 1000, *, timeout: float | None = None) -> PingReport
robot.freeze(reason: str = "", *, code: int = 0, source: str = "", attrs=None) -> None
```

**参数**（`ping`）

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `payload` | `bytes` | `b""` | 载荷字节，用于测大包时延 |
| `count` | `int` | `1` | 采样次数 |
| `timeout_ms` | `int` | `1000` | 单次探测超时（毫秒）；`timeout` 为同义的秒制写法 |

`PingReport` 给出 `samples`（每条的 `rtt_us` / `handler_us` / `shm_read_us` / `byte_count`）与汇总 `min_us` / `max_us` / `mean_us` / `p50_us` / `p99_us`。槽位 Proxy 上也有同名 `ping`，只测该槽位。
