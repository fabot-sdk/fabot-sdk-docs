---
title: Error Handling
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Error Handling

All SDK call failures are raised as `FabotError` and its subclasses. This page covers the exception hierarchy, error fields and codes, how errors surface from Commands / Operations, retry policy, and localized error text for HMIs.

## Exception Hierarchy & Error Fields

`FabotError` is the base class of all SDK errors (defined in `fabot.core.error`, importable from the `fabot` top level). Every error instance carries five fields:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `int` | Globally unique error code (ranges below) |
| `category` | `ErrorCategory` | Error category (ten categories, see the table below) |
| `message` | `str` | English technical description, for logs and troubleshooting |
| `retryable` | `bool` | Whether the call can be safely retried |
| `trace_id` | `str` | Trace ID, for correlating with robot-side logs |

Errors fall into the ten `ErrorCategory` categories, each with a corresponding `FabotError` subclass. Errors returned by the robot are automatically mapped to the matching subclass instance by `category`, so you can either catch a specific subclass or catch the base class uniformly:

```python
from fabot import FabotError
from fabot.core.error import Timeout, NotFound

try:
    robot.chassis.stop(timeout_ms=500)
except Timeout as e:
    print(e.code, e.retryable, e.trace_id)
except FabotError as e:
    print(e.category, e.message)
```

Beyond the ten category subclasses, there are four dedicated subclasses (`fabot.errors` / `fabot.core.error`):

| Exception | Subclass of | code | Raised when |
|-----------|-------------|------|-------------|
| `ConfigurationConflict` | `ResourceConflict` | 81001 | Configuration CAS conflict; see [Configuration](configuration.md) |
| `AdapterUnbound` | `NotFound` | 6002 | Slot has no bound adapter; see [Connection & Robot Entry](connection.md) |
| `AdapterMismatch` | `InvalidArgument` | 6003 | `as_adapter()` target type does not match the bound adapter |
| `ClientThreadError` | `InvalidArgument` | 6003 | A blocking API was called on the SDK I/O thread (an event callback); see [Events & Data Channels](events-channels.md) |

## Error Categories

All call failures fall into the ten `ErrorCategory` categories. The SDK raises the corresponding `FabotError` subclass, so you can catch by category:

| Category | Exception | Typical scenario |
|----------|------------------|------------------|
| `InvalidArgument` | `InvalidArgument` | Illegal argument |
| `NotFound` | `NotFound` | Slot/resource does not exist (`AdapterUnbound`, 6002) |
| `Timeout` | `Timeout` | Call timed out |
| `ResourceConflict` | `ResourceConflict` | Resource occupied; `ConfigurationConflict` (81001) |
| `Canceled` | `Canceled` | Task was canceled |
| `TransportError` | `TransportError` | Transport-layer failure |
| `ProtocolIncompatible` | `ProtocolIncompatible` | Protocol version incompatible |
| `Unavailable` | `Unavailable` | Peer unavailable |
| `Unauthorized` | `Unauthorized` | Authentication failed |
| `Internal` | `Internal` | Server internal error |

## Error Codes

Error codes are globally unique and allocated in ranges:

| Range | Owner |
|-------|-------|
| 6xxx | SDK client-side local errors (`AdapterUnbound` 6002, `AdapterMismatch` / `ClientThreadError` 6003, transport-layer 6112–6114, etc.) |
| 8xxxx | Platform errors (e.g. `ConfigurationConflict` 81001) |
| 9xxxx | Capability-private errors |

In program logic, match on `code` / `category` — never on the `message` text. For human-readable text, use Catalogs (see below).

## How Errors Surface from Commands & Operations

- **Command** (synchronous request-response): failures raise a `FabotError` subclass immediately. A timeout raises `Timeout`; default timeouts are documented per capability and can be overridden by `ClientOptions.command_timeout_ms` and the per-call `timeout_ms`.
- **Operation** (long-running task): the returned handle does not block. If the submission itself is rejected (illegal argument, resource conflict, etc.), the error is raised at the call site. Runtime failures **do not raise** — read them from the terminal snapshot: when `snapshot.state` is `Failed` / `Canceled` / `Timeout`, get the `FabotError` from `snapshot.error`:

```python
from fabot.capabilities.chassis import NavigationMode
from fabot.core.types import OperationState

op = robot.chassis.navigate_to_station(station_id=1, mode=NavigationMode.AUTONOMOUS)
snapshot = op.get(timeout_ms=30000)
if snapshot.state == OperationState.Failed:
    err = snapshot.error            # FabotError: the failure reason
    print(err.code, err.category, err.message)
```

For the Command / Operation model itself, see [Commands & Operations](commands-operations.md).

## Retry Policy

- Errors with `retryable == True` (e.g. transport-layer `Timeout` / `Unavailable` / `TransportError`) can be retried with exponential backoff, bounded by a total time or attempt limit.
- `InvalidArgument`, `ProtocolIncompatible`, etc. are not retryable — fix the call arguments, or check the SDK/robot version pairing (see [Version Compatibility](../install/compatibility.md)).
- `ConfigurationConflict` is a special case: `retryable` is `False`, but the semantic handling is exactly a retry — `get()` again, merge your changes (`merge_touched`), then `apply()` again; see [Configuration](configuration.md).

## Localized Error Text (Catalogs)

`Catalogs` (`fabot.catalogs`, importable from the `fabot` top level) is a catalog of log/error/fault texts embedded in the SDK, intended for HMI display. It is a pure table lookup at runtime and never contacts the robot:

```python
from fabot import Catalogs

catalogs = Catalogs.load()
catalogs.set_language("zh")                       # unknown locales fall back to English
print(catalogs.format_error(err))                 # localized error text by err.code
print(catalogs.format_error(81001))               # an int code works too
print(catalogs.format_fault(record, capability_id="chassis"))  # localized fault text
```

- `format_error` accepts a `FabotError` or an `int` code; on a miss it falls back to `error.message`, then to the code string.
- `format_fault` looks up a `{capability_id}/{catalog_id}` template. Robot-level fault records (`RobotFaultRecord` from `robot.faults()`) carry `capability_id`; capability-level records (`CapabilityFaultRecord` / `FaultState`) do not — pass `capability_id=` explicitly, otherwise a `ValueError` is raised.
- `format_log` is also available for localized log record text.

## Common Local Errors

- `AdapterUnbound` (6002) / `AdapterMismatch` (6003): the slot is unbound, or the `as_adapter()` target type does not match the bound adapter; see [Connection & Robot Entry](connection.md).
- `ClientThreadError` (6003): a blocking API was called from the SDK I/O thread (an event callback); see [Events & Data Channels](events-channels.md).
- Transport-layer errors: `Unavailable` (6112, session closed), `TransportError` (6113), `Timeout` (6114, query deadline exceeded) — all `retryable=True`; for connection problems see [Troubleshooting](../troubleshooting.md).
- `ConfigurationConflict` (81001): configuration CAS conflict; handle with the retry policy above, see [Configuration](configuration.md).
