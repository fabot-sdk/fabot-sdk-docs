---
title: Mock Testing
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Mock Testing

The SDK ships a mock backend so you can develop, integrate and unit test without a robot. Two styles:

- `Robot.mock()`: one line for a `MockRobot` with every slot available, plus behaviour hooks (recommended; covers most cases).
- `MockBackend` + `Robot.from_backend()`: full manual control of the low level, including events, channel frames and connection changes (advanced).

## Quick start: `Robot.mock()`

```python
from fabot import Robot

robot = Robot.mock()                     # MockRobot, a Robot subclass
robot.connection.is_connected()          # True: connected from the start, no connect()/wait_ready()
```

- `MockRobot` exposes the same 23 slot properties as `Robot`, so application code does not branch; each proxy is the matching mock proxy (for example `ChassisMockProxy`, a `ChassisProxy` subclass) with extra `on_<command>` hooks.
- Skills have mock proxies too: `robot.skills.camera_sync` / `robot.skills.voice_aiui` report `is_available == True`.
- `robot.services`, `robot.metrics`, `robot.logs` and `robot.frames` work as with a real connection (service control merely succeeds and keeps the previous state).

## Injecting Command behaviour

Hook names are `on_` plus the method name (`on_get_pose`, `on_show_text`, `on_move_joint`, …) with the same signature as the call. The return value decides the behaviour:

- `None` (or no return): use the default success response (an empty object with default fields);
- a response object: replace the default;
- raising: the call fails with a `FabotError` (`Internal`) — perfect for exercising error paths.

```python
from fabot import Robot
from fabot.types import Pose2d

robot = Robot.mock()

# Return a custom response
robot.chassis.on_get_pose = lambda: Pose2d(x=1.5, y=2.0)

# Record arguments; returning None keeps the default success response
calls = []
robot.chassis.on_servo_twist = lambda **kwargs: calls.append(kwargs)

robot.chassis.servo_twist(vx=0.2, vy=0.0, vtheta=0.0)
print(robot.chassis.get_pose(), calls)

# Inject a failure: the hook raises, the caller gets a FabotError
def broken_show_text(text):
    raise RuntimeError("screen offline")

robot.screen.on_show_text = broken_show_text
```

## Injecting Operation behaviour

Operation hooks (such as `on_move_station` / `on_move_joint` / `on_listen`) work the same way: the return value becomes the terminal `result`. By default an Operation reaches `Succeeded` immediately (no `Running` phase, no progress feedback) with a generated `operation_id`:

```python
from fabot import Robot
from fabot.core import OperationState

robot = Robot.mock()

op = robot.chassis.move_station(3)
snap = op.get()
assert snap.state == OperationState.Succeeded and snap.terminal
```

For custom terminal states or intermediate snapshots use `MockBackend.set_operation_handler` (below).

## Default behaviour

| Surface | Default |
|---------|---------|
| Command | Success with an empty response (default fields) |
| Operation | Immediate `Succeeded` with an empty `result` |
| Channel | Opening a channel fails with `NotFound` ("not stubbed"): the mock registers no default channel handler |
| Events | Nothing is emitted |
| Robot state | `state()` / `status()` / `faults()` return empty snapshots |
| E-stop / config / services | `engage` / `release` update an in-memory `EstopState`; `configuration` `get` / `apply` maintain an in-memory config and revision; service control succeeds while state stays `Unknown` |
| Skills | Skill proxies are available and `is_available` is `True` |

:::note Slots start unbound
Whether a slot "has an adapter" in the mock comes from the in-memory configuration, and by default none is bound. So `robot.<slot>.get_config()` raises `AdapterUnbound`, matching a real robot whose configuration is not ready yet — a path worth testing.
:::

## Advanced: `MockBackend`

To inject events, channel frames or simulate a disconnect, use `fabot.core.MockBackend` directly:

```python
from fabot import Robot
from fabot.core import MockBackend

backend = MockBackend()
backend.set_manager_connected(True)
robot = Robot.from_backend(backend)

# Simulate the manager dropping and returning: fires connection.subscribe callbacks
backend.set_manager_connected(False)
```

Injection points:

- `set_command_handler(slot_or_cap, method, handler)` / `set_operation_handler(...)` / `set_subscribe_handler(...)`: register low-level handlers per (slot or capability, method); payloads are `BytesPayload`, paired with `encode_flatbuffer` / `decode_flatbuffer`;
- `push_event(event)`: deliver an `Event` to matching event subscriptions (see [Events & Data Channels](events-channels.md));
- `push_frame(channel_id, frame)`: deliver a `ChannelFrame` to channel watchers;
- `set_manager_connected(bool)`: simulate connection changes.

:::warning
`Robot.from_backend(MockBackend())` registers no default handlers: unregistered Command / Operation / Channel calls fail with `NotFound` ("not stubbed"). For "default success with a few overrides", use `Robot.mock()` and replace individual hooks.
:::

## Limits

- The mock models SDK-side behaviour only; it does not enforce server constraints (argument validation, resource conflicts, real diagnostic codes).
- Events and channels never produce data spontaneously; Operations have no real asynchronous progression (no progress feedback, immediately terminal).
- Integration tests that depend on real server behaviour still need a robot or a platform test environment.

## Related pages

- [Connection & Robot Entry](connection.md) — slot list, `Robot.from_backend`
- [Commands & Operations](commands-operations.md) — Command / Operation model
- [Events & Data Channels](events-channels.md) — subscriptions and channels
- [Error Handling](errors.md) — the `FabotError` hierarchy
- [Example: Mock](../examples/python/mock.md)
- [Robot reference](../reference/python/robot.md)
