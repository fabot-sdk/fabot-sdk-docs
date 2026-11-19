---
title: ROS 2 Service Ros2
status: draft
owner: fabot-core
updated: 2026-11-17
---

# ROS 2 Service Ros2

## Module Overview

- Service: `ros2`; entry: `robot.services.ros2`
- service id: `fabot_ros2`; handle `Ros2ServiceHandle`; config type `Ros2Config`
- Bridges the ROS 2 graph between this host and the robot: node / topic / service / action queries, service calls, publish and subscribe, parameter access and action goals.
- The only service handle with a capability-proxy-style slot surface (`handle` / `events` / `health()` / `lifecycle()` / `faults()` / `ping()` / `self_check()`).
- **Every payload is a JSON string**; never assume Python objects for a concrete message type on the client.

Shared platform operations (`start` / `state` / `get_config`, CAS conflicts and so on) are in the [Platform Services Overview](./index.md).

## API Overview

| Name | Kind | Description |
|------|------|-------------|
| `start` / `stop` / `restart` | Command | Lifecycle control; control timeout 25000 ms. |
| `state` / `is_running` | Command | Process status. |
| `list_nodes` / `node_info` | Command | List nodes / read one node; default timeout 3000 ms. |
| `list_topics` / `topic_info` | Command | List topics / read one topic's endpoints and types. |
| `list_services` / `service_type` | Command | List services / look up a service type name. |
| `list_actions` | Command | List actions. |
| `call_service` | Command | Call a service; `timeout_ms` required. |
| `publish` | Command | Publish one message; default timeout 3000 ms. |
| `subscribe` / `unsubscribe` | Command | Create / release a topic subscription lease. |
| `list_parameters` / `get_parameter` / `set_parameter` | Command | Node parameter access; `get_parameter` defaults to 3000 ms, `set_parameter` to 10000 ms. |
| `send_goal` | Operation | Send an action goal, returns `SendGoalOperation`; `timeout_ms` required. |
| `messages` | Channel | Received messages; frames are `TopicMessage`. |
| `listen` | Helper | Subscribe and iterate JSON payloads; closing releases that lease. |
| `events` | Event entry | `fault_changed` / `lifecycle_changed` plus wildcard `subscribe()`. |
| `get_config` / `set_config` / `edit_config` | Command / context manager | `Ros2Config` access, domain `node`. |
| `slot_id` / `handle` / `has_adapter` / `as_adapter` / `health` / `lifecycle` / `faults` / `ping` / `self_check` | Common slot surface | Same names and meanings as capability proxies. |

## Methods

Signatures below are authoritative for names and defaults. Fields use snake_case; the generated types also accept the camelCase alias.

### Graph queries

Query methods are short Commands reading the service-side cache. `wait_ms` is how long to wait for the graph to converge in milliseconds and `include_hidden` decides whether hidden entities are included; both are **required keyword arguments**.

```python
list_nodes(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[NodeName]
node_info(*, name: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> NodeInfo
list_topics(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[TopicEndpoint]
topic_info(*, name: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> TopicInfo
list_services(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[ServiceEndpoint]
service_type(*, name: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> str
list_actions(*, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[ActionEndpoint]
list_parameters(*, node: str, include_hidden: bool, wait_ms: int, timeout_ms: int = 3000) -> list[str]
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `str` | (required) | Node / topic / service name |
| `node` | `str` | (required) | Node name (parameter queries) |
| `include_hidden` | `bool` | (required) | Include hidden entities |
| `wait_ms` | `int` | (required) | Graph convergence wait in milliseconds |
| `timeout_ms` | `int` | `3000` | Call timeout in milliseconds |

**Returned type fields**

| Type | Fields |
|------|--------|
| `NodeName` | `name` / `namespace` |
| `NodeInfo` | `name` / `publishers` / `subscribers` / `services` / `actions` |
| `TopicEndpoint` / `ServiceEndpoint` / `ActionEndpoint` | `name` / `types` (type-name list) |
| `TopicInfo` | `name` / `types` / `publishers` / `subscribers`; endpoint items are `node` / `message_type` |

```python
svc = robot.services.ros2
print(svc.list_nodes(include_hidden=False, wait_ms=500))
print(svc.topic_info(name="/scan", include_hidden=False, wait_ms=500))
print(svc.list_parameters(node="/controller_manager", include_hidden=False, wait_ms=500))
```

### Service calls and messages

```python
call_service(*, name: str, message_type: str, payload: str, timeout_ms: int) -> str
publish(*, name: str, message_type: str, payload: str, timeout_ms: int = 3000) -> Empty
subscribe(*, name: str, message_type: str, reliability: int, depth: int, timeout_ms: int = 3000) -> str
unsubscribe(*, subscription_id: str, timeout_ms: int = 3000) -> Empty
set_parameter(*, node: str, name: str, payload: str, timeout_ms: int = 10000) -> str
get_parameter(*, node: str, name: str, timeout_ms: int = 3000) -> str
messages(qos_profile: str = "latest") -> MessagesChannel
listen(name: str, message_type: str, *, reliability: int = 0, depth: int = 10)
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `message_type` | `str` | (required) | ROS interface type name, such as `std_msgs/msg/String` |
| `payload` | `str` | (required) | JSON string |
| `reliability` | `int` | `0` (`listen` uses `0`) | QoS reliability |
| `depth` | `int` | `10` (`listen` uses `10`) | Queue depth |
| `subscription_id` | `str` | (required) | Lease id returned by `subscribe()` |

`subscribe()` returns a subscription lease id; messages arrive through the `messages()` channel and `unsubscribe()` releases the lease. `call_service()` requires `timeout_ms`; `get_parameter()` returns a JSON string.

`listen()` is a convenience wrapper: it calls `subscribe()`, opens the `messages()` channel and yields only this lease's message payloads (JSON strings); `close()` closes the channel, then unsubscribes, releasing only its own lease.

```python
with svc.listen("/scan", "sensor_msgs/msg/LaserScan", depth=1) as messages:
    for payload in messages.frames():
        print(payload[:80])
        break
```

### Action goals

`send_goal()` returns a `SendGoalOperation` immediately, used like any other Operation.

```python
send_goal(*, name: str, message_type: str, payload: str, timeout_ms: int) -> SendGoalOperation
```

**Parameters**

| Name | Type | Default | Description |
|------|------|---------|-------------|
| `name` | `str` | (required) | Action name |
| `message_type` | `str` | (required) | Action interface type name |
| `payload` | `str` | (required) | Goal JSON string |
| `timeout_ms` | `int` | (required) | Call timeout in milliseconds |

`SendGoalOperation`: `id` / `get()` / `wait()` / `cancel()` / `events()`. Snapshot `feedback` is `GoalProgress` (`payload`) and `result` is `GoalOutcome` (`payload`), both JSON strings.

```python
op = svc.send_goal(name="/navigate_to_pose", message_type="nav2_msgs/action/NavigateToPose", payload='{"pose": {}}', timeout_ms=30000)
print(op.wait(timeout=60.0).payload)
```

## Channels

### messages

```python
messages(qos_profile: str = "latest") -> MessagesChannel
```

Frame payload `TopicMessage`:

| Field | Type | Description |
|-------|------|-------------|
| `subscription_id` | `str` | Owning subscription lease |
| `topic` | `str` | Topic name |
| `message_type` | `str` | Message type |
| `stamp_ns` | `int` | Timestamp in nanoseconds |
| `payload` | `str` | JSON string |

The outer `MessagesChannelFrame` carries `channel_id` / `sequence` / `timestamp_us` / `payload`. Create a lease with `subscribe()` and filter on `subscription_id` for the messages you care about; `next()` with no arguments waits 5 seconds. General usage is in [Events & Data Channels](../../../usage/data/events-channels.md).

## Events

`robot.services.ros2.events` provides:

| Entry | Event type | Payload |
|-------|-----------|---------|
| `events.fault_changed` | `FaultChangedEvent` | `faults`: `Faults` |
| `events.lifecycle_changed` | `LifecycleChangedEvent` | `lifecycle`: `CapabilityLifecycleSnapshot` |
| `events.subscribe(cb, on_error=...)` | Wildcard subscription | `Event` |

Process state transitions still arrive on the robot-wide `robot.events.service_state_changed`.

## Exceptions

Service control and query failures raise `FabotError` subclasses: `Timeout`, `NotFound` for an unknown service, `InvalidArgument` for bad arguments and `ResourceConflict` for contention; config clashes raise `ConfigurationConflict`.

Payloads are always JSON strings; a server-side parse failure comes back as `InvalidArgument` or `Internal`, and the client does no local deserialisation. Slot-level faults come from `faults()`, returning `Faults` (`revision` plus `records: list[FaultState]`) with the same fields as capabilities: `code` / `source` / `state` / `severity` / `timestamp_us`. See [Error Handling](../../../usage/diagnostics/errors.md).

## Status

`state()` returns `ServiceState` (fields in the [Platform Services Overview](./index.md)); `health()` returns `SlotHealth` and `lifecycle()` returns `CapabilityLifecycleSnapshot`.

`Ros2Config` has a single `node` domain:

| Field | Default | Description |
|-------|---------|-------------|
| `node_name` | `fabot_ros2` | Node name in the ROS graph |
| `namespace` | `""` | Node namespace |

The ROS 2 domain id lives in `robot.environments.ros2`, not in the service config, see [ros2_environment.md](./ros2_environment.md).

## Resources

| Resource | Policy | Occupied by |
|----------|--------|-------------|
| `goal` | `queue` | `send_goal` |

One action goal runs at a time and later ones wait in the queue. The default budget is **30 seconds** and it is cancelable. Query commands plus `call_service` / `publish` / `subscribe` are short Commands and occupy no resource.

## Config domains

```python
with robot.services.ros2.edit_config() as cfg:
    cfg.node.namespace = "/robot"
```

## Related

- Service concepts and lifecycle caveats: [Platform Services](../../../usage/configuration/services.md)
- Runtime environment domain / communication config: [ros2_environment.md](./ros2_environment.md)
- Config-domain access: [Configuration](../../../usage/configuration/configuration.md)
- Commands and Operations: [Commands & Operations](../../../usage/basics/commands-operations.md)
