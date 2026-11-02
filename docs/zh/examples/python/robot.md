---
title: 急停
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 急停

订阅整机急停与故障事件，并演示触发 / 解除急停的完整流程。事件模型见 [事件与数据通道](../../usage/events-channels.md)，故障与生命周期见 [状态、故障与生命周期](../../usage/status-faults.md)，接口与字段见 [Robot](../../reference/python/robot.md)。

## 订阅急停与故障事件

`robot.events.estop_changed` 推送急停闩锁变化（`EstopChangedEvent.estop` 为 `EstopState` 快照），`robot.events.faults_changed` 推送整机故障聚合变化。两者都是整机事件，连接建立后即可订阅，无需 `wait_ready()` 等待能力槽位。回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。

```python
from fabot import Robot
from fabot.core import EstopChangedEvent, FaultsChangedEvent

with Robot.connect("192.168.1.10", 7557) as robot:
    def on_estop(event):          # event: EstopChangedEvent
        state = event.estop
        print("急停:", state.asserted, state.reason, state.source_id)

    def on_faults(event):         # event: FaultsChangedEvent
        print("故障:", event.faults.revision)

    estop_token = robot.events.estop_changed.subscribe(on_estop)
    faults_token = robot.events.faults_changed.subscribe(on_faults)
    # ...
    estop_token.close()
    faults_token.close()
```

需要拿到未解码的原始总线事件时，用通配订阅加 `matches()` / `from_event()`：

```python
def on_event(event):
    decoded = EstopChangedEvent.try_from_event(event)   # 不匹配时返回 None
    if decoded is not None:
        print(decoded.estop.asserted)

token = robot.events.subscribe(on_event, name="fabot.estop.changed")
```

## 触发与解除急停

`robot.estop.engage()` 触发整机急停闩锁，`robot.state().mode` 进入 `RobotMode.Estopped`；`release()` 解除。两个方法都返回最新的 `EstopState`。

```python
state = robot.estop.engage(reason="manual test", source="app")
print(state.asserted, state.reason)

print(robot.state().mode, robot.state().is_estopped)

state = robot.estop.release(reason="test done", source="app")
print(state.asserted)
```

## 恢复检查

解除急停后要确认三件事：模式已脱离 `Estopped`、健康度、以及急停期间留下的故障。

```python
import time

robot.estop.release(reason="site check done")

for _ in range(50):
    st = robot.state()
    if not st.is_estopped:
        break
    time.sleep(0.1)

if st.is_estopped:
    print("仍处于急停:", hex(st.root_causes[0].code) if st.root_causes else st.mode)

print("健康度:", st.health)
for record in robot.faults().chassis.records:
    print("遗留故障:", hex(record.code), record.severity)

print(robot.chassis.lifecycle())
```

注意：运行模式与健康度是两条独立的轴。急停只改变 `mode`，`health` 仍由故障与上电自检决定，所以「急停中但健康」是合法组合。完整排查步骤见 [故障排除](../../troubleshooting.md)。
