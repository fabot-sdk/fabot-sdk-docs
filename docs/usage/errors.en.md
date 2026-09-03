---
title: Error Handling
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Error Handling

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

## Error Codes

Error codes are globally unique and allocated in ranges:

| Range | Owner |
|-------|-------|
| 6xxx | Client-side local errors (e.g. `ClientThreadError` 6003) |
| 8xxxx | Platform errors |
| 9xxxx | Capability-private errors |

## Retry Policy

Errors with `retryable == true` (e.g. `Timeout`, `Unavailable`) can be retried with exponential backoff; `InvalidArgument`, `ProtocolIncompatible`, etc. are not retryable — fix the call or upgrade the version instead.

## Localized Error Text (Catalogs)

`Catalogs` (`fabot.catalogs`) is a catalog of log/error/fault texts embedded in the SDK, intended for HMI display:

```python
from fabot import Catalogs

catalogs = Catalogs.load()
catalogs.set_language("zh")
print(catalogs.format_error(err))                    # localized error text
print(catalogs.format_fault(record, capability_id))  # localized fault text
```

## Common Local Errors

- `ClientThreadError` (6003): a blocking API was called from the SDK I/O thread (an event callback); see [Events & Data Channels](events-channels.md).
- `AdapterUnbound` (6002) / `AdapterMismatch`: the slot is unbound, or the bound adapter type does not match expectations; see [Connection & Robot Entry](connection.md).
