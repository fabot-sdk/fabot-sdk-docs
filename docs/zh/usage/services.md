---
title: 平台服务管理
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 平台服务管理

机器人上的平台服务（service，如 `fabot_ocs2`）对 SDK 只暴露**有限的一组平台操作**：启用 / 停止 / 重启、状态查询与配置读写。业务接口不对客户端开放。只有声明为客户端可见的服务才会出现在 `robot.services` 中。

## 入口与服务列表

`robot.services` 按短名暴露各客户端可见服务的句柄：

| 属性 | service id | 句柄类型 | 配置类型 |
|------|-----------|----------|----------|
| `robot.services.ocs2` | `fabot_ocs2` | `Ocs2ServiceHandle` | `Ocs2Config` |
| `robot.services.orbbec_sdk_ros2` | `fabot_orbbec_sdk_ros2` | `OrbbecSdkRos2ServiceHandle` | `OrbbecSdkRos2Config` |

句柄上的 `SERVICE_ID` / `CONFIG` 类属性分别给出服务 id 与配置类型。

- `ocs2` 是运控（全身控制）栈的启动入口，通过 `launch` 配置决定启动哪些部分、用真机还是仿真硬件、左右末端执行器型号。
- `orbbec_sdk_ros2` 是 Orbbec ROS 相机后端，产品部署中通常默认不启动，需要该后端时再显式 `start()`。

## 平台操作

| 操作 | 说明 |
|------|------|
| `start()` / `stop()` / `restart()` | 生命周期控制 |
| `state()` | `ServiceState` 快照 |
| `is_running()` | 运行中判断（等价于 `state().is_running`） |
| `get_config()` / `set_config(cfg)` | 读取 / CAS 修改服务配置（冲突抛 `ConfigurationConflict`） |

```python
svc = robot.services.ocs2               # Ocs2ServiceHandle
svc.start()
print(svc.state(), svc.is_running())

cfg = svc.get_config()                  # 强类型配置 dataclass
svc.set_config(cfg)                     # CAS，冲突抛 ConfigurationConflict
```

## 生命周期控制

`start()` / `stop()` / `restart()` 是同步调用：向平台下发期望状态，指令失败时抛 `FabotError`（见 [错误处理](errors.md)）。进程状态迁移是异步的，调用返回后用 `state()` / `is_running()` 确认，或订阅 `service_state_changed` 事件跟踪迁移。

:::warning
`stop()` / `restart()` 会影响依赖该服务的功能，请确认影响面后再操作。运控栈重启期间机械臂与底盘都不可用。
:::

## 状态查询

`state()` 返回 `ServiceState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `service_id` | `str` | 服务 id（如 `fabot_ocs2`） |
| `desired` | `ServiceDesiredState` | 期望状态：`Unknown` / `Running` / `Stopped` |
| `state` | `ServiceRunState` | 观测状态：`Unknown` / `Starting` / `Ready` / `Stopping` / `Stopped` / `Failed` |
| `pid` | `int` | 进程号（未运行时为 `-1`） |
| `restart_count` | `int` | 累计重启次数 |
| `source_instance_id` | `str` | 状态来源实例 id |

另有两个便捷属性：`is_running`（`state` 为 `Starting` / `Ready`）与 `is_ready`（`state` 为 `Ready`）。

## 服务配置

`get_config()` 返回强类型配置 dataclass（支持 `to_yaml()` / `from_yaml()` / `field_options()`）；`set_config(cfg)` 以 CAS 提交，与当前状态冲突时抛 `ConfigurationConflict`（见 [错误处理](errors.md)），成功后返回重新读取的最新配置。

```python
from fabot.errors import ConfigurationConflict

svc = robot.services.ocs2
cfg = svc.get_config()
print(cfg.to_yaml())                    # 当前生效的 launch 配置

cfg.launch.hardware = "real"            # 各字段为 StrEnum，可传字符串
try:
    cfg = svc.set_config(cfg)           # CAS；成功后返回最新配置
except ConfigurationConflict:
    cfg = svc.get_config()              # 重新读取，合并修改后重试
```

`Ocs2Config.field_options()` 给出每个字段的合法取值（如 `launch.hardware` 的 `real` / `real_usb` / `mock_components` / `isaac`），可直接用来构建下拉框。冲突重试的通用模式与整机配置一致，见 [配置管理](configuration.md)。

## 观察服务状态变化

服务状态迁移通过整机事件 `robot.events.service_state_changed` 推送（`ServiceStateChangedEvent`）：

```python
def on_service_state(event):
    st = event.service_state                # ServiceState
    print(st.service_id, st.desired, st.state, st.is_running)

token = robot.events.service_state_changed.subscribe(on_service_state)
```

回调在 SDK I/O 线程执行，须保持轻量，禁止在回调内调用 `start()` 等阻塞 API；订阅的通用约定见 [事件与数据通道](events-channels.md)。

:::note
`Robot.mock()` 返回的 `MockRobot` 提供 `robot.services`，但控制操作只返回成功、运行状态保持在内存中；涉及真实服务行为的测试仍需真机或平台侧环境，见 [Mock 测试](mock.md)。
:::
