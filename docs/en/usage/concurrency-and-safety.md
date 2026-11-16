---
title: Concurrency, Threading and Safety
status: draft
owner: fabot-core
updated: 2026-11-16
---

# Concurrency, Threading and Safety

This page answers the three questions that bite integrations most often: what must not run inside a callback, whether several threads may share one `Robot`, and whether motion commands stop on their own.

## Thread model

| Question | Answer |
|----------|--------|
| Can `Robot` / slot proxies be shared across threads? | Yes. Resolve caches, connection state and channel leases are lock-protected; one instance can be shared |
| Two threads sending motion commands to the same slot? | The transport allows it, but **ordering is not guaranteed**. Operations on one resource are ordered by the platform's `queue` / `reject` policy; Commands are handled first-come-first-served |
| Are callbacks for one subscription serialised? | Yes. Delivery runs through the client's event dispatch path and invokes callbacks in arrival order; different subscriptions have no relative ordering guarantee |
| What may a callback do? | Only short work. Any blocking API raises `ClientThreadError` |

**The recommended pattern is one writer per slot**: funnel every command for a slot (or a robot's motion) through a single thread or `queue`, and let other threads only read state or hand over work. That removes "last writer wins" races without you guessing the server's scheduling.

```python
import queue
import threading

commands: "queue.Queue[tuple[str, object]]" = queue.Queue()

def worker(robot):
    while True:
        name, payload = commands.get()
        if name == "stop":
            return
        if name == "twist":
            robot.chassis.servo_twist(**payload)

t = threading.Thread(target=worker, args=(robot,), daemon=True)
t.start()
commands.put(("twist", {"vx": 0.2, "vy": 0.0, "vtheta": 0.1}))
# on shutdown
commands.put(("stop", None))
t.join()
```

## The SDK I/O thread

Event, log and channel callbacks run on the SDK I/O thread. Calling any of the following there raises `ClientThreadError`:

- Connection factories (`Robot.connect` / `from_config` / `from_endpoint` / `from_backend`) and `close()`
- Submitting any Command or Operation, plus `wait()`, `get()`, `frames()`, `next()`, `renew()`
- Opening / closing channels and starting new subscriptions
- `wait_ready()` and `robot.frames` queries and writes

Hand heavy work to your own queue and consume it on a normal thread:

```python
from queue import Queue, Empty

events: "Queue[object]" = Queue()

def on_event(event):
    events.put(event)          # the callback only enqueues

def consumer():
    while True:
        try:
            event = events.get(timeout=0.5)
        except Empty:
            continue
        # do the expensive work and call blocking APIs here
        print(event.header.name)
```

`Robot.mock()` obeys the same rule: the mock goes through the same thread guard.

## Servo and safety

`servo_twist()` / `servo_pose()` / `servo_height()` send **one target per call**; they do not open a session:

- The target does not expire. To stop motion you must call the capability's `stop()` (chassis, lift), or send zero velocity and confirm it took effect.
- The SDK makes no "auto-brake on disconnect" promise. Leave safe shutdown to the robot-side watchdog and hardware e-stop; never rely on the client process staying alive.
- `robot.estop` is a **software e-stop**: it is latched, drives `robot.state().mode` to `Estopped`, and needs an explicit `release()`. It is not a substitute for a hardware e-stop circuit.

:::warning The client is not a safety circuit
The SDK runs inside your application process. Crashes, power loss and network drops can happen at any moment. Any situation where a person can reach the motion envelope must be backed by the robot-side hardware e-stop and safety watchdog.
:::

## Idempotency and retries

| Kind | Safe to replay as-is | Notes |
|------|---------------------|-------|
| Read Commands (`get_*`) | Yes | No side effects |
| Idempotent writes (`set_*`, `acquire`, resource release) | Yes | Rewriting the same value gives the same result |
| `servo_twist` / `servo_pose` / `servo_height` | Conditional | A retry sends the target again; after a timeout, read state first to see whether the previous call landed |
| Motion Operation submission (`move_*`) | No | A retry can create a second task; inspect the existing handle first |
| `stop()` | Yes | Repeated calls add nothing |
| `set_height_zero` | No | Every call redefines the current position as zero |

`retryable` only says the error class may succeed later — it does not mean the call can be replayed. Decide in this order: error type, then whether this call is idempotent, then whether to retry.

## Disconnects and reconnects

- Check `robot.connection.is_connected()`, or subscribe with `robot.connection.subscribe(cb)`.
- Existing `SubscriptionToken`s and channels are not guaranteed to survive a disconnect; after reconnecting, subscribe again and re-open channels.
- Running Operations continue robot-side, but their handles may no longer produce snapshots after a reconnect; confirm with business state or robot-side logs.
- A `Robot` instance cannot reconnect: build a new `Robot` and re-create subscriptions and channels.

See [Troubleshooting](../troubleshooting.md) for the step-by-step checks.
