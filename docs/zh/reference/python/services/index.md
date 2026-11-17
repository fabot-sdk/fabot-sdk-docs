---
title: 平台服务概览
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 平台服务概览

## 模块概述

- 入口：`robot.services` / `robot.environments`
- 服务是机器人上的常驻进程。SDK 只暴露**有限的一组平台操作**：启停、状态查询与配置读写；业务接口不对客户端开放。
- 对客户端可见、且在 SDK 文档中公开接口的服务有两个：`ros2` 与 `obs_collector`。`environments` 是运行环境**配置**（不是进程），目前只有 `ros2`。

| 属性 | service id | 句柄类型 | 配置类型 | 配置域 | 章节 |
|------|-----------|----------|----------|--------|------|
| `robot.services.ros2` | `fabot_ros2` | `Ros2ServiceHandle` | `Ros2Config` | `node` | [ros2.md](ros2.md) |
| `robot.services.obs_collector` | `fabot_obs_collector` | `ObsCollectorServiceHandle` | `ObsCollectorConfig` | `obs` | [obs_collector.md](obs_collector.md) |
| `robot.environments.ros2` | `fabot_env_ros2` | `Ros2EnvironmentHandle` | `Ros2EnvironmentConfig` | `communication` | [ros2_environment.md](ros2_environment.md) |

句柄上的 `SERVICE_ID` / `CONFIG` 分别给出服务 id 与配置类型。`ros2` 额外具有能力 Proxy 式的槽位表面（`handle` / `events` / `health()` / `faults()` / `ping()` 等），`obs_collector` 只有平台操作。

服务语义与操作注意事项见 [平台服务管理](../../../usage/services.md)。

## API 总览

服务句柄共有的平台操作：

| 名字 | 类型 | 说明 |
|------|------|------|
| `start` / `stop` / `restart` | Command | 请求服务进入目标状态；控制调用超时 `CONTROL_TIMEOUT_MS`（当前 25000 ms）。 |
| `state` | Command | 读进程状态快照 `ServiceState`。 |
| `is_running` | Command | 是否运行中（等价 `state().is_running`）。 |
| `get_config` | Command | 读服务配置（强类型 dataclass）。 |
| `set_config` | Command | CAS 提交配置，冲突抛 `ConfigurationConflict`。 |
| `edit_config` | 上下文管理器 | 读—改—写，退出时只提交变化的配置域。 |

配置分域：`ros2` 只有 `node`，`obs_collector` 只有 `obs`。各服务的特有方法见对应章节。

## 方法

参数名与默认值以本节签名块为准。字段名用小写下划线写法，生成类型同时接受原样的驼峰别名。

### start / stop / restart

请求服务进入目标状态，三个方法都返回 `None`。

```python
robot.services.<name>.start() -> None
robot.services.<name>.stop() -> None
robot.services.<name>.restart() -> None
```

控制调用是同步的：向平台下发期望状态，指令失败时抛 `FabotError`。进程状态迁移是异步的，调用返回后用 `state()` / `is_running()` 确认，或订阅 `robot.events.service_state_changed`。

句柄上的 `CONTROL_TIMEOUT_MS`（当前为 `25000`）是控制调用的超时：管理器在重启时会先等待依赖单元收敛，默认解析超时不够用。

:::warning
`stop()` / `restart()` 会影响依赖该服务的功能。`ros2` 重启期间所有经它访问的 ROS 2 图与动作都不可用；`obs_collector` 重启期间观测数据停止落盘。
:::

### state / is_running

```python
robot.services.<name>.state() -> ServiceState
robot.services.<name>.is_running() -> bool
```

**返回** `ServiceState`

| 字段 | 类型 | 说明 |
|------|------|------|
| `service_id` | `str` | 服务 id（如 `fabot_ros2`） |
| `desired` | `ServiceDesiredState` | 期望状态：`Unknown` / `Running` / `Stopped` |
| `state` | `ServiceRunState` | 观测状态：`Unknown` / `Starting` / `Ready` / `Stopping` / `Stopped` / `Failed` |
| `pid` | `int` | 进程号；未运行时为 `-1` |
| `restart_count` | `int` | 累计重启次数 |
| `source_instance_id` | `str` | 状态来源实例 id |

两个便捷属性：`is_running`（`state` 为 `Starting` 或 `Ready`）与 `is_ready`（`state` 为 `Ready`）。

平台没有该服务的行时，`state()` 返回 `service_id` 已填、其余为缺省值的快照，不会抛错。

### get_config / set_config / edit_config

```python
robot.services.<name>.get_config() -> <Config>
robot.services.<name>.set_config(config, *, only_domains=None) -> <Config>
robot.services.<name>.edit_config()  # 上下文管理器
```

**参数**（`set_config`）

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `config` | 该服务的配置 dataclass | （必填） | 目标配置 |
| `only_domains` | `set[str] \| None` | `None` | 只提交这些配置域；`None` 表示全部 |

`set_config()` 以 CAS 提交，成功后返回重新读取的配置；与服务当前状态冲突时抛 `ConfigurationConflict`。`edit_config()` 是最省事的写法：

```python
from fabot.errors import ConfigurationConflict

with robot.services.ros2.edit_config() as cfg:
    cfg.node.namespace = "/robot"
# 退出时只提交变化的域
```

等价的显式写法：

```python
cfg = robot.services.obs_collector.get_config()
cfg.obs.retention_days.log = 14       # 枚举字段接受字符串
try:
    cfg = robot.services.obs_collector.set_config(cfg)
except ConfigurationConflict:
    cfg = robot.services.obs_collector.get_config()   # 重读、合并后重试
```

各配置类都提供 `to_yaml()` / `from_yaml(text)` / `field_options()` / `field_help()` / `field_labels()`。枚举取值用 `field_options()` 读，不要硬编码候选列表。

## 通道

两个服务中只有 `ros2` 有数据通道（`messages()`），见 [ros2.md](ros2.md) 的「通道」一节。

## 事件

**服务状态迁移**走整机事件 `robot.events.service_state_changed`，payload 字段为 `service_state`（`ServiceState`）：

```python
def on_service_state(event):
    st = event.service_state
    print(st.service_id, st.desired, st.state, st.is_running)

token = robot.events.service_state_changed.subscribe(on_service_state)
```

`robot.services.ros2` 另有槽位级事件入口 `robot.services.ros2.events`（`fault_changed` / `lifecycle_changed`，以及通配 `subscribe()`）。`obs_collector` 没有 `events`。

回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API；禁止在回调内调用 `start()` 等阻塞 API。

## 异常

服务控制与查询失败抛 `FabotError` 子类：超时 `Timeout`、服务不存在 `NotFound`、参数非法 `InvalidArgument`、并发冲突 `ResourceConflict`；配置提交冲突抛 `ConfigurationConflict`。完整层次见 [错误处理](../../../usage/errors.md)。

## 状态

服务进程状态用 `state()`（`ServiceState`，字段见上）。`robot.services.ros2` 另有 `health()`（`SlotHealth`）与 `lifecycle()`（`CapabilityLifecycleSnapshot`）。

各服务配置类的字段与默认值见对应章节。

## 资源

服务的 `start` / `stop` / `restart` 是平台控制命令，不占用能力资源。

| 服务 | 资源 | 策略 | 占用者 |
|------|------|------|--------|
| `ros2` | `goal` | `queue` | `send_goal` |
| `obs_collector` | — | — | 无 Operation |

## 相关

- 服务概念、启停与配置注意事项：[平台服务管理](../../../usage/services.md)
- 配置域读写与冲突重试：[配置管理](../../../usage/configuration.md)
- 运行环境配置：[ros2_environment.md](ros2_environment.md)
- 诊断码：[诊断码参考](../error-codes.md)
- Mock 下的服务行为：[Mock 测试](../../../usage/mock.md)
