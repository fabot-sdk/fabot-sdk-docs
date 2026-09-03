---
title: Platform Services
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Platform Services

Platform services on the robot (services, e.g. `fabot_ocs2`) expose only **7 platform operations** to the SDK; business interfaces are not open to clients. Services with `client_control: none` do not appear in the list.

## The 7 Platform Operations

| Operation | Notes |
|-----------|-------|
| `start()` / `stop()` / `restart()` | Lifecycle control |
| `state()` | `ServiceState` (with `is_running()`) |
| `is_running()` | Whether it is running |
| `get_config()` / `set_config(cfg)` | Read / CAS-modify the service configuration (conflicts raise `ConfigurationConflict`) |

```python
svc = robot.services.fabot_ocs2        # FabotOcs2ServiceHandle
svc.start()
print(svc.state(), svc.is_running())

cfg = svc.get_config()                  # strongly typed config dataclass
svc.set_config(cfg)                     # CAS; conflicts raise ConfigurationConflict
```

## Observing Service State Changes

Subscribe to `robot.events.service_state_changed`; see [Events & Data Channels](events-channels.md).
