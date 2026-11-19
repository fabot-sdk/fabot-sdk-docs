---
title: 第一个程序（Python）
status: draft
owner: fabot-core
updated: 2026-11-17
---

# 第一个程序（Python）

本教程分三段：先只验证连接（不依赖任何能力），再探测这台机器人到底装了哪些能力，最后才调用能力。按这个顺序，任何一步失败都能立刻定位到原因。

## 前置条件

- 已安装 SDK 并能 `import fabot`，见 [安装 Python SDK](./install/python.md)；环境要求见 [环境要求](./install/requirements.md)。
- 网络可达机器人控制面端点（IP + 端口，默认 7557）。SDK 与机器人控制面在同一台主机上时（例如在机器人本体上开发），可以不传地址，直接 `Robot.connect()`。
- 没有真实机器人？`Robot.mock()` 可以做本地联调，但它默认返回空壳响应，本教程第一段可以跑通，第二、三段需要先注入钩子，见 [Mock 测试](../usage/testing/mock.md)。

## 第一段：只验证连接

这段只用连接与整机查询，不碰任何能力槽位，所以即使机器人没装面屏或 IO 也能跑通。

```python
from fabot import Robot

# 控制面在另一台主机时，把 127.0.0.1 换成它的地址；
# 本机使用也可以省略地址：Robot.connect()
with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    print("平台版本:", robot.version())
    print("SDK 版本:", robot.sdk_version)
    state = robot.state()
    print("运行模式:", state.mode.name, "健康度:", state.health.name)
# 退出 with 时自动 close()
```

预期输出形如：

```console
平台版本: 1.1.0-alpha.1
SDK 版本: 1.1.0-alpha.1
运行模式: Idle 健康度: Normal
```

`mode` / `health` 的具体取值随现场状态变化；能打印出来就说明连接、槽位解析与整机查询都正常。这一步失败请直接看 [故障排除](../troubleshooting.md)。

用 `Robot.mock()` 跑这段时，`version()` 返回哨兵 `0.0.0`、`mode` / `health` 是 `Unknown`，这是 Mock 的正常表现，不是故障。

## 第二段：探测这台机器人有什么

能力槽位是否可用取决于机器人配置。先列出来，再决定调用什么：

```python
with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()
    for slot_id, proxy in sorted(robot.slots.items()):
        lc = proxy.lifecycle()
        print(f"{slot_id:22s} adapter={proxy.has_adapter!s:5s} lifecycle={lc.lifecycle.name}")
```

预期输出是 24 行左右，每行一个槽位。`adapter=True` 且 `lifecycle=Active` 的槽位才适合直接调用；`adapter=False` 说明这台机器人没装该能力，后续调用会失败或超时。

## 第三段：调用两个能力

只在探测到的槽位上调用。下面代码先判断再执行：

```python
from fabot.capabilities.io import PinDirection

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready()

    if robot.screen.has_adapter:
        applied = robot.screen.show_text("Hello, fabot!")
        print("面屏结果:", applied.outcome.success, applied.status.overlay_text)

    if robot.io.has_adapter:
        robot.io.acquire(
            chip="tegra264-gpio", line=17, direction=PinDirection.INPUT, value=False
        )
        try:
            print("line 17 =", robot.io.get_level(chip="tegra264-gpio", line=17).value)
        finally:
            robot.io.release(chip="tegra264-gpio", line=17)
```

把 IP 换成你的机器人地址（示例用本机回环地址 `127.0.0.1`；机器人不在本机时换成它的地址），保存为 `hello_fabot.py`，运行 `python3 hello_fabot.py`。

:::note `outcome.success` 可能是 `None`
`ScreenStatusApplied.outcome` 与 `LineApplied.outcome` 在平台未回填时可能是 `None`。要严格判断成功，写成 `bool(applied.outcome and applied.outcome.success)`；失败细节看 `Outcome.status_message`。
:::

:::note `chip` 因机器而异
上面写的 `tegra264-gpio` 只是这台机器的内核标签。换成你的机器人前，先用 `robot.io.chips()` 看芯片标签与线号；标签为空的芯片用 `gpiochipN` 这类设备名寻址。
:::

## 代码说明

- `Robot.connect(host, port)`：按控制面端点建立连接；本机使用（SDK 与控制面同主机）时省略参数写成 `Robot.connect()`，由默认配置自动发现端点。`with` 确保退出时自动 `close()`。其他连接方式（`from_endpoint` / `from_config` / `mock`）与 `ClientOptions` 见 [连接与 Robot 入口](../usage/basics/connection.md)。
- `wait_ready()`：阻塞等待**已绑定、已启用且标记为必需**的槽位就绪；未绑定或非必需的槽位会被跳过，不会阻塞也不会报错。单槽位等待上限由 `ClientOptions.resolve_timeout_ms` 控制。这也是第二段要自己探测槽位的原因。
- `version()` 返回平台版本字符串，`sdk_version` 是本机 SDK 版本；`state()` 返回 `RobotState` 快照，`mode` 是运行模式（`RobotMode`）、`health` 是健康度（`HealthState`），见 [状态、故障与生命周期](../usage/data/status-faults.md)。两者都是 `IntEnum`：直接打印得到数字，取 `.name` 才是 `Idle` / `Normal` 这类名字。
- `robot.slots` 是槽位 id 到 Proxy 的字典，共 24 项；`has_adapter` 与 `lifecycle()` 是判断「能不能调」的两个最直接入口。完整清单见 [Robot 入口](../reference/python/robot.md#slots)。
- 读写一条线前须先 `acquire`，用完后 `release`（放在 `finally` 里，异常时也能释放）。线由芯片 + 片内线号定位，字段细节见参考页 [面屏 Screen](../reference/python/screen.md) 与 [IO](../reference/python/io.md)。
- 槽位未绑定时能力方法仍会下发，由平台返回失败或超时；`get_config()` / `as_adapter()` 则会抛 `AdapterUnbound`。错误类型与处理见 [错误处理](../usage/diagnostics/errors.md)。

## 下一步

- 没有机器人？用 [Mock 测试](../usage/testing/mock.md) 离线开发：`Robot.mock()`。
- 先读约定：[时间基准与坐标系约定](../usage/basics/conventions.md)、[并发、线程与安全](../usage/basics/concurrency-and-safety.md)。
- 理解调用模型：[命令与长时操作](../usage/basics/commands-operations.md)、[事件与数据通道](../usage/data/events-channels.md)。
- 打日志与指标、抓现场：[日志、指标与可观测性](../usage/diagnostics/observability.md)。
- 查具体能力：[接口参考](../reference/python/index.md)。
- 更多完整代码：[使用示例（Python）](../examples/python/index.md)。
