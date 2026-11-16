---
title: Diagnostic Codes
status: draft
owner: fabot-core
updated: 2026-11-16
---

# Diagnostic Codes

Every error and fault the SDK reports carries one 32-bit diagnostic code. This page explains the encoding, the domain/module layout, and how to turn a code into readable text and an actionable response. Per-code text comes from the catalog embedded in the SDK and is queried with `Catalogs`, see [Catalogs](../../usage/catalogs.md).

## Encoding

```text
code = (domain << 24) | (module << 16) | reason
```

| Field | Width | Meaning |
|-------|-------|---------|
| domain | top 8 bits | Robot / chassis / body |
| module | middle 8 bits | Module inside the domain |
| reason | low 16 bits | The specific reason inside the module |

- `0x00000000` means both "no fault" and "call succeeded".
- Display it as `0x` plus eight uppercase hex digits, e.g. `0x010E0001`.
- The same reason can surface as a transient error code (`FabotError.code`) or as a persistent fault (`FaultState.code`); the encoding is identical.
- Reserved: domain `0x00` and `0xFF` are not assignable; module `0x00` is domain-level common and `0xFF` is unknown; reason `0x0000` is "no fault", `0xF000–0xFFEF` is experimental, `0xFFF0–0xFFFF` reserved.

## Domains

| domain | key | Name |
|--------|-----|------|
| `0x01` | `robot` | Robot |
| `0x02` | `chassis` | Chassis |
| `0x03` | `body` | Body |

## Modules

### Robot (domain `0x01`)

| module | key | Name |
|--------|-----|------|
| `0x00` | `common` | Domain-level common |
| `0x07` | `pdu` | Power distribution |
| `0x0A` | `compute` | Compute platform |
| `0x0B` | `teleop` | Teleop devices |
| `0x0C` | `middleware` | Middleware |
| `0x0D` | `bus` | Communication bus |
| `0x0E` | `sdk` | SDK |

### Chassis (domain `0x02`)

| module | key | Name |
|--------|-----|------|
| `0x00` | `common` | Domain-level common |
| `0x01` | `controller` | Chassis controller |
| `0x02` | `wheel_motor` | Wheel motor |
| `0x03` | `steer_motor` | Steer motor |
| `0x05` | `lidar` | LiDAR |
| `0x06` | `imu` | IMU |
| `0x07` | `board` | Power board |
| `0x08` | `battery` | Battery |
| `0x09` | `bms` | BMS |
| `0x0A` | `safety` | Safety |
| `0x0B` | `remote` | Remote control |
| `0x0C` | `charger` | Charger |

### Body (domain `0x03`)

| module | key | Name |
|--------|-----|------|
| `0x00` | `common` | Domain-level common |
| `0x02` | `joint_motor` | Joint motor |
| `0x03` | `arm` | Arm |
| `0x04` | `gripper` | Gripper |
| `0x05` | `hand` | Dexterous hand |
| `0x06` | `lift` | Lift |
| `0x09` | `stereo_camera` | Stereo camera |
| `0x0A` | `rgbd_camera` | RGBD camera |
| `0x0B` | `camera` | Camera |
| `0x0D` | `audio` | Audio channel |
| `0x0E` | `light` | Light |
| `0x0F` | `screen` | Screen |

### SDK errors (`0x010E`)

`0x010E` covers the errors you hit most often at the SDK/capability runtime. Retryability is decided by the exception subclass, not the code:

| code | Meaning |
|------|---------|
| `0x010E0001` | Capability not ready for this call |
| `0x010E0002` | Capability busy with a conflicting call |
| `0x010E0003` | Argument out of the allowed range |
| `0x010E0004` | Required hardware offline |
| `0x010E0005` | Capability does not support this operation |
| `0x010E0006` | Preconditions for the call are not met |
| `0x010E0007` | No capability instance matches the request |
| `0x010E0008` | The matching instance is unhealthy |
| `0x010E0009` | The matching instance has an incompatible version |
| `0x010E000A` | Several healthy instances match the request |
| `0x010E000B` | Command target does not match this instance |
| `0x010E000C` | Capability is not in an active lifecycle state |

Frame-related codes live in `0x010E95xx` (`FrameNotFound` / `FrameDisconnected` / `FrameExtrapolation` and friends), see [Frames & Transforms](../../usage/frames.md).

## Looking up text

```python
from fabot import Catalogs, FabotError

catalogs = Catalogs.load("en")

try:
    robot.chassis.servo_twist(vx=0.3, vy=0.0)
except FabotError as err:
    print(hex(err.code), catalogs.format_error(err))

for record in robot.faults().chassis.records:
    print(hex(record.code), record.severity, catalogs.format_fault(record))
```

- Lookup order: error table → fault table → `error.message` → raw `0xXXXXXXXX`. An older SDK therefore never renders a blank string.
- `format_error` / `format_fault` accept either a bare integer code or an object with `code`.
- `Catalogs.load()` never touches the robot; it reads the snapshot embedded in the SDK. New codes get text only after you upgrade the SDK.

## Response strategy

Always decide in this order: **code → error class → idempotency → retry**.

| Class | Typical range | Response |
|-------|---------------|----------|
| `InvalidArgument` | `0x010E0003` / `0x010E0005` | Do not retry; fix the arguments or use another call |
| `Unavailable` / `TransportError` | `0x010E0004` / `0x030Fxxxx` | Back off and retry; confirm the robot is online first |
| `ResourceConflict` | `0x010E0002` | Check the resource policy: `queue` waits, `reject` should be dropped |
| `Timeout` | Any capability | Retryable, but read `get_*` first to see whether the previous call landed |
| `ProtocolIncompatible` | At connect time | Do not retry; reconcile both versions |
| Faults (`FaultState`) | Any domain/module | Faults are persistent state; use `severity` to degrade or stop, never retry them as exceptions |

The full retry and idempotency rules are in [Concurrency, Threading and Safety](../../usage/concurrency-and-safety.md).

## Troubleshooting map

| Symptom | Codes to read first |
|---------|--------------------|
| Cannot connect | `0x030Fxxxx` (connection), `0x010Cxxxx` (protocol envelope) |
| Chassis will not move | `0x0201xxxx` (controller), `0x0202xxxx` (wheel motors), `0x0203xxxx` (steering) |
| One joint unresponsive | `0x0202xxxx` / `0x0203xxxx` (joint motors), `0x0303xxxx` (arm) |
| No camera frames | `0x0300xxxx` (camera), `0x0309xxxx` / `0x030Axxxx` / `0x030Bxxxx` |
| No audio | `0x030Dxxxx` (audio channel) |
| Lift will not move | `0x0306xxxx` (lift; per-code list in [Lift](lift.md#common-fault-codes)), `0x0310xxxx` (Leadshine drive) |
| Battery / charging issues | `0x0107xxxx` (battery), `0x0208xxxx` (raw battery codes), `0x020Cxxxx` (charger) |
| No joystick input | `0x010Bxxxx` (teleop device), `0x010Dxxxx` (CAN bus) |
| Thermal warnings | `0x010Axxxx` (thermal) |

:::note The reason table evolves with the platform
The domain/module allocation above is stable; individual reasons are added over time. For codes not listed here, trust what `Catalogs` returns. If it returns no text, your SDK is older than the platform — see [Version Compatibility](../../install/compatibility.md).
:::
