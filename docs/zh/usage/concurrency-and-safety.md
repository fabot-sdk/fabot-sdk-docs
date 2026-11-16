---
title: 并发、线程与安全
status: draft
owner: fabot-core
updated: 2026-11-16
---

# 并发、线程与安全

这一页回答集成时最容易踩的三类问题：哪些调用不能放到回调里、多个线程能不能同时用同一个 `Robot`、以及运动命令下发后会不会自己停。

## 线程模型

| 问题 | 结论 |
|------|------|
| `Robot` / 槽位 Proxy 能否跨线程复用？ | 可以。内部对解析缓存、连接状态和通道租约都加锁；同一实例可以被多个线程共享 |
| 两个线程同时给同一槽位发运动命令？ | 传输层允许，但**语义上不保证**谁先谁后。同一资源上的 Operation 由平台按 `queue` / `reject` 策略排序，Command 则是先到先处理 |
| 同一个订阅的回调是否串行？ | 是。投递走客户端的事件分发路径，单条事件按到达顺序回调；不同订阅之间不保证相对顺序 |
| 回调里能做什么？ | 只能做轻量处理。任何阻塞 API 都会抛 `ClientThreadError` |

**推荐做法是「每个槽位一个写者」**：把某个槽位（或某台机器人的运动）的所有命令收敛到一个线程或一个 `queue`，其他线程只读状态、只投递任务。这能消除「谁最后下发谁生效」这类竞态，也不需要自己推测服务端的调度顺序。

```python
import queue
import threading

commands: "queue.Queue[tuple[str, object]]" = queue.Queue()

def worker(robot):
    while True:
        name, payload = commands.get()
        if name == "stop":
            return
        if name == "twist":
            robot.chassis.servo_twist(**payload)

t = threading.Thread(target=worker, args=(robot,), daemon=True)
t.start()
commands.put(("twist", {"vx": 0.2, "vy": 0.0, "vtheta": 0.1}))
# 结束时
commands.put(("stop", None))
t.join()
```

## SDK I/O 线程

事件、日志与通道回调都在 SDK 的 I/O 线程执行。在那里调用下列 API 会抛 `ClientThreadError`：

- 连接工厂方法（`Robot.connect` / `from_config` / `from_endpoint` / `from_backend`）与 `close()`
- 所有 Command 与 Operation 的提交、`wait()`、`get()`、`frames()`、`next()`、`renew()`
- 打开 / 关闭通道，以及发起新的订阅
- `wait_ready()`、`robot.frames` 的查询与写入

需要重处理时，把数据丢到自己的队列，由普通线程消费：

```python
from queue import Queue, Empty

events: "Queue[object]" = Queue()

def on_event(event):
    events.put(event)          # 回调里只做入队

def consumer():
    while True:
        try:
            event = events.get(timeout=0.5)
        except Empty:
            continue
        # 在这里做耗时处理、调用阻塞 API
        print(event.header.name)
```

`Robot.mock()` 同样受这条约束：Mock 也走同一套线程检查。

## 伺服与安全

`servo_twist()` / `servo_pose()` / `servo_height()` 是**单次下发**，不是持续会话：

- 目标不会自动失效。停止运动必须显式调用对应能力的 `stop()`（底盘、升降柱），或者下发零速度并确认已生效。
- 连接断开时，SDK 不做任何「自动刹车」的承诺。把安全停机交给机器人侧的看门狗与硬件急停，不要依赖客户端进程存活。
- `robot.estop` 是**软件急停**：它是闩锁，触发后 `robot.state().mode` 进入 `Estopped`，需要显式 `release()`。它不能替代硬件急停回路。

:::warning 客户端不是安全回路
SDK 跑在应用进程里。进程崩溃、主机断电、网络中断都可能发生在任意时刻。任何「人可能进入运动范围」的场景都必须由机器人侧的硬件急停与安全看门狗兜底。
:::

## 幂等与重试

| 类型 | 能否原样重试 | 说明 |
|------|--------------|------|
| 读类 Command（`get_*`） | 可以 | 无副作用 |
| 幂等的写 Command（`set_*`、`acquire`、`resource` 释放） | 可以 | 重复写同一值结果相同 |
| `servo_twist` / `servo_pose` / `servo_height` | 有条件 | 重试会再发一次目标；超时后先读状态确认上一次是否已生效 |
| 运动 Operation 提交（`move_*`） | 不可以 | 重试可能产生第二个任务；先 `get()` 看句柄状态 |
| `stop()` | 可以 | 重复调用无额外副作用 |
| `set_height_zero` | 不可以 | 每次调用都会把当前位置设为零点 |

`retryable` 只说明「这个错误类型在语义上可能稍后成功」，不代表可以直接重放。判断顺序建议：先看错误类型，再看这次调用是否幂等，最后才决定重试。

## 断线与重连

- 连接状态用 `robot.connection.is_connected()` 查，或用 `robot.connection.subscribe(cb)` 订阅。
- 断线后已建立的 `SubscriptionToken` 与 Channel 都不保证继续有效；重连后应重新订阅、重新开通道。
- 正在运行的 Operation 在机器人侧继续执行，句柄在重连后可能取不到快照；需要结果时用业务状态或机器人侧日志确认。
- `Robot` 实例不支持「重新连接」：断线后新建一个 `Robot`，再重建订阅与通道。

完整的排查步骤见 [故障排除](../troubleshooting.md)。
