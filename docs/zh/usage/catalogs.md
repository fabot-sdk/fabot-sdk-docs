---
title: 文本目录 Catalogs
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 文本目录 Catalogs

机器人端上报的错误、故障、日志与指标只带**诊断码**与结构化字段，不带面向人的文案。`Catalogs`（`fabot.catalogs`，可从 `fabot` 顶层导入）把诊断码、日志键与指标名映射成本地化文本，用于日志面板、告警与自建 UI。它是纯展示层工具，不访问机器人。签名细节见 [文本目录 Catalogs](../reference/python/catalogs.md)。

## 加载与语言

```python
from fabot import Catalogs

catalogs = Catalogs.load("zh-CN")   # 不传语言时按 FABOT_LANG，未设置则 en
print(catalogs.language)            # "zh-CN"

catalogs.set_language("en")         # 返回 self，可链式
```

`Catalogs.load()` 绑定随 SDK 版本嵌入的文本表，运行时纯查表。`Catalogs.default()` 返回进程级单例，适合在日志格式化之类的高频位置复用。

查找语言按回退链解析：传入的原串 → 把 `_` 换成 `-` → 若是 `zh*` 再补 `zh-CN` → 最后 `en`。未知语言落到英文。单次查找也能用 `locale=` 临时覆盖默认语言。

## 错误与故障

诊断码统一以 `0xXXXXXXXX` 为键，错误表与故障表共用同一次查找。`format_error` 接受错误对象或裸整数码，`format_fault` 直接吃故障记录（码在记录里）。

```python
from fabot import FabotError

try:
    robot.chassis.servo_twist(vx=0.3, vy=0.0)
except FabotError as err:
    print(hex(err.code), err.category, err.trace_id)
    print(catalogs.format_error(err))       # 目录文本；未命中回退到 err.message
    print(err.localized("zh-CN"))           # 同一逻辑的便捷入口
```

```python
for record in robot.faults().chassis.records:
    print(hex(record.code), catalogs.format_fault(record))
```

未命中时的回退顺序：错误表 → 故障表 → `error.message` → `0xXXXXXXXX`。所以升级机器人平台但还没升级 SDK 时，新码不会显示成空白，而是显示本地 message 或原始码。

## 日志

日志键是 `{component}.{action}`。命中后模板里的 `{placeholder}` 由记录字段填充，`record.attrs` 里的额外键也会并入，但不覆盖已知字段。

```python
def on_log(record):
    print(catalogs.format_log(record))

token = robot.logs.subscribe(on_log)
```

内置字段：`level` / `component` / `action` / `ts` / `ts_us` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `fault_id` / `catalog_id`。`level` 会规范成 `debug` / `info` / `warn` / `error`，`ts` 会由 `ts_us` 转成 UTC ISO-8601。

未命中返回键本身（`component.action`），便于发现缺失的目录条目。

## 指标

`format_metric(record)` 按 `MetricRecord.name` 查中文 / 英文标题，未命中返回指标名本身。

```python
for record in robot.metrics.records():
    print(catalogs.format_metric(record), record.value.scalar)
```

## 与版本配套的关系

文本表是随 SDK 版本嵌入的快照。平台的诊断码在演进，SDK 落后时新码查不到，按上文回退显示原始码或本地 message；升级 SDK 即可获得完整文案。版本配套原则见 [版本配套](../install/compatibility.md)。

## 相关

- 错误层次与可重试性：[错误处理](errors.md)
- 日志与指标入口：[日志、指标与可观测性](observability.md)
- 故障模型：[状态、故障与生命周期](status-faults.md)
- 完整签名：[文本目录 Catalogs](../reference/python/catalogs.md)
