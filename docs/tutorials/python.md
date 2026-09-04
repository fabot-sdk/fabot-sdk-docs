---
title: 第一个程序（Python）
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 第一个程序（Python）

本教程用十几行代码完成一次完整会话：连接机器人 → 等待就绪 → 读整机信息 → 调用两个能力 → 自动断开。

## 前置条件

- 已安装 SDK 并能 `import fabot`，见 [安装 Python SDK](../install/python.md)；环境要求见 [环境要求](../install/requirements.md)。
- 网络可达机器人控制面端点（IP + 端口，默认 7557）。
- 没有真实机器人？改用 `Robot.mock()` 离线跑通同样流程，见 [Mock 测试](../usage/mock.md)。

## 完整代码

```python
from fabot import Robot

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()                       # 等待已绑定且必需的槽位就绪

    print("平台版本:", robot.version())
    print("整机状态:", robot.state().state)

    # 调用能力：让面屏显示文字
    applied = robot.screen.show_text(text="Hello, fabot!")
    print("面屏结果:", applied.outcome.success)

    # 读取 IO 输入
    level = robot.io.get_digital_input(channel="di_1")
    print("di_1 =", level.value)
# 退出 with 时自动 close()
```

把 IP 换成你的机器人地址，保存为 `hello_fabot.py`，运行 `python3 hello_fabot.py`。

## 代码说明

- `Robot.connect(ip, port)`：按控制面端点建立连接；`with` 确保退出时自动 `close()`。其他连接方式（`from_endpoint` / `from_config` / `mock`）与 `ClientOptions` 见 [连接与 Robot 入口](../usage/connection.md)。
- `wait_ready()`：阻塞等待已绑定且启用、必需的槽位就绪；未绑定的可选槽位不阻塞启动。等待超时由 `ClientOptions.resolve_timeout_ms` 控制。
- `version()` 返回平台版本字符串；`state()` 返回 `RobotState` 快照，其 `.state` 字段是整机运行状态（`RobotRunState`），见 [状态、故障与生命周期](../usage/status-faults.md)。
- 能力通过槽位只读属性访问（`robot.screen`、`robot.io` 等，共 22 个槽位）。每次调用返回结果对象：`show_text` 返回的 `applied.outcome.success` 表示是否成功，`get_digital_input` 返回的 `level.value` 是当前电平。字段细节见参考页 [Screen](../reference/python/screen.md) 与 [IO](../reference/python/io.md)。
- 槽位未绑定时调用会抛 `AdapterUnbound`；真机上可先查 `robot.io.has_adapter` 再调用。错误类型与处理见 [错误处理](../usage/errors.md)。

## 下一步

- 没有机器人？用 [Mock 测试](../usage/mock.md) 离线开发：`Robot.mock()`。
- 理解调用模型：[命令与长时操作](../usage/commands-operations.md)、[事件与数据通道](../usage/events-channels.md)。
- 查具体能力：[接口参考](../reference/python/index.md)。
- 更多完整代码：[使用示例（Python）](../examples/python/index.md)。
