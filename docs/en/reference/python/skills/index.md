---
title: Skills Overview
status: draft
owner: fabot-core
updated: 2026-11-17
---

# Skills Overview

## Module Overview

- Entry: `robot.skills`
- A skill is an independent unit on the robot that combines several capability slots into a higher-level semantic feature. The SDK generates two skills today: multi-camera sync `camera_sync` and voice semantics `voice_aiui`.
- Skill proxies mirror capability proxies (`slot_id` / `handle` / `events` / `status()` / `health()` / `lifecycle()` / `faults()` / `self_check()` / `ping()` plus config access) but **do not appear in `robot.slots`** and are not resolved through slot lookup.

| Skill | Entry | `SKILL_ID` | Config type | Config domains | Chapter |
|-------|-------|-----------|-------------|----------------|---------|
| Multi-camera sync | `robot.skills.camera_sync` | `fabot_camera_sync` | `CameraSyncConfig` | `alignment` / `frame_region` | [camera_sync.md](./camera_sync.md) |
| Voice semantics | `robot.skills.voice_aiui` | `fabot_voice_aiui` | `VoiceAiuiConfig` | `aiui` | [voice_aiui.md](./voice_aiui.md) |

Whether a skill is deployed and enabled comes from the robot configuration: read `is_available` before calling anything else. It is true when the skill slot is enabled with an adapter bound; if no configuration is readable it falls back to checking whether the handle is valid. When the skill is not deployed, resolving the handle or issuing commands fails.

## API Overview

Common surface of a skill proxy (skill chapters document only what is skill-specific):

| Member | Kind | Description |
|--------|------|-------------|
| `SKILL_ID` | Attribute | Skill id class attribute |
| `robot` | Attribute | Owning `Robot` |
| `is_available` | Attribute | Whether the skill is deployed and enabled (read-only) |
| `slot_id` | Attribute | Slot id the skill uses in configuration; defaults to `SKILL_ID` |
| `handle` | Attribute | Skill handle `SlotHandle` (resolved lazily) |
| `events` | Attribute | Event entry (`fault_changed` / `lifecycle_changed`, plus wildcard `subscribe()`) |
| `status` | Command | Skill status bag; raises `RuntimeError` when nothing has been reported |
| `health` | Command | Health snapshot `SlotHealth` |
| `lifecycle` | Command | Lifecycle snapshot `CapabilityLifecycleSnapshot` |
| `faults` | Command | Current fault bag `Faults` |
| `self_check` | Command | Run the skill self-check on demand, returns `SelfCheckReport`; writes the fault latch |
| `ping` | Command | Round-trip probe `PingReport` |
| `has_adapter` | Attribute | Whether an adapter is bound |
| `as_adapter` | Command | Typed view onto a concrete adapter |
| `get_config` / `set_config` / `edit_config` | Command / context manager | Skill config-domain access |

## Methods

Signatures below are authoritative for names and defaults. Parameters before `*` accept positional or keyword form; those after `*` are keyword-only.

### status / health / lifecycle / faults

```python
robot.skills.<name>.status() -> Status
robot.skills.<name>.health() -> SlotHealth
robot.skills.<name>.lifecycle() -> CapabilityLifecycleSnapshot
robot.skills.<name>.faults() -> Faults
```

All four are read-only queries taking no arguments. `status()` reads the status bag directly and raises `RuntimeError` when nothing has been reported; the robot-wide `robot.status()` has **no** skill fields. Status fields per skill are in the respective chapter.

### self_check

```python
robot.skills.<name>.self_check(timeout_ms: int = 0, *, timeout: float | None = None) -> SelfCheckReport
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `timeout_ms` | `int` | `0` | Call timeout in milliseconds; `0` uses the client default |
| `timeout` | `float \| None` | `None` | Seconds spelling of the same bound |

Writes the fault latch, see [Self-check](../../../usage/diagnostics/self-check.md).

### ping

```python
robot.skills.<name>.ping(payload: bytes = b"", count: int = 1, timeout_ms: int = 1000, *, timeout: float | None = None) -> PingReport
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `payload` | `bytes` | `b""` | Payload bytes |
| `count` | `int` | `1` | Number of samples |
| `timeout_ms` | `int` | `1000` | Per-probe timeout in milliseconds |

### get_config / set_config / edit_config

```python
robot.skills.<name>.get_config() -> CameraSyncConfig | VoiceAiuiConfig
robot.skills.<name>.set_config(config, *, only_domains=None) -> CameraSyncConfig | VoiceAiuiConfig
robot.skills.<name>.edit_config()  # context manager
```

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `config` | config dataclass | (required) | Target config |
| `only_domains` | `set[str] \| None` | `None` | Commit only these domains; `None` means all |

`set_config()` commits with CAS, raises `ConfigurationConflict` on contention and returns the freshly read config on success; `edit_config()` commits only changed domains on exit. The rules match capability config, see [Configuration](../../../usage/configuration/configuration.md).

## Channels

`robot.skills` itself has no channels. Per-skill channels are in the "Channels" section of [camera_sync.md](./camera_sync.md) and [voice_aiui.md](./voice_aiui.md).

## Events

Subscribe through `robot.skills.<name>.events`. Callbacks run on the SDK I/O thread: keep them short and never call blocking APIs. Every event carries an `EventHeader` (`name` / `slot_id` / `capability_id` / `sequence` / `timestamp_us` / `trace_id` / `node_id`).

Both skills publish platform events only:

| Entry | Event type | Payload |
|-------|-----------|---------|
| `robot.skills.<name>.events.fault_changed` | `FaultChangedEvent` | `faults`: `Faults` |
| `robot.skills.<name>.events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`: `CapabilityLifecycleSnapshot` |
| `robot.skills.<name>.events.subscribe(cb, on_error=...)` | Wildcard subscription | `Event` |

```python
def on_fault(event):
    print(event.header.timestamp_us, event.faults.revision, len(event.faults.records))

token = robot.skills.camera_sync.events.fault_changed.subscribe(on_fault)
# ...
token.close()
```

## Exceptions

`faults()` returns `Faults` (`revision` plus `records: list[FaultState]`). Each `FaultState`:

| Field | Type | Description |
|-------|------|-------------|
| `code` | `int` | Diagnostic code; `0` means no fault |
| `source` | `str` | Fault source id |
| `state` | `int` | Fault state bits |
| `severity` | `int` | Severity, aligned with `HealthState` |
| `timestamp_us` | `int` | Latest timestamp in microseconds |

For human-readable text use `Catalogs.format_fault(record)`, see [Catalogs](../catalogs.md). Diagnostic codes are encoded by domain / module, see [Diagnostic Code Reference](../error-codes.md).

Failures look the same as with capabilities: when `is_available` is false, resolving the handle or issuing commands fails; a timed-out command raises `Timeout`, a resource clash raises `ResourceConflict` and a config clash raises `ConfigurationConflict`, see [Error Handling](../../../usage/diagnostics/errors.md).

## Status

Status-bag fields are defined per skill; see the respective chapter. Common read-only queries:

- `health()`: `SlotHealth` (`is_usable` / `lifecycle` / `health` / `standing_faults` / `pbit_completed` / `source_instance_id`)
- `lifecycle()`: `CapabilityLifecycleSnapshot` (`lifecycle` / `health` / `pbit_completed` / `source_instance_id`)

Changes arrive through `lifecycle_changed`, see [Status, Faults & Lifecycle](../../../usage/data/status-faults.md).

## Resources

Whether a skill occupies resources depends on its Operations:

| Skill | Resource | Policy | Occupied by |
|-------|----------|--------|-------------|
| `camera_sync` | — | — | No Operations, occupies nothing |
| `voice_aiui` | `speaker` | `reject` | `speak` |

## Related

- Skill concepts and availability checks: [Skills & Extensions](../../../usage/configuration/skills.md)
- Config-domain access and conflict retries: [Configuration](../../../usage/configuration/configuration.md)
- Camera hardware and streams: [Camera](../camera.md)
- Voice hardware and streams: [Voice](../voice.md)
