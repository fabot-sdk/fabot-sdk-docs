---
title: Mock
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Mock

Use `Robot.mock()` to develop, debug, and unit-test without a real robot. For the mechanism and its boundaries, see [Mock Testing](../../usage/mock.md).

## Quick Start

`Robot.mock()` returns a `MockRobot` (a subclass of `Robot`) whose slot attributes have the same names as on a real `Robot`. It is ready immediately — no `connect` / `wait_ready` needed:

```python
from fabot import Robot

robot = Robot.mock()

# Inject command behavior: on_<command> hooks
robot.screen.on_show_text = lambda text: print("mock show_text:", text)

robot.screen.show_text(text="hello")   # hits the hook, prints mock show_text: hello
robot.close()
```

## Command Hooks

Every Command / Operation has a matching `on_<method>` hook. The hook receives the request fields as keyword arguments; returning a response object makes it the result of that call, while returning `None` (or nothing) falls back to the default response:

```python
from fabot.types.Outcome import OutcomeT

def blocked(vx, vy, vtheta):
    outcome = OutcomeT()
    outcome.success = False
    outcome.statusMessage = "blocked by obstacle"
    return outcome

robot.chassis.on_set_velocity = blocked
result = robot.chassis.set_velocity(vx=0.2, vy=0.0, vtheta=0.0)
print(result.success, result.statusMessage)   # False blocked by obstacle

robot.chassis.on_set_velocity = None          # restore the default behavior
```

If the hook raises, the call raises `FabotError` (`category` is `Internal`, `detail` carries the exception message) — useful for exercising the application's error-handling paths:

```python
def boom(vx, vy, vtheta):
    raise RuntimeError("boom")

robot.chassis.on_set_velocity = boom
# robot.chassis.set_velocity(...) will raise FabotError: Internal, boom
```

For the error model see [Error Handling](../../usage/errors.md); for Command signatures see each capability's API reference (e.g. [Chassis](../../reference/python/chassis.md), [Screen](../../reference/python/screen.md)).

## Operation Default Behavior

Without an injected hook, an Operation completes immediately with the terminal state `Succeeded`:

```python
op = robot.chassis.move_relative(dx=1.0, dy=0.0, dtheta=0.0)
snap = op.get()
print(snap.state, snap.terminal)   # OperationState.Succeeded True
```

Injecting hooks such as `on_move_relative` lets you observe the request arguments or customize the returned `result`. For the Operation model see [Commands and Operations](../../usage/commands-operations.md).

## Estop and Robot State

The mock keeps a real in-memory estop state, so you can rehearse estop flows:

```python
robot.estop.engage(reason="self check")
print(robot.estop.state().asserted)   # True
robot.estop.release()
```

Note the boundaries of the mock:

- `engage` / `release` only change the mock's internal state; they do not push `estop_changed` events or make other APIs fail.
- `robot.state()` returns the default snapshot (`RobotRunState.Unknown`).
- `status()` on `power_1` / `power_2` / `screen` / `voice` has no default data and raises `RuntimeError("empty status payload")`.
- Data channels are unavailable by default: opening one (e.g. `robot.left_arm.joints()`) fails with `NotFound` (`not stubbed`); to feed channel frames, use the `MockBackend` below.

## Low-Level Control: MockBackend

For custom event pushes, channel data, or handlers, use `MockBackend` together with `Robot.from_backend()`:

```python
from fabot import Robot
from fabot.core.mock_backend import MockBackend

backend = MockBackend()
robot = Robot.from_backend(backend)
# backend.set_command_handler(...) / set_operation_handler(...)
# backend.set_subscribe_handler(...) + backend.push_frame(...)
# backend.push_event(...)
```

`Robot.mock()` assembles exactly this internally, additionally installing default handlers and `on_*` hooks for every slot.

!!! note
    Mock only simulates SDK-side behavior; it does not validate server-side constraints (resource queuing, real error codes, event timing, etc.). Integration tests that depend on real server-side behavior still require a real robot or a platform-side test environment.
