---
title: Robot 入口
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Robot 入口

`Robot` 是 Python SDK 的统一入口：建立连接、按槽位暴露能力 Proxy、聚合整机急停、事件与状态。概念说明见 [连接与 Robot 入口](../../usage/connection.md)。

## connect

`Robot.connect` / `from_endpoint` / `from_config` 建立连接；`close()` 或 `with` 上下文关闭。

```python
Robot.connect(ip: str, port: int, options: ClientOptions | None = None) -> Robot
Robot.from_endpoint(ip: str, port: int, options: ClientOptions | None = None) -> Robot
Robot.from_config(config: ClientConfig | None = None, options: ClientOptions | None = None) -> Robot
Robot.from_backend(backend, options: ClientOptions | None = None) -> Robot
Robot.mock() -> MockRobot
robot.close() -> None
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `ip` / `port` | `str` / `int` | （必填） | 控制面端点，默认端口 7557 |
| `config` | `ClientConfig` | `None` | 客户端标识与传输选项，见下表 |
| `options` | `ClientOptions` | `None` | 超时与缓存选项，见下表 |

`connect` 是 `from_endpoint` 的别名；`from_backend` 接入自定义传输后端，属高级用法；`mock()` 返回无需真实机器人的 `MockRobot`，见 [Mock 测试](../../usage/mock.md)。

`ClientConfig`：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `client_id` | `str` | `"fabot_sdk"` | 客户端标识 |
| `zenoh_config_file` | `str` | `""` | 自定义传输配置文件路径 |
| `auth_token` | `bytes` | `b""` | 认证令牌 |
| `max_control_message_bytes` | `int` | `1048576` | 控制消息上限（字节） |

`ClientOptions`：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `resolve_timeout_ms` | `int` | `1000` | 槽位解析超时（毫秒） |
| `command_timeout_ms` | `int` | `3000` | Command 默认超时（毫秒） |
| `resolve_cache_ttl_ms` | `int` | `30000` | 解析缓存有效期（毫秒） |
| `resolve_cache_capacity` | `int` | `256` | 解析缓存容量 |
| `completion_executor` | — | `None` | 异步回调的完成执行器 |
| `channel_renew_threads` | `int` | `2` | 通道续约工作线程数 |

工厂方法阻塞至连接建立，失败抛 `FabotError`；不得在事件回调（SDK I/O 线程）中调用，否则抛 `ClientThreadError`。`close()` 关闭全部订阅与连接；`with` 上下文退出时自动 `close()`。

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    print(robot.sdk_version, robot.version())
```

其他整机入口：`robot.connection`（连接状态查询与订阅）、`robot.configuration`（槽位绑定与配置读写，见 [配置管理](../../usage/configuration.md)）、`robot.services`（平台服务管理，见 [平台服务管理](../../usage/services.md)）、`robot.logs`（日志流订阅）。

## wait_ready

`wait_ready(slots=None)` 阻塞等待指定槽位（默认全部）可用。

```python
wait_ready(slots: Sequence[str] | None = None) -> None
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `slots` | `Sequence[str]` | `None` | 要等待的槽位 id；`None` 表示全部 22 个槽位 |

语义：读取当前槽位配置，对每个**已启用、必需且已绑定**的目标槽位阻塞解析句柄；未绑定、被禁用或 `required=False` 的槽位直接跳过，不予等待。单个槽位的解析超时由 `ClientOptions.resolve_timeout_ms` 控制；解析失败抛异常。

```python
robot.wait_ready()                       # 全部已绑定槽位
robot.wait_ready(["left_arm", "io"])     # 只等指定槽位
```

## slots

能力以只读属性按槽位暴露（`robot.io`、`robot.chassis` 等），共 22 个槽位。

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
| `head_camera` / `chest_camera` | `camera` | [相机 Camera](camera.md) |
| `left_wrist_camera` / `right_wrist_camera` | `camera` | [相机 Camera](camera.md) |
| `screen` | `screen` | [面屏 Screen](screen.md) |
| `light` | `light` | [灯效 Light](light.md) |
| `voice` | `voice` | [语音 Voice](voice.md) |

所有槽位 Proxy 的公共成员：

| 成员 | 说明 |
|------|------|
| `slot_id` | 槽位 id |
| `handle` | 槽位句柄（惰性解析，解析失败抛异常） |
| `events` | 该槽位的类型化事件入口 |
| `health()` | 当前健康度 |
| `lifecycle()` | `CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `source_instance_id`） |
| `faults()` | 该槽位当前故障袋 |
| `has_adapter` | 槽位是否已绑定 adapter |
| `as_adapter(adapter_type)` | 转为 `fabot.adapters` 下的强类型 adapter 视图 |

槽位未绑定 adapter 时访问其能力方法会抛 `AdapterUnbound`（属 `NotFound`），先用 `has_adapter` 判断。`as_adapter` 要求 `adapter_type` 暴露 `ADAPTER_ID`（否则 `TypeError`）；槽位未绑定抛 `AdapterUnbound`，绑定的 adapter 与 `adapter_type` 不符抛 `AdapterMismatch`。

```python
if robot.left_arm.has_adapter:
    print(robot.left_arm.get_joints())

from fabot.adapters import FabotArm

arm = robot.left_arm.as_adapter(FabotArm)
```

## estop

`robot.estop` 提供 `engage` / `release` / `state`，三个方法均返回最新的 `EstopState` 快照。

```python
robot.estop.engage(reason: str = "", source: str = "") -> EstopState
robot.estop.release(reason: str = "", source: str = "") -> EstopState
robot.estop.state() -> EstopState
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

`engage` 触发整机急停闩锁，整机运行状态进入 `RobotRunState.Estopped`（`robot.state().is_estopped` 为 `True`）；`release` 解除闩锁。急停变化通过 `robot.events.estop_changed` 推送。恢复步骤：确认现场安全后 `release`，再查 `robot.state()` 确认已脱离 `Estopped`，并通过 `robot.faults()` 检查急停期间记录的故障。

```python
state = robot.estop.engage(reason="safety check")
print(state.asserted, state.reason)

robot.estop.release(reason="check done")
print(robot.estop.state().asserted)
```

## events

`robot.events` 订阅整机事件（`estop_changed` / `robot_state_changed` / `registry_changed` / `config_changed` / `service_state_changed` / `faults_changed`）。见 [事件与数据通道](../../usage/events-channels.md)。

订阅均返回 `SubscriptionToken`，用 `token.close()` 退订；`robot.close()` 统一关闭全部订阅。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。

| 入口 | 事件类型 | payload |
|------|----------|---------|
| `estop_changed` | `EstopChangedEvent` | `estop`：`EstopState`，字段见 [estop](#estop) |
| `robot_state_changed` | `RobotStateChangedEvent` | `robot_state`：`RobotState`，字段见 [status](#status) |
| `registry_changed` | `RegistryChangedEvent` | `registry`：`RegistryEvent`（`registry_revision` / `capability_id`） |
| `config_changed` | `ConfigChangedEvent` | `config`：`ConfigState`（`revision` / `runtime_revision` / `slots` / `domains` 等） |
| `service_state_changed` | `ServiceStateChangedEvent` | `service_state`：`ServiceState`（`service_id` / `desired` / `state` / `pid` / `restart_count` / `source_instance_id`；便捷属性 `is_running` / `is_ready`） |
| `faults_changed` | `FaultsChangedEvent` | `faults`：`RobotFaultSnapshot`（`revision` + `faults: list[RobotFaultRecord]`；每条记录含 `capability_id` / `instance_id` / `fault_id` / `catalog_id` / `fault_class` / `first_seen_us` / `last_seen_us` / `count`）。注意与 `faults()` 返回的 `RobotFaults`（按槽位组织）形态不同 |

每个事件都带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。`robot.events.subscribe(callback)` 订阅总线上的全部事件，回调收到原始 `Event`，可用各事件类型的 `matches()` / `from_event()` 判别并解码。

```python
def on_estop(event):
    print(event.header.timestamp_us, event.estop.asserted, event.estop.reason)

token = robot.events.estop_changed.subscribe(on_estop)
# ...
token.close()
```

## status

`state()` / `status()` / `faults()` / `version()` / `sdk_version` 聚合整机状态。见 [状态、故障与生命周期](../../usage/status-faults.md)。

| 方法 | 返回 | 说明 |
|------|------|------|
| `state()` | `RobotState` | 整机运行状态快照 |
| `status()` | `RobotStatus` | 各能力状态袋聚合 |
| `faults()` | `RobotFaults` | 全部槽位当前故障聚合 |
| `version()` | `str` | 平台版本 |
| `sdk_version` | `str` | SDK 自身版本（属性，非方法） |

以上均为主动查询（GET-only）；变化经 [events](#events) 的事件流推送。

`RobotState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `state` | `RobotRunState` | `Unknown` / `Idle` / `Running` / `Degraded` / `Fault` / `Estopped` |
| `reasons` | `list[str]` | 进入当前状态的原因 |
| `revision` | `int` | 状态修订号 |
| `source_instance_id` | `str` | 来源实例 id |

便捷属性：`is_running` / `is_idle` / `is_degraded` / `is_fault` / `is_estopped`。

`RobotStatus`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `generation` | `int` | 状态代际 |
| `revision` | `int` | 状态修订号 |
| `power_1` / `power_2` | `PowerStatus` | 电源状态袋，字段见 [电源 Power](power.md) |
| `screen` | `ScreenStatus` | 面屏状态袋，字段见 [面屏 Screen](screen.md) |
| `voice` | `VoiceStatus` | 语音状态袋，字段见 [语音 Voice](voice.md) |

当前仅 power / screen / voice 提供状态袋，其余槽位不参与聚合（对应字段保持默认值）。

`RobotFaults`：`revision`（`int`）加 22 个槽位故障袋字段（`body` / `left_arm` / `right_arm` / `left_hand` / `right_hand` / `left_gripper` / `right_gripper` / `head` / `chassis` / `power_1` / `power_2` / `io` / `motion` / `teleop` / `arms` / `head_camera` / `chest_camera` / `left_wrist_camera` / `right_wrist_camera` / `screen` / `light` / `voice`），各故障袋类型见对应模块页的「异常」一节。

```python
st = robot.state()
if st.is_estopped:
    print(st.reasons)

faults = robot.faults()
print(faults.revision, faults.chassis)
```
