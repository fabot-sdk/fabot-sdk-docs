---
title: 命令与长时操作
status: draft
owner: fabot-core
updated: 2026-09-03
---

# 命令与长时操作

能力暴露两类调用：**Command**（同步请求-响应）与 **Operation**（长时、可取消的任务）。

## Command

Command 是一次阻塞调用：发请求、等响应、拿到结果或抛错。

```python
# 关键字参数；每个 command 都有 timeout_ms（默认值见各能力文档）
robot.io.set_digital_output(channel="relay1", value=True)
level = robot.io.get_digital_input(channel="di_1")

# 底盘限速
robot.chassis.set_max_speed(vx=0.5, vtheta=0.8, timeout_ms=1000)
```

行为约定：

- 超时抛 `Timeout`（错误分类之一，见 [错误处理](errors.md)）；默认超时见各能力文档，可被 `ClientOptions.command_timeout_ms` 与调用级参数覆盖。
- 抛具体 `FabotError` 子类（保留 `code` / `category` / `retryable` / `trace_id`）。

## Operation

长时任务（如导航、相对移动、机械臂轨迹）返回一个 Operation 句柄，不阻塞调用线程：

```python
op = robot.chassis.navigate_to_station(station_id="charging", mode=NavigationMode.NAVIGATE)

# 轮询状态快照（也可迭代 op.events() 等待推进）
snapshot = op.get(timeout_ms=1000)
print(snapshot.state, snapshot.terminal)   # OperationState, 是否终态

for snap in op.events(poll_timeout_ms=200, timeout_ms=30000):
    print(snap.state, snap.feedback)       # 进度反馈（如 ChassisProgressT）
    if snap.terminal:
        break

if snapshot.error is not None: ...          # 失败时的 FabotError
result = snapshot.result                    # 终态结果（如 ChassisOutcomeT）

op.cancel()                                 # 取消任务
```

`OperationState`：`Queued` / `Running` / `Succeeded` / `Failed` / `Canceled` / `Timeout`。终态（`terminal`）后不再推进；`Failed` / `Timeout` 时通过 `error` 取失败原因。

## 取消语义

- `cancel()` 是**尽力而为**：已进入执行段的任务由服务端决定是否可中断，取消成功后状态为 `Canceled`。
- 句柄 `close()` 不影响服务端任务本身（任务在机器人侧运行）。

## 底层句柄（高级用法）

产品层 Proxy 之下是 `SlotHandle`（`fabot.core`）：`command()` / `start_operation()` / `subscribe()`，payload 为原始字节（`BytesPayload`），配合 `encode_flatbuffer` / `decode_flatbuffer` 使用。普通应用无需直接使用。
