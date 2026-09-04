---
title: Mock Testing
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Mock Testing

The SDK ships a built-in Mock backend, so you can develop, debug, and unit-test without a real robot. Two ways to use it:

- `Robot.mock()`: one call creates a `MockRobot` with all slots available, and you inject behavior hooks as needed (recommended, covers most scenarios).
- `MockBackend` + `Robot.from_backend()`: full manual control over low-level behavior, including injecting events, channel frames, and connection changes (advanced).

## Quick Start: `Robot.mock()`

```python
from fabot import Robot

robot = Robot.mock()                     # MockRobot: a subclass of Robot
robot.connection.is_connected()          # True: connected on creation, no connect()/wait_ready() needed
```

- `MockRobot` exposes the same 22 slot attributes as `Robot`, so application code needs no distinction; each proxy is simply the corresponding Mock proxy (e.g. `ChassisMockProxy`, which inherits `ChassisProxy`) with an extra set of `on_<command>` hooks. See [Connection & the Robot Entry Point](connection.md) for the slot list.
- Every Command / Operation has a corresponding hook attribute covering all calls of that capability.

## Injecting Command Behavior

A hook's signature matches the parameters of the corresponding call (passed as keyword arguments), and its return value decides the behavior:

- Returning `None` (or nothing): the default success response is used (an empty shell object with default field values);
- Returning a response object: replaces the default response;
- Raising an exception: the call fails with a `FabotError` (`Internal`) — useful for testing error-handling paths.

```python
from fabot import Robot
from fabot.capabilities.chassis import StationInfoT, StationListT

robot = Robot.mock()

# Record arguments; returning None -> default success response
calls = []
robot.chassis.on_set_velocity = lambda vx, vy, vtheta: calls.append((vx, vy, vtheta))
robot.chassis.set_velocity(vx=0.2, vy=0.0, vtheta=0.0)

# Custom response
def fake_stations():
    station = StationInfoT()
    station.stationId = 7
    station.name = "charging"
    resp = StationListT()
    resp.stations = [station]
    return resp

robot.chassis.on_list_stations = fake_stations
print(robot.chassis.list_stations().stations[0].stationId)   # 7

# Inject failure: raising in the hook -> caller receives a FabotError
def broken_show_text(text):
    raise RuntimeError("screen offline")

robot.screen.on_show_text = broken_show_text
```

## Injecting Operation Behavior

Operation hooks (e.g. `on_move_relative` / `on_navigate_to_station`) work the same way: the hook's return value becomes the terminal `result`. By default an Operation reaches the `Succeeded` terminal state immediately after starting (no intermediate `Running` phase or progress feedback), and its `operation_id` is generated automatically:

```python
from fabot import Robot
from fabot.core import OperationState

robot = Robot.mock()

op = robot.chassis.move_relative(dx=1.0, dy=0.0, dtheta=0.0)
snap = op.get()
assert snap.state == OperationState.Succeeded and snap.terminal
```

For full snapshot control (failure, intermediate states, etc.), use `MockBackend.set_operation_handler` (see below).

## Default Behavior at a Glance

| Aspect | Default behavior |
|--------|------------------|
| Command | Successful empty-shell response (default field values) |
| Operation | Immediately `Succeeded`, with an empty-shell `result` |
| Channel | No frames are pushed |
| Events | None are produced spontaneously |
| Robot-wide state | `state()` / `status()` / `faults()` return empty snapshots |
| Estop / configuration / services | Work in memory: `estop` engage/release updates the `EstopState`; `configuration` get/apply maintains the in-memory config and revision; `services` control operations succeed while the run state stays `Unknown` |

## Advanced: `MockBackend`

To inject events or channel frames, or to simulate connection loss, use `fabot.core.MockBackend` directly:

```python
from fabot import Robot
from fabot.core import MockBackend

backend = MockBackend()
backend.set_manager_connected(True)
robot = Robot.from_backend(backend)

# Simulate Manager disconnect/reconnect: triggers connection.subscribe callbacks
backend.set_manager_connected(False)
```

Main injection points:

- `set_command_handler` / `set_operation_handler` / `set_subscribe_handler`: register low-level handlers by (slot or capability, method name); payloads are `BytesPayload`, encoded/decoded with `encode_flatbuffer` / `decode_flatbuffer`;
- `push_event(event)`: deliver an `Event` to event subscriptions whose selector matches (see [Events & Channels](events-channels.md) for the subscription model);
- `push_frame(channel_id, frame)`: deliver one `ChannelFrame` to channel watchers;
- `set_manager_connected(bool)`: simulate connection state changes.

!!! warning
    `Robot.from_backend(MockBackend())` registers no default handlers: any unregistered Command / Operation / Channel call fails with `NotFound` ("not stubbed"). For a "success by default + manual injection" setup, register handlers on the backend yourself.

## Limitations

- Mock only simulates SDK-side behavior; it does not validate server-side constraints (argument validity, resource conflicts, real error codes, etc.).
- Events and channels produce no data on their own; Operations have no real asynchronous progression (no progress feedback, immediately terminal).
- Integration tests involving real server-side behavior still require a real robot or a platform-side test environment.

## See Also

- [Connection & the Robot Entry Point](connection.md) — slot list, `Robot.from_backend`
- [Commands & Operations](commands-operations.md) — the Command / Operation model
- [Events & Channels](events-channels.md) — event subscriptions and data channels
- [Error Handling](errors.md) — the `FabotError` hierarchy
- [Example: Mock](../examples/python/mock.md)
- [Robot Reference](../reference/python/robot.md)
