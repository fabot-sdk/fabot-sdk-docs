---
title: 文本目录 Catalogs
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 文本目录 Catalogs

`Catalogs`（文本目录，`fabot.catalogs`，可从 `fabot` 顶层导入）把结构化的日志、错误码和故障记录转成给人看的本地化文本，供人机界面、日志面板使用。它是嵌入 SDK 的查表工具，运行时不访问机器人，也不是能力模块、没有槽位。方法签名见 [文本目录 Catalogs](../reference/python/catalogs.md)。

程序判断请继续用 `FabotError.code` / `category` 与类型化故障袋，**不要匹配本地化字符串**。

## 加载与语言

`Catalogs.load()` 取出随当前 SDK 版本嵌入的文本目录。`set_language(locale)` 设置展示语言并返回自身，可链式调用；`language` 是当前偏好（只读属性）。

```python
from fabot import Catalogs

catalogs = Catalogs.load().set_language("zh-CN")
print(catalogs.language)    # "zh-CN"
```

查找时按候选链回退：传入的原串 → 把 `_` 换成 `-` 的写法 → 若是 `zh*` 再补 `zh-CN` → 最后 `en`。未知语言落到英文。空串或未设置时按 `en` 处理。

## 本地化错误

`format_error` 接受 `FabotError` 或 `int` 错误码，按 `str(code)` 查表。未命中时回退到 `error.message`，再回退到错误码字符串。错误层次、重试与 `trace_id` 见 [错误处理](errors.md)。

```python
from fabot import Catalogs, FabotError, Robot

catalogs = Catalogs.load().set_language("zh-CN")

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()
    try:
        robot.chassis.stop()
    except FabotError as err:
        print(catalogs.format_error(err))      # 按 err.code 查本地化文本
        print(catalogs.format_error(81001))    # 也可直接传错误码
```

## 本地化日志

`format_log` 按 `{component}.{action}` 查模板；未命中返回该键本身。订阅入口是 `robot.logs.subscribe`，回调收到 `LogRecord` 后再格式化，见 [事件与数据通道](events-channels.md)。

```python
from fabot import Catalogs, Robot
from fabot.core import LogLevel

catalogs = Catalogs.load().set_language("zh-CN")

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready()

    def on_log(record):
        print(catalogs.format_log(record))

    token = robot.logs.subscribe(on_log, min_level=LogLevel.Warn)
```

回调仍在 SDK I/O 线程执行：只做轻量格式化与投递，不要在回调里调用阻塞 API。

## 本地化故障

`format_fault` 按 `{capability_id}/{catalog_id}` 查模板。未命中回退到 `fault_id`，再回退到 `catalog_id`。

- 带 `capability_id` 的记录（`RobotFaultRecord`）可省略第二参数。
- 能力级 `CapabilityFaultRecord` / `FaultState` 不含 `capability_id`，必须显式传 `capability_id=`，否则抛 `ValueError`。
- `robot.faults()` 与 `robot.events.faults_changed` 给出的是按槽位组织的类型化故障袋（`FaultState`），属于后一种，需要传入能力 id。

当前各模块尚未声明已命名故障，故障袋通常只有 `revision`，因此 `format_fault` 多半走回退；接口仍按上述规则使用。故障模型见 [状态、故障与生命周期](status-faults.md)。

```python
# RobotFaultRecord 自带 capability_id
print(catalogs.format_fault(record))

# FaultState / CapabilityFaultRecord 须显式传入
print(catalogs.format_fault(slot_fault, capability_id="chassis"))
```

## 快照与未命中

本地化文本随 SDK 版本冻结。机器人平台更新而 SDK 未更新时，新增的错误码或故障仍能正常上报，只是文本目录里没有对应条目，按上一节的回退规则显示原始 ID。升级 SDK 即可获得最新文本，见 [版本配套](../install/compatibility.md)。

`format_log` / `format_error` / `format_fault` 未命中时**不抛错**，只按回退显示。
