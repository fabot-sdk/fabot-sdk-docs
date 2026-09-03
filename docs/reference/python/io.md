---
title: IO（数字/模拟输入输出）
status: draft
owner: fabot-core
updated: 2026-09-03
---

# IO（数字/模拟输入输出）

## 模块概述

- 能力 id：`io`；槽位：`robot.io`
- 读写机器人上的数字 / 模拟 IO 通道，并订阅通道电平变化流。

## API 总览

| 方法 | 请求 | 响应 | 类型 |
|------|------|------|------|
| `set_digital_output` | `channel`, `value` | `DigitalLevelAppliedT` | Command |
| `get_digital_output` | `channel` | `DigitalLevelAppliedT` | Command |
| `get_digital_input` | `channel` | `DigitalLevelAppliedT` | Command |
| `set_analog_output` | `channel`, `value: float` | `AnalogLevelAppliedT` | Command |
| `get_analog_output` | `channel` | `AnalogLevelAppliedT` | Command |
| `get_analog_input` | `channel` | `AnalogLevelAppliedT` | Command |

| 通道 | 内容 |
|------|------|
| `digital_events` | 数字通道电平变化流 |

## 方法

所有方法默认 `timeout_ms=1000`（关键字参数）。

```python
robot.io.set_digital_output(channel="relay1", value=True)
level = robot.io.get_digital_input(channel="di_1")
voltage = robot.io.get_analog_input(channel="ai_1")
```

错误行为：通道名不存在抛 `InvalidArgument`；硬件读写失败抛能力私有错误码（9xxxx）。

## 通道

数字电平变化走数据通道：

```python
ch = robot.io.digital_events(qos_profile=QosProfile.Realtime)
for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
    print(frame.channel_id, frame.sequence, frame.payload)   # payload: DigitalEventT
```

## 事件

故障与生命周期变化经 `robot.io.events` 的 `fault_changed` / `lifecycle_changed` 订阅。

## 异常

## 状态

本模块没有 `status()`；整机状态见 `robot.status()`。

## 资源
