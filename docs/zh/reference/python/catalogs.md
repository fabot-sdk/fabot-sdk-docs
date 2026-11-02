---
title: 文本目录 Catalogs
status: draft
owner: fabot-core
updated: 2026-11-02
---

# 文本目录 Catalogs

`Catalogs`（文本目录）是独立的展示层工具类（`fabot.catalogs`，可从 `fabot` 顶层导入），不是能力模块，没有槽位。它把**诊断码**、**日志键**与**指标名**映射成本地化文本；`Catalogs.load()` 绑定随 SDK 嵌入的文本表，运行时纯查表，不访问机器人。使用场景见 [文本目录 Catalogs](../../usage/catalogs.md)。

## 模块概述

- 非能力、无槽位、无 Command / Operation / 通道 / 事件
- 产品路径：`Catalogs.load()`；也可用 `Catalogs.default()` 取进程级单例
- 四张表：日志、错误、故障、指标；查找语言由 `set_language` 设置，未命中按回退链落到 `en`

## API 总览

| 成员 | 说明 |
|------|------|
| `Catalogs(...)` | 用自定义文本表构造；产品路径请用 `load()` |
| `load(language=None)` | 绑定 SDK 嵌入的文本表，返回 `Catalogs` |
| `default()` | 进程级懒加载单例 |
| `language` | 当前语言偏好（只读） |
| `set_language(locale)` | 设置语言，返回 `self` |
| `format_log(record, locale=None)` | 按 `{component}.{action}` 填模板 |
| `format_error(error, locale=None)` | 按诊断码 `0xXXXXXXXX` 填模板 |
| `format_fault(record, locale=None)` | 同 `format_error`，按记录的诊断码查表 |
| `format_metric(record, locale=None)` | 按指标名查标题 |

## 方法

### Catalogs

```python
Catalogs(
    logs: Mapping[str, Mapping[str, str]] | None = None,
    errors: Mapping[str, Mapping[str, str]] | None = None,
    faults: Mapping[str, Mapping[str, str]] | None = None,
    metrics: Mapping[str, Mapping[str, str]] | None = None,
    language: str = "en",
) -> Catalogs
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `logs` | `Mapping[str, Mapping[str, str]] \| None` | `None` | 日志表：键为 `component.action`，值为语言 → 模板 |
| `errors` | `Mapping[str, Mapping[str, str]] \| None` | `None` | 错误表：键为诊断码字符串（`0x0103000C`），值为语言 → 模板 |
| `faults` | `Mapping[str, Mapping[str, str]] \| None` | `None` | 故障表：键同为诊断码字符串 |
| `metrics` | `Mapping[str, Mapping[str, str]] \| None` | `None` | 指标表：键为指标名，值为语言 → 标题 |
| `language` | `str` | `"en"` | 初始语言偏好；空串按 `"en"` |

`None` 视为空表。产品代码应调用 `load()`，不要手填嵌入的文本表。

### load

```python
Catalogs.load(language: str | None = None) -> Catalogs
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `language` | `str \| None` | `None` | 初始语言；`None` 时用环境变量 `FABOT_LANG`，未设置则 `en` |

```python
from fabot import Catalogs

catalogs = Catalogs.load("zh-CN")
```

### default

```python
Catalogs.default() -> Catalogs
```

返回进程级懒加载单例（首次调用时按 `FABOT_LANG` 加载），适合在日志格式化等通用位置复用。

### language

```python
catalogs.language -> str
```

当前语言偏好（只读属性）。由构造函数或 `set_language` 写入，查找时再按回退链解析，因此属性值不必等于最终命中的语言标签。

### set_language

```python
set_language(locale: str) -> Catalogs
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `locale` | `str` | （必填） | 展示语言；空串按 `"en"` |

返回 `self`，可链式调用。查找时的候选链：传入的原串 → 把 `_` 换成 `-` 的写法 → 若是 `zh*` 再补 `zh-CN` → 最后 `en`。未知语言落到英文。

```python
catalogs = Catalogs.load().set_language("zh-CN")
```

### format_log

```python
format_log(record: Any, *, locale: str | None = None) -> str
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `record` | `Any` | （必填） | 日志记录，通常为 `LogRecord`；按属性取值 |
| `locale` | `str \| None` | `None` | 本次查找的语言，缺省用 `self.language` |

查表键为 `{component}.{action}`。未命中返回该键。命中后用记录字段填 `{placeholder}`；未知占位符替换为空串。

内置字段：`level` / `component` / `action` / `ts` / `ts_us` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `fault_id` / `catalog_id`。`level` 规范为 `debug` / `info` / `warn` / `error`（整数 `0`–`3` 或同义字符串；`warning` 视为 `warn`）。`ts` 由 `ts_us` 转成 UTC ISO-8601。`record.attrs` 中的额外键会并入，但不覆盖上述已知字段。

```python
print(catalogs.format_log(record))
```

### format_error

```python
format_error(error: Any, *, locale: str | None = None) -> str
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `error` | `Any` | （必填） | `FabotError`（或带 `code` 的对象），或直接给 `int` 诊断码 |

查表键为 `0x{code:08X}`，先在错误表里查，再在故障表里查。命中后填 `{code}`；未命中回退到 `error.message`，再回退到诊断码字符串。

```python
print(catalogs.format_error(err))
print(catalogs.format_error(0x0103000C))
```

`FabotError.localized(locale=None)` 是同一逻辑的便捷入口；`str(err)` 在显式设置了语言时也会带上目录文本。

### format_fault

```python
format_fault(record: Any, *, locale: str | None = None) -> str
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `record` | `Any` | （必填） | 故障记录（`RobotFaultRecord` / `FaultState` 等），按 `code` 查表 |

与 `format_error` 完全等价：诊断码已经在故障记录里，不需要再传 `capability_id`。

```python
for record in robot.faults().chassis.records:
    print(catalogs.format_fault(record))
```

### format_metric

```python
format_metric(record: Any, *, locale: str | None = None) -> str
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `record` | `Any` | （必填） | `MetricRecord` 或指标名字符串；按属性 `name` 取值 |

查表键为指标名。未命中返回指标名本身；名字为空返回空串。

```python
print(catalogs.format_metric(metric_record))
```

## 通道

无数据通道。通用通道机制见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

无事件。结构化日志来自 `robot.logs.subscribe`，见 [日志、指标与可观测性](../../usage/observability.md)。

## 异常

`format_log` / `format_error` / `format_fault` / `format_metric` 在未命中时不抛错，按上文回退。协议错误的层次与处理见 [错误处理](../../usage/errors.md)。

## 状态

无状态袋。故障展示的输入来自 `robot.faults()` / 各槽位 `faults()` / `FaultState`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

无独立资源句柄。文本是随 SDK 版本嵌入的快照；平台新增诊断码在未升级 SDK 时按原始码回退显示，见 [版本配套](../../install/compatibility.md)。
