---
title: Self-check
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Self-check

A self-check turns "can this slot work right now?" into a diagnostic you can trigger on demand: the SDK sends `fabot.runtime.self_check`, the adapter runs its own check items, and a structured report comes back.

The SDK offers two levels:

| Entry | Returns | Scope |
|------|------|------|
| `robot.<slot>.self_check(...)` | `SelfCheckReport` | One slot |
| `robot.self_check(...)` | `RobotSelfCheck` | Every enabled slot with a placed adapter, in robot-spec order |

Skills and services have no slot proxy and never take part.

## How it differs from `health()`

This is the easiest thing to get wrong:

- `health()` / `lifecycle()` / `faults()` are **read-only queries** over a snapshot the platform already computed; they drive no check.
- `self_check()` **actually runs** the capability's check hook and **writes the result into the fault latch**. It is not merely observational — it can change what later `health()` / `faults()` calls report.

Use `health()` and `faults()` when asking "why is this fault still here"; use `self_check()` when you want to actively verify now.

## Slot self-check

```python
report = robot.io.self_check()
print(report.overall.name, report.type.name, report.duration_ms)

for item in report.items:
    print(item.code, item.verdict.name, item.message, item.duration_ms)
    for value in item.values:
        print("  ", value.key, value.kind.name, value.text, value.integer,
              value.number, value.boolean)
```

```python
self_check(timeout_ms: int = 0, *, timeout: float | None = None) -> SelfCheckReport
```

**Parameters**

| Name | Type | Default | Description |
|------|------|------|-------------|
| `timeout_ms` | `int` | `0` | Budget for the check hook in milliseconds; `0` means the platform default. Negative values and values above `25000` raise `ValueError` |
| `timeout` | `float \| None` | `None` | Same budget in seconds; overrides `timeout_ms` when not `None` |

Where the budget goes: `timeout_ms` / `timeout` is the **hook budget**, not the total RPC time. The RPC waits 5 extra seconds on top of it, so passing `25000` can wait up to the 30-second command cap.

- `0`: the hook uses the platform default and the RPC waits 10 seconds.
- A positive `n`: the hook gets `n` ms and the RPC waits `n + 5000` ms.

`SelfCheckReport`:

| Field | Type | Description |
|------|------|-------------|
| `domain` | `str` | Capability domain |
| `module` | `str` | Module identifier |
| `source` | `str` | Check source, usually the slot id |
| `type` | `SelfCheckType` | BIT class of this run; an initiated call is always `Ibit` |
| `overall` | `SelfCheckVerdict` | Overall verdict |
| `severity` | `int` | Severity, aligned with `HealthState` |
| `items` | `list[SelfCheckItem]` | Every item this hook produced |
| `checked_at_us` | `int` | When the check ran, in microseconds |
| `duration_ms` | `int` | Elapsed time in milliseconds |

`SelfCheckItem`:

| Field | Type | Description |
|------|------|-------------|
| `code` | `int` | Diagnostic code; render it through `Catalogs` |
| `source` | `str` | Source of this item |
| `verdict` | `SelfCheckVerdict` | Per-item verdict |
| `severity` | `int` | Severity |
| `values` | `list[SelfCheckValue]` | Measured values captured while evaluating |
| `message` | `str` | Explanation text |
| `duration_ms` | `int` | Time spent on this item in milliseconds |

`SelfCheckValue`:

| Field | Type | Description |
|------|------|-------------|
| `key` | `str` | Value name |
| `kind` | `FaultValueKind` | Value kind; decides which field below is meaningful |
| `text` | `str` | String value |
| `integer` | `int` | Integer value |
| `number` | `float` | Float value |
| `boolean` | `bool` | Boolean value |

Read by `kind` rather than reading every field:

```python
for value in item.values:
    if value.kind is FaultValueKind.Int:
        print(value.key, value.integer)
    elif value.kind is FaultValueKind.String:
        print(value.key, value.text)
```

## Robot self-check

```python
summary = robot.self_check()
print(summary.overall.name, summary.duration_ms)

for slot in summary.slots:
    if slot.error:
        print(slot.slot_id, "failed:", slot.error)
    else:
        print(slot.slot_id, slot.report.overall.name)
```

```python
self_check(timeout_ms: int = 0, *, timeout: float | None = None) -> RobotSelfCheck
```

Parameters behave exactly as at slot level; every slot runs once under the same budget.

`RobotSelfCheck`:

| Field | Type | Description |
|------|------|-------------|
| `overall` | `SelfCheckVerdict` | Overall verdict |
| `slots` | `list[SlotSelfCheck]` | One entry per participating slot, in robot-spec order |
| `duration_ms` | `int` | Elapsed time for the whole round in milliseconds |

`SlotSelfCheck`:

| Field | Type | Description |
|------|------|-------------|
| `slot_id` | `str` | Slot id |
| `report` | `SelfCheckReport \| None` | That slot's report; `None` when the RPC failed |
| `error` | `str` | RPC failure reason; empty on success |

The participating set differs from `wait_ready()`: `self_check` takes slots that are **enabled and have an adapter** (not necessarily `essential`), while `wait_ready()` only waits for enabled, essential, adapter-bound slots.

### How the overall verdict is computed

| Situation | `overall` |
|------|------|
| Nothing ran (no enabled, adapter-bound slot) | `Skip` |
| Any slot RPC errored, or a slot's `report.overall` is neither `Pass` nor `Skip` | `Fail` |
| Every slot is `Pass` or `Skip` | `Pass` |

One failing slot does **not** stop the rest: `slots` comes back complete and in spec order, so you can see every problem in one pass. Any errored slot forces the overall verdict to `Fail`.

## Enums

`SelfCheckVerdict` (IntEnum):

| Value | Meaning |
|----|------|
| `Unknown` | Unknown (not projected into the result) |
| `Pass` | Passed |
| `Fail` | Failed |
| `Skip` | Skipped (not applicable, or did not run) |

`SelfCheckType` (IntEnum):

| Value | Meaning |
|----|------|
| `Unknown` | Unknown |
| `Pbit` | Power-on self-test |
| `Cbit` | Continuous self-test |
| `Ibit` | Initiated self-test; an SDK `self_check()` call is always this |

`FaultValueKind` (IntEnum): `Unknown` / `String` / `Int` / `Float` / `Bool`.

## How self-check relates to faults

- A failing item is **latched** as a fault on that slot, so later `faults()` / `health()` calls reflect it. `self_check()` itself never clears it.
- While a slot sits in `Inactive` after a failed self-check, most capability commands are rejected; some read-only commands still answer (for example `robot.io.chips()`), which is useful for digging further.
- When an e-stop or the lifecycle state forbids running a self-check, the platform still returns a report with `overall=Fail` and the SDK passes it through without raising. So judge usability from `overall`, not from whether an exception was raised.

For display text for a check item, look it up by `item.code` through `Catalogs`; see [Catalogs](./catalogs.md).

## Self-check under Mock

`Robot.mock()` implements self-check:

- A slot `self_check()` returns an empty report with `overall=Pass`, `type=Ibit`, `items=[]`.
- Under `Robot.mock()` slots have no adapter bound by default, so the robot-level `self_check()` runs nothing and returns `overall=Skip`, `slots=[]`.
- To exercise item content or failure paths, inject a `fabot.runtime.self_check` response through `MockBackend`. Resolve the slot first with `set_resolved`, otherwise resolving the slot handle fails with `NotFound` ("not stubbed"):

```python
from fabot import Robot
from fabot.core import MockBackend
from fabot.core.types import ResolvedSlot
from fabot.core.detail.result import Result
from fabot.core.flatbuffer_codec import encode_flatbuffer
from fabot.core.protocol.SelfCheckResponse import SelfCheckResponseT
from fabot.core.protocol.SelfCheckType import SelfCheckType as WireType
from fabot.core.protocol.SelfCheckVerdict import SelfCheckVerdict as WireVerdict

def fail_report(_request):
    report = SelfCheckResponseT()
    report.type = int(WireType.IBIT)
    report.overall = int(WireVerdict.FAIL)
    return Result.ok(encode_flatbuffer("fabot.protocol.SelfCheckResponse", report))

backend = MockBackend()
backend.set_resolved("io", ResolvedSlot(plane_id="io", instance_id="io"))
backend.set_command_handler("io", "fabot.runtime.self_check", fail_report)

robot = Robot.from_backend(backend)
print(robot.io.self_check().overall.name)     # Fail
```

Other `MockBackend` injection points are in [Mock Testing](../testing/mock.md).

## Related pages

- Health, fault bags and lifecycle: [Status, Faults & Lifecycle](../data/status-faults.md)
- Full signatures for the slot and robot entries: [Robot Entry](../../reference/python/robot.md)
- Localizing check-item text: [Catalogs](./catalogs.md)
- Troubleshooting steps after a failed self-check: [Troubleshooting](../../troubleshooting.md)
