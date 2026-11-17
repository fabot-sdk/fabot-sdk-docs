---
title: IO (GPIO Lines and Chips)
status: draft
owner: fabot-core
updated: 2026-11-17
---

# IO (GPIO Lines and Chips)

## Module Overview

- Capability id: `io`; slots: `robot.io`
- Domain: `io`; capability version: `1.1.0`
- Acquire and release GPIO lines and read or write their level. Levels are `bool`; call `acquire` before use and `release` afterwards.
- A line is addressed by a **chip** plus a **line** offset on that chip. `chip` matches the kernel label first (for example `tegra264-gpio`) and falls back to the kernel device name (`gpiochipN`) when the label is empty. `line` is the offset inside that chip, starting at `0`.
- When the wiring is unknown, call `chips()` first to list the chips and each line's name and consumer, then pick `chip` / `line`. The examples use `chip="tegra264-gpio"` and `line=17`.

`UNKNOWN` is not a legal command value and is rejected.

## API Overview

| Name | Kind | Description |
|------|------|-------------|
| `acquire` | Command | Acquire one line with a direction; an output writes its initial level in the same request. Default timeout 1000 ms. |
| `release` | Command | Release an acquired line; calling it on a free line is rejected. Default timeout 1000 ms. |
| `set_level` | Command | Write a digital output level; acquire the line as `OUTPUT` first. Default timeout 1000 ms. |
| `get_level` | Command | Read the level of an acquired line, in either direction. Default timeout 1000 ms. |
| `chips` | Command | List the gpiochip character devices with each line's name and consumer. Default timeout 1000 ms. |
| `fault_changed` | Event | Fault set changed; payload is `Faults`. |
| `lifecycle_changed` | Event | Lifecycle changed; payload is `CapabilityLifecycleSnapshot`. |

Commands return their response synchronously, and `timeout_ms` can be overridden per call; Operations return a handle immediately, with progress and results read from snapshots. See [Commands & Operations](../../usage/commands-operations.md).

Enums used on this page:

**`PinDirection` enum**

| Value | Description |
|-------|-------------|
| `INPUT` | Input |
| `OUTPUT` | Output |

## Methods

Signatures below are authoritative for names and defaults. **None of this module's methods take positional parameters** — `chip`, `line`, `value` and `timeout_ms` are all keyword arguments. Fields use snake_case (`chip`); the generated types also accept the camelCase alias.

### acquire

Acquire one line with a direction. Repeating the call with the same `chip` + `line` and the same direction is idempotent and does not rewrite the level already driven; a different direction is rejected (call `release` first). An `OUTPUT` line uses `value` as its initial level; `INPUT` ignores `value`.

```python
acquire(*, chip: str, line: int, direction: PinDirection, value: bool, timeout_ms: int = 1000) -> LineApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|------|
| `chip` | `str` | (required) | Chip label; the kernel device name `gpiochipN` when the label is empty |
| `line` | `int` | (required) | Line offset inside that chip, starting at `0` |
| `direction` | `PinDirection` | (required) | Line direction |
| `value` | `bool` | (required) | Initial output level; ignored for `INPUT` |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LineApplied`

| Field | Type | Description |
|------|------|-------------|
| `outcome` | `Outcome` | Call result |
| `chip` | `str` | Echo of the requested chip |
| `line` | `int` | Echo of the requested line |

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

Release an acquired line; calling it on a free line is rejected.

```python
release(*, chip: str, line: int, timeout_ms: int = 1000) -> LineApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|-------------|
| `chip` | `str` | (required) | Chip label; the kernel device name `gpiochipN` when the label is empty |
| `line` | `int` | (required) | Line offset inside that chip, starting at `0` |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LineApplied`

| Field | Type | Description |
|------|------|-------------|
| `outcome` | `Outcome` | Call result |
| `chip` | `str` | Echo of the requested chip |
| `line` | `int` | Echo of the requested line |

If the release fails the line stays acquired, so the caller can retry it instead of leaking the line.

### set_level

Write a digital output level; acquire the line as `OUTPUT` first.

```python
set_level(*, chip: str, line: int, value: bool, timeout_ms: int = 1000) -> LineLevelApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|-------------|
| `chip` | `str` | (required) | Chip label; the kernel device name `gpiochipN` when the label is empty |
| `line` | `int` | (required) | Line offset inside that chip, starting at `0` |
| `value` | `bool` | (required) | Level to drive |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LineLevelApplied`

| Field | Type | Description |
|------|------|-------------|
| `outcome` | `Outcome` | Call result |
| `chip` | `str` | Echo of the requested chip |
| `line` | `int` | Echo of the requested line |
| `value` | `bool` | Actual level |

### get_level

Read the level of an acquired line, in either direction. The returned `value` is what the line actually reads, which need not match the last write.

```python
get_level(*, chip: str, line: int, timeout_ms: int = 1000) -> LineLevelApplied
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|-------------|
| `chip` | `str` | (required) | Chip label; the kernel device name `gpiochipN` when the label is empty |
| `line` | `int` | (required) | Line offset inside that chip, starting at `0` |
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `LineLevelApplied`

| Field | Type | Description |
|------|------|-------------|
| `outcome` | `Outcome` | Call result |
| `chip` | `str` | Echo of the requested chip |
| `line` | `int` | Echo of the requested line |
| `value` | `bool` | Actual level |

### chips

List the chips visible under `/dev/gpiochip*`. Each chip reports `name` (kernel device name) and `label` (stable label, may be empty), plus every line's `line` (offset), `name` (kernel line name, may be empty) and `consumer` (empty means nobody holds it). It still answers while the slot sits in `Inactive` after a failed self-check.

```python
chips(*, timeout_ms: int = 1000) -> Chips
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|-------------|
| `timeout_ms` | `int` | `1000` | Timeout in milliseconds |

**Returns** `Chips`

| Field | Type | Description |
|------|------|-------------|
| `outcome` | `Outcome` | Call result; `success` is `False` when the scan fails |
| `chips` | `list[Chip]` | Chips |

`Chip`:

| Field | Type | Description |
|------|------|-------------|
| `name` | `str` | Kernel device name (`gpiochipN`) |
| `label` | `str` | Stable label; may be empty, in which case the other methods address the chip by `name` |
| `lines` | `list[ChipLine]` | Lines on this chip |

`ChipLine`:

| Field | Type | Description |
|------|------|-------------|
| `line` | `int` | Offset inside the chip, starting at `0` |
| `name` | `str` | Kernel line name; may be empty |
| `consumer` | `str` | Current consumer; empty means nobody holds it |

```python
for chip in robot.io.chips().chips:
    print(chip.name, chip.label, len(chip.lines))
    for line in chip.lines:
        print(" ", line.line, line.name, line.consumer)
```

`chips` is not gated by the self-check result: it still works while every other command is rejected after a failed self-check, which makes it the way to find out which lines a machine actually has.

## Channels

This module has no data channels. See [Events & Data Channels](../../usage/events-channels.md).

## Events

Subscribe through `robot.<slot>.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`).

| Entry | Event type | payload |
|------|------|------|
| `robot.<slot>.events.fault_changed` | `FaultChangedEvent` | `FaultChangedEvent.faults`: `Faults` |
| `robot.<slot>.events.lifecycle_changed` | `LifecycleChangedEvent` | `LifecycleChangedEvent.lifecycle`: `CapabilityLifecycleSnapshot` |

## Faults

Query with `robot.<slot>.faults()`, which returns `Faults` (`revision` plus `records: list[FaultState]`). Each `FaultState`:

| Field | Type | Description |
|------|------|-------------|
| `code` | `int` | Diagnostic code; `0` means no fault |
| `source` | `str` | Fault source id |
| `state` | `int` | Fault state bits |
| `severity` | `int` | Severity, aligned with `HealthState` |
| `timestamp_us` | `int` | Latest timestamp in microseconds |

Failures in this module raise `FabotError` directly; they never come back as a response with `outcome.success == False`:

| Situation | Error |
|------|------|
| Empty `chip`, or `line` outside the chip's line count | `OutOfRange` |
| `direction` is `UNKNOWN` | `OutOfRange` |
| Unknown chip, ambiguous label, direction mismatch, line not acquired, `set_level` on an input line | `NotSupported` |
| Chip device not openable, line request / read / write / release failure | The matching GPIO fault code (also latched as a slot fault) |

A successful `acquire` clears the request / busy / permission faults left by an earlier failure.

For human-readable fault text use `Catalogs.format_fault(record)`; see [Catalogs](../../usage/catalogs.md).

## Status

This module has no `status()`; see `robot.status()` for the aggregated view.

Shared read-only queries:

- `health()`: `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`)
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`)

Changes arrive through `lifecycle_changed`; see [Status, Faults & Lifecycle](../../usage/status-faults.md).

## Resources

All five calls are short Commands and the module declares no exclusive resource. Different chips and different lines are independent; one line must be acquired before reading or writing and released afterwards.

When the capability process exits (including `kill -9`), the kernel releases the line as the file descriptor closes; on a normal exit, outputs still held are driven low before release.

The module has no config domain: character devices have no sysfs root and no export timeout to tune.
