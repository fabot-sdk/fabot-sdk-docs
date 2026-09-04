---
title: General Operations
status: draft
owner: fabot-core
updated: 2026-09-04
---

# General Operations

This section covers the cross-cutting mechanisms of the fabot SDK: connecting to the robot, issuing commands and tracking long-running operations, subscribing to events and data streams, reading status and faults, handling errors and localized display text, plus configuration management, mock testing, and platform service management.

These mechanisms are provided uniformly through the `Robot` entry point and apply consistently to all 15 capability modules (arm, arms, body, camera, chassis, gripper, hand, head, io, light, motion, power, screen, teleop, voice). For module-specific APIs, see the [Python API Reference](../reference/python/index.md).

## Reading Order

We recommend reading the pages in this order — model and connection first, then data and operations topics:

1. [Connection & Robot Entry](connection.md) — `Robot.connect` and other entry points, `ClientOptions`, connection state subscription, and resource cleanup.
2. [Commands & Operations](commands-operations.md) — the core model of immediate Commands and trackable, cancellable Operations.
3. [Events & Data Channels](events-channels.md) — event subscriptions (`EventHeader`, `SubscriptionToken`) and data channels (frame iteration, QoS, renew, and close).
4. [Status, Faults & Lifecycle](status-faults.md) — the `robot.state()` snapshot, status bags, and the lifecycle and health state machines.
5. [Error Handling](errors.md) — the `FabotError` hierarchy, error codes and retryability, and Trace IDs.
6. [Localized Text (Catalogs)](catalogs.md) — format errors, logs, and faults into display strings from the embedded text tables.
7. [Mock Testing](mock.md) — offline development and testing with `Robot.mock()`, and its limitations.
8. [Configuration](configuration.md) — reading and applying configuration via `robot.configuration`, plus conflict handling and retries.
9. [Platform Services](services.md) — starting, stopping, configuring, and querying platform services via `robot.services`.

## Common Operations Checklist

- **Connect and wait until ready**: `Robot.connect(...)` + `wait_ready()` — see [Connection & Robot Entry](connection.md).
- **Issue an action**: call a capability method and distinguish Command vs. Operation by return type — see [Commands & Operations](commands-operations.md).
- **Listen to sensor/state events**: `subscribe` to events and read the `EventHeader` in callbacks — see [Events & Data Channels](events-channels.md).
- **Consume camera and other data streams**: open a data channel, iterate frames, then close or renew — see [Events & Data Channels](events-channels.md).
- **Check current robot status**: `robot.state()` and per-module `status()` — see [Status, Faults & Lifecycle](status-faults.md).
- **Catch and classify errors**: catch along the `FabotError` hierarchy, check `retryable`, and troubleshoot with the `trace_id` — see [Error Handling](errors.md).
- **Show localized text**: `Catalogs.load()` then `format_error` / `format_log` / `format_fault` — see [Localized Text (Catalogs)](catalogs.md).
- **Develop without real hardware**: `Robot.mock()` — see [Mock Testing](mock.md).
