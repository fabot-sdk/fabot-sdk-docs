---
title: Usage Overview
status: draft
owner: fabot-core
updated: 2026-11-20
---

# Usage Overview

This section covers the mechanics that apply across every capability module, organized into five themed chapters: [Basics](#basics) (connection, conventions, commands and operations, concurrency), [Data & Status](#data-status) (events and channels, status and faults, frames), [Errors & Diagnostics](#errors-diagnostics) (error handling, catalogs, self-check, observability), [Configuration, Skills & Services](#configuration-skills-services), and [Testing, Migration & Background](#testing-migration-background).

`Robot` provides all of these uniformly for the 16 capability modules (arm, arms, body, camera, chassis, gripper, hand, head, io, lift, light, motion, power, screen, teleop, voice). Per-module API details are in the [Python API Reference](../reference/python/index.md).

## Chapter guide

Start with **Basics** and read it in order, then jump into the other chapters as needed:

### Basics

Get connected and the conventions straight, then understand the calling and threading model shared by every module:

1. [Connection & Robot Entry](./basics/connection.md) — `Robot.connect` and the other entries, `ClientOptions`, connection-state subscription, resource release.
2. [Time Bases and Coordinate Conventions](./basics/conventions.md) — units, quaternion order, `stamp_ns` semantics, time bases and joint ordering.
3. [Commands & Operations](./basics/commands-operations.md) — Commands, Operation progress tracking, cancellation and resource queueing policies.
4. [Concurrency, Threading and Safety](./basics/concurrency-and-safety.md) — thread model, I/O-thread rules, servo safety, idempotency and reconnects.

### Data & Status

Continuously read data from the robot and inspect its current state:

5. [Events & Data Channels](./data/events-channels.md) — events (`EventHeader`, `SubscriptionToken`) and channels (frame iteration, QoS, renewal, closing).
6. [Status, Faults & Lifecycle](./data/status-faults.md) — `robot.state()` run mode and health, status bags, lifecycle and health, fault bags.
7. [Frames & Transforms](./data/frames.md) — `robot.frames` queries, pose and point-cloud transforms, pixel deprojection.

### Errors & Diagnostics

Classify, locate and observe failures:

8. [Error Handling](./diagnostics/errors.md) — the `FabotError` hierarchy, diagnostic codes and retryability, trace ids.
9. [Catalogs](./diagnostics/catalogs.md) — turning diagnostic codes, log keys and metric names into display text.
10. [Self-check](./diagnostics/self-check.md) — on-demand slot and robot self-checks, report structure, timeout budgets and overall verdict rules.
11. [Logs, Metrics & Observability](./diagnostics/observability.md) — log subscription and history, custom log / metric emission, freezing the flight recorder and the observability store.

### Configuration, Skills & Services

12. [Configuration](./configuration/configuration.md) — robot bindings and capability / skill config domains, CAS conflicts.
13. [Skills & Extensions](./configuration/skills.md) — multi-camera sync and voice semantics through `robot.skills`.
14. [Platform Services](./configuration/services.md) — lifecycle, config and state for `robot.services` / `robot.environments`.

### Testing, Migration & Background

15. [Mock Testing](./testing/mock.md) — offline development and its limits.
16. [Migrating from 1.0.x to 1.1.0](./testing/migration-1.0-to-1.1.md) — symbol mapping and a checklist for upgrades.
17. [Robot System Operations & Local Console](./testing/robot-system.md) — the `fabot` command, the `fabot console` UI and service start/stop; installation, upgrades and configuration live in Getting Started.

## Cheat sheet

- **Connect and wait for readiness**: `Robot.connect(...)` + `wait_ready()`, see [Connection & Robot Entry](./basics/connection.md).
- **Issue an action**: call the capability method and note whether it is a Command or an Operation, see [Commands & Operations](./basics/commands-operations.md).
- **Watch state changes**: subscribe through `robot.events` / `robot.<slot>.events` and read `EventHeader`, see [Events & Data Channels](./data/events-channels.md).
- **Pull camera and other streams**: open a channel and iterate frames, then close it, see [Events & Data Channels](./data/events-channels.md).
- **Inspect robot state**: `robot.state()` / `robot.status()` / per-module `status()`, see [Status, Faults & Lifecycle](./data/status-faults.md).
- **Log, measure, capture the scene**: `robot.logs` / `robot.metrics` / `robot.freeze()`, see [Logs, Metrics & Observability](./diagnostics/observability.md).
- **Convert poses or point clouds between frames**: `robot.frames`, see [Frames & Transforms](./data/frames.md).
- **Catch and classify failures**: catch the `FabotError` hierarchy, check `retryable` and follow `trace_id`, see [Error Handling](./diagnostics/errors.md).
- **Show localized text**: `Catalogs.load()` then `format_error` / `format_log` / `format_fault` / `format_metric`, see [Catalogs](./diagnostics/catalogs.md).
- **Develop without hardware**: `Robot.mock()`, see [Mock Testing](./testing/mock.md).
- **Start, stop or inspect the robot system on site**: `fabot start` / `stop` / `status` / `enable` / `disable` and `fabot console`, see [Robot System Operations & Local Console](./testing/robot-system.md); for installation, upgrades and configuration see [Installing & Upgrading the Robot System](../getting-started/install/robot-system.md) and [Configuring the Robot System](../getting-started/install/robot-system-config.md).
