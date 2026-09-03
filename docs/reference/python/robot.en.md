---
title: Robot Entry
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Robot Entry

`Robot` is the Python SDK's unified entry point: it opens a connection, exposes capability proxies by slot, and aggregates whole-robot estop, events, and status. See [Connection & Robot Entry](../../usage/connection.md) for the conceptual overview.

## connect

`Robot.connect` / `from_endpoint` / `from_config` open a connection; `close()` or a `with` context closes it.

!!! todo
    To be completed from `fabot` package type hints: full signatures, parameters, and error behavior.

## wait_ready

`wait_ready(slots=None)` blocks until the given slots (all by default) are available.

!!! todo
    To be completed from `fabot` package type hints: timeout, partial-slot, and failure semantics.

## slots

Capabilities are exposed as read-only slot attributes (`robot.io`, `robot.chassis`, and so on); there are 22 slots.

!!! todo
    Fill in the slot table and `has_adapter` / `AdapterUnbound` / `as_adapter` usage.

## estop

`robot.estop` provides `engage` / `release` / `state`.

!!! todo
    To be completed from `fabot` package type hints: the estop state machine and recovery steps.

## events

`robot.events` subscribes to whole-robot events (`estop_changed` / `robot_state_changed` / `registry_changed` / `config_changed` / `service_state_changed` / `faults_changed`). See [Events & Data Channels](../../usage/events-channels.md).

!!! todo
    Fill in each event payload and subscription lifetime.

## status

`state()` / `status()` / `faults()` / `version()` / `sdk_version` aggregate whole-robot status. See [Status, Faults & Lifecycle](../../usage/status-faults.md).

!!! todo
    Fill in the `RobotStatus` / `RobotFaults` field descriptions.
