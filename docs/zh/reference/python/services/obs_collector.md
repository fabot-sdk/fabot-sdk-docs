---
title: 观测采集 ObsCollector
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 观测采集 ObsCollector

## 模块概述

- 服务：`obs_collector`；入口：`robot.services.obs_collector`
- service id：`fabot_obs_collector`；句柄 `ObsCollectorServiceHandle`；配置类型 `ObsCollectorConfig`
- 观测采集服务：日志 / 指标 / 事件的落盘与飞行记录器。配置管配额、各类数据的容量与保留天数、冻结快照的前后窗口。
- **进程只在启动时读这份配置**：`set_config()` 保存后要 `stop()` 再 `start()` 才生效。
- 查当前磁盘占用与冻结文件清单用 `robot.obs.store()`，见 [日志、指标与可观测性](../../../usage/observability.md)。

平台操作的通用说明（`start` / `state` / `get_config`、CAS 冲突等）见 [平台服务概览](index.md)。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `start` / `stop` / `restart` | Command | 生命周期控制；控制超时 25000 ms。 |
| `state` | Command | `ServiceState` 快照。 |
| `is_running` | Command | 运行中判断。 |
| `get_config` | Command | 读 `ObsCollectorConfig`。 |
| `set_config` | Command | CAS 提交，冲突抛 `ConfigurationConflict`。 |
| `edit_config` | 上下文管理器 | 读—改—写。 |

## 方法

### 读取与提交配置

```python
svc = robot.services.obs_collector
cfg = svc.get_config()
print(cfg.obs.quota_percent, cfg.obs.retention_days.log, cfg.obs.flight_recorder_mb)
```

```python
with svc.edit_config() as cfg:
    cfg.obs.retention_days.log = 14
svc.stop()
svc.start()
```

配置保存后必须重启服务才生效；`Robot.mock()` 下控制操作只返回成功，不改变真实行为。

## 通道

本服务没有数据通道。日志 / 指标的读取走 `robot.logs` / `robot.metrics`，见 [日志、指标与可观测性](../../../usage/observability.md)。

## 事件

没有服务私有事件；状态迁移走整机 `robot.events.service_state_changed`，见 [平台服务概览](index.md)。冻结观测的触发走 `robot.freeze()` 或 `robot.logs.freeze()`。

## 异常

与其它服务一致：控制失败抛 `FabotError`，配置冲突抛 `ConfigurationConflict`。配置值越界（如 `quota_percent` 不大于 0）会在生效时被拒绝或回退到缺省值，见各字段说明。见 [错误处理](../../../usage/errors.md)。

## 状态

`state()` 返回 `ServiceState`（字段见 [平台服务概览](index.md)）。

`ObsCollectorConfig` 只有一个配置域 `obs`：

| 字段 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `quota_percent` | `int` | `20` | 观测数据最多占用数据根目录所在分区的百分比，必须大于 0；超出后由维护周期清理 |
| `max_size_mb` | `ObsMaxSizeMbConfig` | `log=50` / `metric=50` / `event=20` | 单类文件的轮转阈值（MiB） |
| `retention_days` | `ObsRetentionDaysConfig` | `log=7` / `metric=14` / `freeze=14` / `event=30` | 各类数据的保留天数 |
| `freeze_pre_sec` | `int` | `10` | 冻帧时向回保留的飞行记录仪时长（秒） |
| `freeze_post_sec` | `int` | `2` | 冻帧后继续保留的时长（秒） |
| `freeze_cooldown_sec` | `int` | `60` | 同一 `(code, source)` 两次冻帧的最小间隔（秒） |
| `maintenance_interval_sec` | `int` | `600` | 保留与配额清理的周期（秒），必须大于 0 |
| `queue_capacity` | `int` | `8192` | 采集入口的有界队列长度；队列满时按 DEBUG/INFO 日志 → 指标 → WARN/ERROR 日志的顺序丢弃，配置为 `0` 时启动回退到 8192 |
| `flight_recorder_mb` | `int` | `16` | 飞行记录仪环形缓冲的总预算（MiB） |
| `max_frame_kb` | `int` | `64` | 单帧最大接收长度（KiB）；超长记录被丢弃 |

数据根目录是固定的，不是配置项。部分字段可由环境变量覆盖（配额、冻帧前后窗口与冷却、维护周期）。

## 资源

本服务没有 Operation，不占用能力资源。

## 配置域

配置域为 `obs`，`edit_config()` 退出时只提交实际变化的域。`field_help()` 给出每个字段的中英文说明，`field_labels()` 给出展示名，可直接用于配置界面。

## 相关

- 日志、指标与观测存储：[日志、指标与可观测性](../../../usage/observability.md)
- 服务概念与启停注意事项：[平台服务管理](../../../usage/services.md)
- 配置域读写：[配置管理](../../../usage/configuration.md)
