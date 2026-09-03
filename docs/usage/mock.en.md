---
title: Mock Testing
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Mock Testing

The SDK ships a built-in Mock backend for development, joint debugging, and unit testing without a real robot.

## Quick Start

```python
from fabot import Robot

robot = Robot.mock()          # MockRobot, attributes named the same as Robot

# Inject command behavior: on_<command> hooks
robot.chassis.on_set_velocity = lambda vx, vy, vtheta: ...
robot.chassis.on_move_relative = lambda dx, dy, dtheta: ...

# Application code calls as usual
robot.chassis.set_velocity(vx=0.2, vy=0.0, vtheta=0.0)
```

## Behavioral Conventions

- Without injected hooks, Mock has harmless defaults: commands return a success shell, Operations immediately reach `Succeeded`, and Channels have no default data.
- Mock proxies (e.g. `ChassisMockProxy`) inherit from the corresponding product proxies, so application code needs no distinction.
- For lower-level control use `MockBackend` (`set_command_handler` / `set_operation_handler` / `push_event` / `push_frame`, etc.) together with `Robot.from_backend()`.

!!! note
    Mock only simulates SDK-side behavior; it does not validate server-side constraints (such as resource conflicts or real error codes). Integration tests involving real server-side behavior still require a real system or a platform-side test environment.
