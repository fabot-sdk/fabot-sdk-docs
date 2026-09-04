---
title: Motion
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Motion

Query and switch the whole-body motion control state machine (FSM), and subscribe to the joint position stream. See [Commands & Operations](../../usage/commands-operations.md) for the command and timeout model, [Events & Channels](../../usage/events-channels.md) for channel usage, and [Motion](../../reference/python/motion.md) for the full API.

## Query and Switch the FSM State

`get_fsm_state` / `set_fsm_state` are Commands. The FSM state is the `FsmState` enum: `Home` / `Hold` / `Ocs2` / `MoveJ`; `set_fsm_state` returns the state actually applied:

```python
from fabot import Robot
from fabot.capabilities.motion import FsmState

with Robot.connect("192.168.1.10", 7557) as robot:
    robot.wait_ready(["motion"])

    state = robot.motion.get_fsm_state()
    print("current state:", state)

    if state != FsmState.Hold:
        applied = robot.motion.set_fsm_state(state=FsmState.Hold)
        print("switched to:", applied)
```

Notes:

- `set_fsm_state` returns the `FsmState` that took effect, which may differ from the request — trust the return value.
- `set_fsm_state` and `reset_fsm` hold the whole-body motion control resource: while one is running, another call on the same resource is rejected outright instead of queued. Use `reset_fsm` to recover from an abnormal state (30 s default timeout) — see [Motion](../../reference/python/motion.md).
- Body constraint modes are set with `set_body_mode(mode="BODY_RELATIVE")` etc.; the mode name is a case-sensitive string.

## Subscribe to the Joint Position Stream

`joints()` opens the whole-body joint position channel; iterate frames with `frames()` and always `close()` when done:

```python
ch = robot.motion.joints(qos_profile="latest")
try:
    for frame in ch.frames(poll_timeout_ms=100, timeout_ms=5000):
        for joint in frame.payload.positions:
            print(frame.sequence, joint.name, joint.position)
finally:
    ch.close()
```

The frame's `payload` is a `NamedJointsT` (`positions`: `list[JointPositionT]`, each with `name` / `position` in radians); `qos_profile` is a string (`"latest"` / `"realtime"` / `"reliable"`), not an enum.

## Read Joints Once and Stop Motion

Use `get_joints()` for a one-off snapshot; use `stop()` to halt the current motion immediately — it returns an `OutcomeT`:

```python
for joint in robot.motion.get_joints():
    print(joint.name, joint.position)

outcome = robot.motion.stop()
print(outcome.success, outcome.statusMessage)
```

`get_joints` and `stop` do not hold the motion control resource and can be called at any time.
