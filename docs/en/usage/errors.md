---
title: Error Handling
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Error Handling

Every failed SDK call raises `FabotError` or a subclass. This page covers the hierarchy, error fields and diagnostic codes, how Commands and Operations surface failures, and retry guidance. Localized text is in [Catalogs](catalogs.md).

## Hierarchy and fields

`FabotError` is the base of every SDK error (defined in `fabot.core.error`, importable from `fabot`). Each instance carries:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `int` | 32-bit diagnostic code, usually shown as `0x` hex |
| `category` | `ErrorCategory \| None` | Construction tag used to pick the concrete subclass; **not carried on the wire**, so decoded errors may have `None` |
| `message` | `str` | Local technical text, produced only on this host and never transmitted |
| `retryable` | `bool` | Whether the call may safely be repeated; derived from the concrete type |
| `trace_id` | `str` | Trace id for correlating with robot-side logs |

`retryable` is `True` for `Timeout`, `ResourceConflict`, `TransportError` and `Unavailable`. `message` is local only: errors coming back from the robot carry a diagnostic code and the text is rendered from [Catalogs](catalogs.md), so never branch on the `message` text.

## Categories

`ErrorCategory` is a construction tag; `FabotError.__new__` dispatches on it to a concrete subclass. So you can catch either the precise subclass or the base:

| Category | Subclass | Typical case |
|----------|----------|--------------|
| `InvalidArgument` | `InvalidArgument` | Invalid parameters |
| `NotFound` | `NotFound` | Missing slot or resource (`AdapterUnbound`) |
| `Timeout` | `Timeout` | Call timed out (also a built-in `TimeoutError`) |
| `ResourceConflict` | `ResourceConflict` | Resource busy; `ConfigurationConflict` |
| `Canceled` | `Canceled` | Operation canceled |
| `TransportError` | `TransportError` | Transport failure |
| `ProtocolIncompatible` | `ProtocolIncompatible` | Incompatible protocol version |
| `Unavailable` | `Unavailable` | Peer unavailable |
| `Unauthorized` | `Unauthorized` | Authentication failed |
| `Internal` | `Internal` | Server-side internal error |

```python
from fabot import FabotError

try:
    robot.chassis.servo_twist(vx=0.3, vy=0.0, timeout_ms=500)
except FabotError as err:
    print(hex(err.code), err.category, err.retryable, err.trace_id)
```

### Specialized subclasses

| Exception | Inherits | When |
|-----------|----------|------|
| `ClientThreadError` | `InvalidArgument` | A blocking API called on the SDK I/O thread, see [Events & Data Channels](events-channels.md) |
| `AdapterUnbound` | `NotFound` | Slot has no adapter bound, see [Connection & Robot Entry](connection.md) |
| `AdapterMismatch` | `InvalidArgument` | `as_adapter()` target does not match the bound adapter |
| `ConfigurationConflict` | `ResourceConflict` | Config CAS conflict, see [Configuration](configuration.md) |
| `FrameError` family | `FabotError` plus mixins | Coordinate-frame failures, see [Frames & Transforms](frames.md) |

`FrameError` subclasses also inherit a semantic base: `FrameNotFoundError` / `FrameConnectivityError` are `NotFound`, `FrameMismatchError` / `FrameCycleError` / `InvalidFrameNameError` / `InvalidQuaternionError` are `InvalidArgument`, and `FrameTimeoutError` is `Timeout`. Catching the semantic base therefore covers the analogous frame failures too.

## Diagnostic codes

Diagnostic codes are 32-bit integers segmented by the high byte (`0x01` platform and runtime, `0x07` SDK client, …); the code-to-text mapping lives in the catalog. Judge failures by `code` or `category`, never by `message`; render text with `Catalogs.format_error`, see [Catalogs](catalogs.md).

```python
print(hex(err.code))                    # diagnostic code
print(catalogs.format_error(err))       # localized text
print(err.localized("zh-CN"))           # same logic
```

## Commands versus Operations

- **Command** (synchronous request/response): a failure raises a `FabotError` subclass immediately. Timeouts raise `Timeout`; the default comes from each capability page and can be overridden by `ClientOptions.command_timeout_ms` and the per-call `timeout_ms`.
- **Operation** (long-running): the handle returns immediately. Submission failures (invalid parameters, resource conflicts, `reject`-policy contention) raise at the call site; runtime failures **do not raise** and are read from the terminal snapshot — when `snapshot.state` is `Failed` / `Canceled` / `Timeout`, read `snapshot.error`:

```python
from fabot.core import OperationState

op = robot.chassis.move_station(1)
snapshot = op.get(timeout=30.0)
if snapshot.state == OperationState.Failed:
    err = snapshot.error            # FabotError describing the failure
    print(hex(err.code), err.message, err.trace_id)
```

`op.wait()` is the other style: it blocks to the terminal state and raises on failure (`Failed` raises `FabotError`, `Canceled` raises `Canceled`, `Timeout` raises `Timeout`), returning `result` on success.

The Command / Operation model itself is in [Commands & Operations](commands-operations.md).

## Retry strategy

- Errors with `retryable == True` (`Timeout` / `Unavailable` / `TransportError` / `ResourceConflict`) can be retried with exponential backoff, bounded by total time or attempt count.
- `InvalidArgument`, `ProtocolIncompatible` and friends are not retryable: fix the call, or check SDK and platform version compatibility (see [Version Compatibility](../install/compatibility.md)).
- `ConfigurationConflict` is a special case: `retryable` is `False`, but the correct handling *is* to retry — re-`get()`, merge your change (`merge_touched`) and `apply()` again, see [Configuration](configuration.md).
- Stale-slot errors (for example an instance replaced underneath you) trigger one internal re-resolve in the SDK; the application should not repeat that.

## Common local errors

- `ClientThreadError`: a blocking API called on the SDK I/O thread (event callback), see [Events & Data Channels](events-channels.md).
- `AdapterUnbound` / `AdapterMismatch`: `as_adapter()` / `get_config()` hit an unbound slot, or the requested adapter type differs from the bound one, see [Connection & Robot Entry](connection.md).
- Transport errors: `Unavailable` / `TransportError` / `Timeout`, all `retryable=True`; see [Troubleshooting](../troubleshooting.md) for connection problems.
- Frame errors: `FrameNotFoundError` / `FrameConnectivityError` and friends, see [Frames & Transforms](frames.md).
