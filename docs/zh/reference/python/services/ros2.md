---
title: ROS 2 服务 Ros2
status: draft
owner: fabot-core
updated: 2026-11-17
---

# ROS 2 服务 Ros2

## 模块概述

- 服务：`ros2`；入口：`robot.services.ros2`
- service id：`fabot_ros2`；句柄 `Ros2ServiceHandle`；配置类型 `Ros2Config`
- 在本机与机器人之间桥接 ROS 2 图：节点 / 话题 / 服务 / 动作的查询，服务调用、消息发布订阅、参数读写与动作目标。
- 唯一具有能力 Proxy 式槽位表面（`handle` / `events` / `health()` / `lifecycle()` / `faults()` / `ping()` / `self_check()`）的服务句柄。
- **所有载荷都是 JSON 字符串**，不要在客户端假设具体消息类型的 Python 对象。

平台操作的通用说明（`start` / `state` / `get_config`、CAS 冲突等）见 [平台服务概览](./index.md)。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `start` / `stop` / `restart` | Command | 生命周期控制；控制超时 25000 ms。 |
| `state` / `is_running` | Command | 进程状态。 |
| `list_nodes` / `node_info` | Command | 列节点 / 读单个节点信息；默认超时 3000 ms。 |
| `list_topics` / `topic_info` | Command | 列话题 / 读单个话题的端点与类型。 |
| `list_services` / `service_type` | Command | 列服务 / 查某个服务的类型名。 |
| `list_actions` | Command | 列动作。 |
| `call_service` | Command | 调用服务；`timeout_ms` 必填。 |
| `publish` | Command | 发布一条消息；默认超时 3000 ms。 |
| `subscribe` / `unsubscribe` | Command | 建立 / 释放话题订阅租约。 |
| `list_parameters` / `get_parameter` / `set_parameter` | Command | 节点参数读写；`get_parameter` 默认 3000 ms，`set_parameter` 默认 10000 ms。 |
| `send_goal` | Operation | 发送动作目标，返回 `SendGoalOperation`；`timeout_ms` 必填。 |
| `messages` | Channel | 订阅到的消息流，帧为 `TopicMessage`。 |
| `listen` | 辅助 | 订阅并迭代 JSON 载荷，关闭时释放该租约。 |
| `events` | 事件入口 | `fault_changed` / `lifecycle_changed` 与通配 `subscribe()`。 |
| `get_config` / `set_config` / `edit_config` | Command / 上下文管理器 | `Ros2Config` 读写，配置域 `node`。 |
| `slot_id` / `handle` / `has_adapter` / `as_adapter` / `health` / `lifecycle` / `faults` / `ping` / `self_check` | 公共槽位表面 | 与能力 Proxy 同名同义。 |

## 方法

参数名与默认值以本节签名块为准。字段名用小写下划线写法，生成类型同时接受原样的驼峰别名。

### 图查询

查询类方法都是短 Command，读服务侧缓存。`wait_ms` 是等待图收敛的时间（毫秒），`include_hidden` 决定是否包含隐藏实体；两者都是**必填关键字参数**。

```python
list_nodes(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[NodeName]
node_info(*, name: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> NodeInfo
list_topics(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[TopicEndpoint]
topic_info(*, name: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> TopicInfo
list_services(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[ServiceEndpoint]
service_type(*, name: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> str
list_actions(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[ActionEndpoint]
list_parameters(*, node: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[str]
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `name` | `str` | （必填） | 节点 / 话题 / 服务名 |
| `node` | `str` | （必填） | 节点名（参数查询） |
| `include_hidden` | `bool` | （必填） | 是否包含隐藏实体 |
| `wait_ms` | `int` | （必填） | 等待图收敛的时间（毫秒） |
| `timeout_ms` | `int` | `3000` | 调用超时（毫秒） |

**返回类型字段**

| 类型 | 字段 |
|------|------|
| `NodeName` | `name` / `namespace` |
| `NodeInfo` | `name` / `publishers` / `subscribers` / `services` / `actions` |
| `TopicEndpoint` / `ServiceEndpoint` / `ActionEndpoint` | `name` / `types`（类型名列表） |
| `TopicInfo` | `name` / `types` / `publishers` / `subscribers`；端点项为 `node` / `message_type` |

```python
svc = robot.services.ros2
print(svc.list_nodes(include_hidden=False, wait_ms=500))
print(svc.topic_info(name="/scan", include_hidden=False, wait_ms=500))
print(svc.list_parameters(node="/controller_manager", include_hidden=False, wait_ms=500))
```

### 服务调用与消息

```python
call_service(*, name: str, message_type: str, payload: str, timeout_ms: int) -> str
publish(*, name: str, message_type: str, payload: str, timeout_ms: int = 3000) -> Empty
subscribe(*, name: str, message_type: str, reliability: int, depth: int, timeout_ms: int = 3000) -> str
unsubscribe(*, subscription_id: str, timeout_ms: int = 3000) -> Empty
set_parameter(*, node: str, name: str, payload: str, timeout_ms: int = 10000) -> str
get_parameter(*, node: str, name: str, timeout_ms: int = 3000) -> str
messages(qos_profile: str = "latest") -> MessagesChannel
listen(name: str, message_type: str, *, reliability: int = 0, depth: int = 10)
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `message_type` | `str` | （必填） | ROS 接口类型名，如 `std_msgs/msg/String` |
| `payload` | `str` | （必填） | JSON 字符串 |
| `reliability` | `int` | `0`（`listen` 为 `0`） | QoS 可靠性 |
| `depth` | `int` | `10`（`listen` 为 `10`） | 队列深度 |
| `subscription_id` | `str` | （必填） | `subscribe()` 返回的租约 id |

`subscribe()` 返回订阅租约 id，消息经 `messages()` 通道取；`unsubscribe()` 释放。`call_service()` 的 `timeout_ms` 必填；`get_parameter()` 返回 JSON 字符串。

`listen()` 是便捷封装：内部 `subscribe()` 后打开 `messages()` 通道，迭代时只产出该租约的消息载荷（JSON 字符串），`close()` 先关通道再 `unsubscribe()`，只释放自己这条租约。

```python
with svc.listen("/scan", "sensor_msgs/msg/LaserScan", depth=1) as messages:
    for payload in messages.frames():
        print(payload[:80])
        break
```

### 动作目标

`send_goal()` 立即返回 `SendGoalOperation`，用法与其他 Operation 一致。

```python
send_goal(*, name: str, message_type: str, payload: str, timeout_ms: int) -> SendGoalOperation
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `name` | `str` | （必填） | 动作名 |
| `message_type` | `str` | （必填） | 动作接口类型名 |
| `payload` | `str` | （必填） | 目标 JSON 字符串 |
| `timeout_ms` | `int` | （必填） | 调用超时（毫秒） |

`SendGoalOperation`：`id` / `get()` / `wait()` / `cancel()` / `events()`。快照的 `feedback` 为 `GoalProgress`（`payload`），`result` 为 `GoalOutcome`（`payload`），都是 JSON 字符串。

```python
op = svc.send_goal(name="/navigate_to_pose", message_type="nav2_msgs/action/NavigateToPose", payload='{"pose": {}}', timeout_ms=30000)
print(op.wait(timeout=60.0).payload)
```

## 通道

### messages

```python
messages(qos_profile: str = "latest") -> MessagesChannel
```

帧 payload 为 `TopicMessage`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `subscription_id` | `str` | 所属订阅租约 |
| `topic` | `str` | 话题名 |
| `message_type` | `str` | 消息类型 |
| `stamp_ns` | `int` | 时间戳（纳秒） |
| `payload` | `str` | JSON 字符串 |

外层 `MessagesChannelFrame` 带 `channel_id` / `sequence` / `timestamp_us` / `payload`。用 `subscribe()` 建立租约后，按 `subscription_id` 过滤自己关心的消息；`next()` 不传参时默认等 5 秒。通用用法见 [事件与数据通道](../../../usage/data/events-channels.md)。

## 事件

`robot.services.ros2.events` 提供：

| 入口 | 事件类型 | payload |
|------|------|------|
| `events.fault_changed` | `FaultChangedEvent` | `faults`：`Faults` |
| `events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`：`CapabilityLifecycleSnapshot` |
| `events.subscribe(cb, on_error=...)` | 通配订阅 | `Event` |

服务进程的状态迁移仍走整机 `robot.events.service_state_changed`。

## 异常

服务控制与查询失败抛 `FabotError` 子类：超时 `Timeout`、服务不存在 `NotFound`、参数非法 `InvalidArgument`、并发冲突 `ResourceConflict`；配置冲突抛 `ConfigurationConflict`。

载荷一律是 JSON 字符串，服务端解析失败会以 `InvalidArgument` 或 `Internal` 返回，客户端不做本地反序列化。槽位级故障查询用 `faults()`，返回 `Faults`（`revision` + `records: list[FaultState]`），字段与能力一致：`code` / `source` / `state` / `severity` / `timestamp_us`。见 [错误处理](../../../usage/diagnostics/errors.md)。

## 状态

`state()` 返回 `ServiceState`（字段见 [平台服务概览](./index.md)）；另有 `health()`（`SlotHealth`）与 `lifecycle()`（`CapabilityLifecycleSnapshot`）。

`Ros2Config` 只有一个配置域 `node`：

| 字段 | 默认 | 说明 |
|------|------|------|
| `node_name` | `fabot_ros2` | 服务在 ROS 图中的节点名 |
| `namespace` | `""` | 节点命名空间 |

ROS 2 的 domain id 在 `robot.environments.ros2` 里，不在服务配置里，见 [ros2_environment.md](./ros2_environment.md)。

## 资源

| 资源 | 策略 | 占用者 |
|------|------|--------|
| `goal` | `queue` | `send_goal` |

同一时刻只有一个动作目标在执行，后续目标排队等待。默认时限 **30 秒**，可取消。查询类命令与 `call_service` / `publish` / `subscribe` 都是短 Command，不占用资源。

## 配置域

```python
with robot.services.ros2.edit_config() as cfg:
    cfg.node.namespace = "/robot"
```

## 相关

- 服务概念与启停注意事项：[平台服务管理](../../../usage/configuration/services.md)
- 运行环境的 domain / 通信配置：[ros2_environment.md](./ros2_environment.md)
- 配置域读写：[配置管理](../../../usage/configuration/configuration.md)
- 命令与长时操作：[命令与长时操作](../../../usage/basics/commands-operations.md)
