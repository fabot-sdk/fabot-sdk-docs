---
title: IO（GPIO 线与芯片）
status: draft
owner: fabot-core
updated: 2026-11-17
---

# IO（GPIO 线与芯片）

## 模块概述

- 能力 id：`io`；槽位：`robot.io`
- 能力域：`io`；能力版本：`1.1.0`
- 占用、释放 GPIO 线并读写电平。电平为 `bool`，使用前须 `acquire`，用完后 `release`。
- 一条线由**芯片 `chip`** 与**片内线号 `line`** 共同寻址：`chip` 优先按内核标签（如 `tegra264-gpio`）匹配，标签为空时按内核设备名（`gpiochipN`）匹配；`line` 是该片内的偏移，从 `0` 起。
- 不确定接线时先用 `chips()` 列出芯片、每根线的名字与占用者，再选 `chip` / `line`。示例用 `chip="tegra264-gpio"`、`line=17`。

`UNKNOWN` 不是合法命令值，传入会被拒绝。

## API 总览

| 名字 | 类型 | 说明 |
|------|------|------|
| `acquire` | Command | 占用一条线并设定方向；输出在同一次请求里写入初值。默认超时 1000 ms。 |
| `release` | Command | 释放已占用的线；未占用的线会被拒绝。默认超时 1000 ms。 |
| `set_level` | Command | 写数字输出电平，须先以 `OUTPUT` 占用；默认超时 1000 ms。 |
| `get_level` | Command | 读取已占用线的当前电平（输入输出均可）；默认超时 1000 ms。 |
| `chips` | Command | 列出 gpiochip 字符设备与每条线的名字、占用者；默认超时 1000 ms。 |
| `fault_changed` | Event | 故障集合变化，payload 为 `Faults`。 |
| `lifecycle_changed` | Event | 生命周期变化，payload 为 `CapabilityLifecycleSnapshot`。 |

Command 同步返回响应，`timeout_ms` 可逐次覆盖；Operation 立即返回句柄，进度与结果通过快照获取，见 [命令与长时操作](../../usage/commands-operations.md)。

本页方法用到的枚举：

**`PinDirection` 枚举**

| 取值 | 说明 |
|------|------|
| `INPUT` | 输入 |
| `OUTPUT` | 输出 |

## 方法

参数名与默认值以本节签名块为准。本模块的**所有方法都没有位置参数**，`chip` / `line` / `value` / `timeout_ms` 一律按关键字传入。字段名用小写下划线写法（如 `chip`），生成类型同时接受原样的驼峰别名。

### acquire

占用一条线并设定方向。同一 `chip` + `line` 且方向相同时重复调用**幂等成功**，不会改写已输出的电平；方向不一致会被拒绝（须先 `release`）。`OUTPUT` 方向用 `value` 作为初始电平，`INPUT` 忽略 `value`。

```python
acquire(*, chip: str, line: int, direction: PinDirection, value: bool, timeout_ms: int = 1000) -> LineApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `chip` | `str` | （必填） | 芯片标签；标签为空时用内核设备名 `gpiochipN` |
| `line` | `int` | （必填） | 该芯片内的线号，从 `0` 起 |
| `direction` | `PinDirection` | （必填） | 线的方向 |
| `value` | `bool` | （必填） | 输出初始电平；`INPUT` 方向被忽略 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LineApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `chip` | `str` | 回显请求的芯片 |
| `line` | `int` | 回显请求的线号 |

```python
from fabot.capabilities.io import PinDirection

applied = robot.io.acquire(
    chip="tegra264-gpio",
    line=17,
    direction=PinDirection.OUTPUT,
    value=False,
)
print(applied.outcome.success, applied.chip, applied.line)

robot.io.set_level(chip="tegra264-gpio", line=17, value=True)
print(robot.io.get_level(chip="tegra264-gpio", line=17).value)
robot.io.release(chip="tegra264-gpio", line=17)
```

### release

释放已占用的线。未占用的线调用会被拒绝。

```python
release(*, chip: str, line: int, timeout_ms: int = 1000) -> LineApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `chip` | `str` | （必填） | 芯片标签；标签为空时用内核设备名 `gpiochipN` |
| `line` | `int` | （必填） | 该芯片内的线号，从 `0` 起 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LineApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `chip` | `str` | 回显请求的芯片 |
| `line` | `int` | 回显请求的线号 |

释放失败时该线保持占用，可以重试 `release`，不会泄漏。

### set_level

写数字输出电平，须先以 `OUTPUT` 占用。

```python
set_level(*, chip: str, line: int, value: bool, timeout_ms: int = 1000) -> LineLevelApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `chip` | `str` | （必填） | 芯片标签；标签为空时用内核设备名 `gpiochipN` |
| `line` | `int` | （必填） | 该芯片内的线号，从 `0` 起 |
| `value` | `bool` | （必填） | 要输出的电平 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LineLevelApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `chip` | `str` | 回显请求的芯片 |
| `line` | `int` | 回显请求的线号 |
| `value` | `bool` | 实际电平 |

### get_level

读取已占用线的当前电平（输入输出均可）。返回的 `value` 是实际读到的电平，不一定等于上一次写入。

```python
get_level(*, chip: str, line: int, timeout_ms: int = 1000) -> LineLevelApplied
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `chip` | `str` | （必填） | 芯片标签；标签为空时用内核设备名 `gpiochipN` |
| `line` | `int` | （必填） | 该芯片内的线号，从 `0` 起 |
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `LineLevelApplied`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果 |
| `chip` | `str` | 回显请求的芯片 |
| `line` | `int` | 回显请求的线号 |
| `value` | `bool` | 实际电平 |

### chips

列出 `/dev/gpiochip*` 上可见的芯片。每片给出 `name`（内核设备名）与 `label`（稳定标签，可能为空），以及每根线的 `line`（偏移）、`name`（内核给出的线名，可能为空）、`consumer`（空表示无人占用）。槽位因自检失败停在 `Inactive` 时仍能回答。

```python
chips(*, timeout_ms: int = 1000) -> Chips
```

**参数**

| 名称 | 类型 | 默认 | 说明 |
|------|------|------|------|
| `timeout_ms` | `int` | `1000` | 调用超时（毫秒） |

**返回** `Chips`

| 字段 | 类型 | 说明 |
|------|------|------|
| `outcome` | `Outcome` | 调用结果；扫描失败时 `success` 为 `False` |
| `chips` | `list[Chip]` | 芯片列表 |

`Chip`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `name` | `str` | 内核设备名（`gpiochipN`） |
| `label` | `str` | 稳定标签；可能为空，此时其余方法用 `name` 寻址 |
| `lines` | `list[ChipLine]` | 该芯片的线 |

`ChipLine`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `line` | `int` | 片内偏移，从 `0` 起 |
| `name` | `str` | 内核给出的线名；可能为空 |
| `consumer` | `str` | 当前占用者；空表示无人占用 |

```python
for chip in robot.io.chips().chips:
    print(chip.name, chip.label, len(chip.lines))
    for line in chip.lines:
        print(" ", line.line, line.name, line.consumer)
```

`chips` 不受能力自检结果限制：其他命令都因自检失败被拒绝时，它仍然可用，适合用来排查「这台机器上究竟有哪些线」。

## 通道

本模块没有数据通道。通用机制见 [事件与数据通道](../../usage/events-channels.md)。

## 事件

经 `robot.<slot>.events` 订阅；回调在 SDK I/O 线程执行，须保持轻量、禁止调用阻塞 API。事件均带 `EventHeader`（`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`）。

| 入口 | 事件类型 | payload |
|------|------|------|
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`：`Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`：`CapabilityLifecycleSnapshot` |

## 异常

查询入口 `robot.<slot>.faults()`，返回 `Faults`（`revision` + `records: list[FaultState]`）。单条 `FaultState`：

| 字段 | 类型 | 说明 |
|------|------|------|
| `code` | `int` | 诊断码；`0` 表示无故障 |
| `source` | `str` | 故障来源标识 |
| `state` | `int` | 故障状态位 |
| `severity` | `int` | 严重度，与 `HealthState` 对齐 |
| `timestamp_us` | `int` | 最近一次时间戳（微秒） |

本模块的失败都直接抛 `FabotError`，不会返回 `outcome.success` 为 `False` 的响应：

| 情况 | 错误 |
|------|------|
| `chip` 为空、`line` 超出该片线数 | `OutOfRange` |
| `direction` 为 `UNKNOWN` | `OutOfRange` |
| 未知芯片、标签冲突、方向不一致、线未占用、`set_level` 作用在输入线上 | `NotSupported` |
| 打不开芯片设备、申请线失败、读写失败、释放失败 | 对应 GPIO 故障码（同时锁存为该槽位故障） |

`acquire` 成功后会清掉上一次的申请 / 占用 / 权限类故障。

展示给人看的故障文本用 `Catalogs.format_fault(record)`，见 [文本目录 Catalogs](../../usage/catalogs.md)。

## 状态

本模块没有 `status()`；整机聚合状态见 `robot.status()`。

公共只读查询：

- `health()`：`SlotHealth`（`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`）
- `lifecycle()`：`CapabilityLifecycleSnapshot`（`lifecycle` / `health` / `pbit_completed` / `source_instance_id`）

变化走 `lifecycle_changed` 事件，见 [状态、故障与生命周期](../../usage/status-faults.md)。

## 资源

五个方法都是短 Command，本模块未声明独占资源。不同芯片、不同线互不影响；同一条线须先 `acquire` 再读写，用完 `release`。

能力进程退出（含 `kill -9`）时内核随文件描述符关闭释放该线；正常退出时，仍占用的输出会先拉低再释放。

本模块没有配置域：字符设备没有 sysfs 根目录，也没有 export 超时这类参数。
