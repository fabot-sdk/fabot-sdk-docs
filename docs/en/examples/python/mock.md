---
title: Mock
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Mock

Use `Robot.mock()` to develop, integrate and unit test without a real robot. Mechanics and limits are in [Mock Testing](../../usage/mock.md).

## Quick start

`Robot.mock()` returns a `MockRobot` (a `Robot` subclass) whose slot properties match the real `Robot`; it is usable immediately, with no `connect` / `wait_ready`:

```python
from fabot import Robot

robot = Robot.mock()

print(robot.connection.is_connected())      # True
print(robot.state())                        # empty snapshot
print(robot.chassis.get_pose())             # default Pose2d(0, 0, 0)
```

## Injecting command responses

Hook names are `on_` plus the method name; the return value is the response. Returning `None` keeps the default empty response, and raising makes the caller receive a `FabotError`.

```python
from fabot import Robot
from fabot.types import Pose2d

robot = Robot.mock()

# Fixed response
robot.chassis.on_get_pose = lambda: Pose2d(x=1.5, y=2.0, theta=0.3)

# Record arguments
sent = []
robot.chassis.on_servo_twist = lambda **kwargs: sent.append(kwargs)

robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.1)
print(robot.chassis.get_pose(), sent)
```

## Injecting failures

Use a hook that raises to exercise error branches:

```python
robot.screen.on_show_text = lambda text: (_ for _ in ()).throw(RuntimeError("screen offline"))

from fabot import FabotError
try:
    robot.screen.show_text("hi")
except FabotError as err:
    print("caught:", type(err).__name__, err)
```

## Injecting Operation results

An Operation hook's return value becomes the terminal `result`; by default it is `Succeeded` immediately:

```python
from fabot.core import OperationState
from fabot.types import Outcome

robot.chassis.on_move_station = lambda station_id, **kwargs: Outcome(success=True, status_message="arrived")

snap = robot.chassis.move_station(3).get()
print(snap.state is OperationState.Succeeded, snap.result.status_message)
```

## Exercising configuration and services

The mock's `services` control calls succeed and `configuration` keeps an in-memory config with a revision:

```python
robot.services.ocs2.start()
print(robot.services.ocs2.is_running())

cfg = robot.configuration.get()
print(cfg.revision)
```

Note: slots start **unbound** in the mock, so `robot.left_arm.get_config()` raises `AdapterUnbound` — the same behaviour a real robot shows before its configuration is ready, which makes it easy to test that branch.

## Controlling the low level with MockBackend

Use `MockBackend` when you need to inject events, channel frames or simulate a disconnect:

```python
from fabot import Robot
from fabot.core import MockBackend

backend = MockBackend()
backend.set_manager_connected(True)
robot = Robot.from_backend(backend)

seen = []
robot.connection.subscribe(lambda st: seen.append(st.connected))
backend.set_manager_connected(False)
print(seen)          # [True, False]
```

:::warning
`Robot.from_backend(MockBackend())` registers no default handlers, so unregistered calls fail with `NotFound` ("not stubbed"). For "default success with a few overrides", use `Robot.mock()`.
:::
