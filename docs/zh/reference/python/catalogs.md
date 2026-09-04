---
title: 文本目录 Catalogs
status: draft
owner: fabot-core
updated: 2026-09-04
---

# 文本目录 Catalogs

`Catalogs`（文本目录）是独立的展示层工具类（`fabot.catalogs`，可从 `fabot` 顶层导入），不是能力模块，没有槽位。`Catalogs.load()` 绑定随 SDK 嵌入的日志 / 错误 / 故障文本目录；运行时纯查表，不访问机器人。使用场景见 [文本目录 Catalogs](../../usage/catalogs.md)。

## 模块概述

- 非能力、无槽位、无 Command / Operation
- 产品路径：`Catalogs.load()`；测试或自建 UI 可用构造函数传入自定义文本目录
- 查找语言由 `set_language` 设置，未命中按回退链落到 `en`

## API 总览

本模块没有 Command、Operation、数据通道与事件。

| 成员 | 说明 |
|------|------|
| `Catalogs(...)` | 用自定义文本目录构造；产品路径请用 `load()` |
| `load()` | 绑定 SDK 嵌入的文本目录，返回 `Catalogs` |
| `language` | 当前语言偏好（只读） |
| `set_language(locale)` | 设置语言，返回 `self` |
| `format_log(record)` | 按 `{component}.{action}` 填模板 |
| `format_error(error)` | 按 `FabotError.code` 填模板 |
| `format_fault(record, capability_id="")` | 按 `{capability_id}/{catalog_id}` 填模板 |

## 方法

### Catalogs

```python
Catalogs(
    logs: Mapping[str, Mapping[str, str]] | None = None,
    errors: Mapping[str, Mapping[str, str]] | None = None,
    faults: Mapping[str, Mapping[str, str]] | None = None,
    language: str = "en",
) -> Catalogs
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `logs` | `Mapping[str, Mapping[str, str]] \| None` | `None` | 日志表：键为 `component.action`，值为语言 → 模板 |
| `errors` | `Mapping[str, Mapping[str, str]] \| None` | `None` | 错误表：键为错误码字符串，值为语言 → 模板 |
| `faults` | `Mapping[str, Mapping[str, str]] \| None` | `None` | 故障表：键为 `{capability_id}/{catalog_id}`，值为语言 → 模板 |
| `language` | `str` | `"en"` | 初始语言偏好；空串按 `"en"` |

`None` 视为空的文本目录。产品代码应调用 `load()`，不要手填嵌入的文本目录。

### load

```python
Catalogs.load() -> Catalogs
```

绑定当前 SDK 版本嵌入的日志 / 错误 / 故障文本目录。无参数。

```python
from fabot import Catalogs

catalogs = Catalogs.load()
```

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
format_log(record: Any) -> str
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `record` | `Any` | （必填） | 日志记录，通常为 `LogRecord`；按属性取值 |

查表键为 `{component}.{action}`。未命中返回该键。命中后用记录字段填 `{placeholder}`；未知占位符替换为空串。

内置字段：`level` / `component` / `action` / `ts` / `ts_us` / `message` / `trace_id` / `node_id` / `instance_id` / `capability_id` / `method` / `operation_id` / `channel_id` / `error_category` / `fault_id` / `catalog_id`。`level` 规范为 `debug` / `info` / `warn` / `error`（整数 `0`–`3` 或同义字符串；`warning` 视为 `warn`）。`ts` 由 `ts_us` 转成 UTC ISO-8601。`record.attrs` 中的额外键会并入，但不覆盖上述已知字段。

```python
print(catalogs.format_log(record))
```

### format_error

```python
format_error(error: Any) -> str
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `error` | `Any` | （必填） | `FabotError`（或带 `code` / `message` 的对象），或 `int` 错误码 |

查表键为 `str(code)`。未命中回退到 `error.message`，再回退到错误码字符串。模板可用 `{code}`、`{message}`。

```python
print(catalogs.format_error(err))
print(catalogs.format_error(81001))
```

### format_fault

```python
format_fault(record: Any, capability_id: str = "") -> str
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `record` | `Any` | （必填） | 故障记录，按属性读取 `catalog_id` / `fault_id` / `capability_id` 等 |
| `capability_id` | `str` | `""` | 能力 id；为空时改用 `record.capability_id` |

查表键为 `{capability_id}/{catalog_id}`。两者都解析不到能力 id 时抛 `ValueError`。未命中回退到 `fault_id`，再回退到 `catalog_id`。`RobotFaultRecord` 自带 `capability_id`；`CapabilityFaultRecord` / `FaultState` 不含，必须显式传入。

```python
print(catalogs.format_fault(record))
print(catalogs.format_fault(slot_fault, capability_id="chassis"))
```

## 通道

无数据通道。通用通道机制见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

无事件。结构化日志来自 `robot.logs.subscribe`，见 [事件与数据通道](../../usage/events-channels.md)。

## 异常

`format_fault` 在无法解析 `capability_id` 时抛 `ValueError`（不是 `FabotError`）。`format_log` / `format_error` / `format_fault` 未命中文本目录时不抛错，按上文回退。协议错误的层次与处理见 [错误处理](../../usage/errors.md)。

## 状态

无状态袋。故障展示的输入来自 `robot.faults()` / 各槽位 `faults()` / `FaultState`，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

无独立资源句柄。文本是随 SDK 版本嵌入的快照；平台新增码或故障在未升级 SDK 时按原始 ID 回退显示，见 [版本配套](../../install/compatibility.md)。
