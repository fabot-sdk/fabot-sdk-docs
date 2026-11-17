---
title: 运行环境配置 Ros2Environment
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 运行环境配置 Ros2Environment

## 模块概述

- 入口：`robot.environments.ros2`
- environment id：`fabot_env_ros2`；句柄 `Ros2EnvironmentHandle`；配置类型 `Ros2EnvironmentConfig`
- 机器人运行环境的 **配置**，不是进程：只读写 domain id、是否只监听本机、路由器归属。
- 与 [ROS 2 服务](ros2.md) 的区别：这里是**配置**（ROS 2 图标识），那里是**进程**（图访问服务）。domain id 不在服务配置里。
- 没有 `start()` / `stop()`，只有 `get_config()` / `set_config()` / `edit_config()`。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `get_config` | Command | 读 `Ros2EnvironmentConfig`。 |
| `set_config` | Command | CAS 提交，冲突抛 `ConfigurationConflict`。 |
| `edit_config` | 上下文管理器 | 读—改—写，退出时只提交变化的域。 |

`ENVIRONMENT_ID` / `CONFIG` 类属性分别给出环境 id 与配置类型。

## 方法

### get_config / set_config

```python
get_config() -> Ros2EnvironmentConfig
set_config(config: Ros2EnvironmentConfig, *, only_domains=None) -> Ros2EnvironmentConfig
```

**参数**（`set_config`）

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `config` | `Ros2EnvironmentConfig` | （必填） | 目标配置 |
| `only_domains` | `set[str] \| None` | `None` | 只提交这些配置域；`None` 表示全部 |

```python
env = robot.environments.ros2
print(env.get_config().communication.domain_id)

cfg = env.get_config()
cfg.communication.domain_id = 42
env.set_config(cfg)
```

### edit_config

```python
with robot.environments.ros2.edit_config() as cfg:
    cfg.communication.localhost_only = True
# 退出时只提交 communication 域
```

环境配置在进程启动时被读取，改动会重启所有继承该环境的运行单元。

## 通道

本入口没有数据通道。

## 事件

没有事件入口。配置变更可经整机 `robot.events.config_changed` 观察，见 [事件与数据通道](../../../usage/events-channels.md)。

## 异常

CAS 冲突抛 `ConfigurationConflict`（见 [错误处理](../../../usage/errors.md)）；与能力 / 服务配置的重试模式一致，见 [配置管理](../../../usage/configuration.md)。

## 状态

`Ros2EnvironmentConfig` 只有一个配置域 `communication`：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `domain_id` | `int` | `0` | `ROS_DOMAIN_ID`，范围 0–232；只有同域的节点能互相发现 |
| `localhost_only` | `bool` | `False` | `ROS_LOCALHOST_ONLY`；开启后只在本机回环通信，不跨网段发现 |
| `router` | `CommunicationRouter` | `owned` | `owned` 由本机启动路由器，端口被占时顺延；`attach` 不启动，直连已有的 `tcp/localhost:7447`；缺键等同 `owned` |

RMW 固定为 `rmw_zenoh_cpp`，不是配置项。

## 资源

本入口没有 Operation，不占用能力资源。

## 配置域

配置域为 `communication`。`field_options()` / `field_help()` / `field_labels()` 给出合法取值与说明文案。

## 相关

- 服务与环境的整体说明：[平台服务管理](../../../usage/services.md)
- ROS 2 图访问服务：[ros2.md](ros2.md)
- 配置域读写：[配置管理](../../../usage/configuration.md)
