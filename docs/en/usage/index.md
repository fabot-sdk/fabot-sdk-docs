---
title: Usage
status: draft
owner: fabot-core
updated: 2026-11-02
---

# Usage

This section covers the mechanics that apply across every capability module: connecting to the robot, issuing commands and tracking long-running operations, subscribing to events and data, reading status and faults, handling logs and metrics, converting between coordinate frames, handling errors and localized text, plus configuration, skills, mock testing and platform services.

`Robot` provides all of these uniformly for the 15 capability modules (arm, arms, body, camera, chassis, gripper, hand, head, io, light, motion, power, screen, teleop, voice). Per-module API details are in the [Python API Reference](../reference/python/index.md).

## Reading order

Read in this order: models and connection first, then data and operations topics:

1. [Connection & Robot Entry](connection.md) — `Robot.connect` and the other entries, `ClientOptions`, connection-state subscription, resource release.
2. [Commands & Operations](commands-operations.md) — Commands, Operation progress tracking, cancellation and resource queueing policies.
3. [Events & Data Channels](events-channels.md) — events (`EventHeader`, `SubscriptionToken`) and channels (frame iteration, QoS, renewal, closing).
4. [Status, Faults & Lifecycle](status-faults.md) — `robot.state()` run mode and health, status bags, lifecycle and health, fault bags.
5. [Logs, Metrics & Observability](observability.md) — log subscription and history, custom log / metric emission, freezing the flight recorder.
6. [Frames & Transforms](frames.md) — `robot.frames` queries, pose and point-cloud transforms, pixel deprojection.
7. [Error Handling](errors.md) — the `FabotError` hierarchy, diagnostic codes and retryability, trace ids.
8. [Catalogs](catalogs.md) — turning diagnostic codes, log keys and metric names into display text.
9. [Configuration](configuration.md) — robot bindings and capability / skill config domains, CAS conflicts.
10. [Skills & Extensions](skills.md) — multi-camera sync and voice semantics through `robot.skills`.
11. [Mock Testing](mock.md) — offline development and its limits.
12. [Platform Services](services.md) — starting, stopping, configuring and inspecting platform services.

## Cheat sheet

- **Connect and wait for readiness**: `Robot.connect(...)` + `wait_ready()`, see [Connection & Robot Entry](connection.md).
- **Issue an action**: call the capability method and note whether it is a Command or an Operation, see [Commands & Operations](commands-operations.md).
- **Watch state changes**: subscribe through `robot.events` / `robot.<slot>.events` and read `EventHeader`, see [Events & Data Channels](events-channels.md).
- **Pull camera and other streams**: open a channel and iterate frames, then close it, see [Events & Data Channels](events-channels.md).
- **Inspect robot state**: `robot.state()` / `robot.status()` / per-module `status()`, see [Status, Faults & Lifecycle](status-faults.md).
- **Log, measure, capture the scene**: `robot.logs` / `robot.metrics` / `robot.freeze()`, see [Logs, Metrics & Observability](observability.md).
- **Convert poses or point clouds between frames**: `robot.frames`, see [Frames & Transforms](frames.md).
- **Catch and classify failures**: catch the `FabotError` hierarchy, check `retryable` and follow `trace_id`, see [Error Handling](errors.md).
- **Show localized text**: `Catalogs.load()` then `format_error` / `format_log` / `format_fault` / `format_metric`, see [Catalogs](catalogs.md).
- **Develop without hardware**: `Robot.mock()`, see [Mock Testing](mock.md).
