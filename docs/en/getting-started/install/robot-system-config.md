---
title: Configuring the Robot System
status: draft
owner: fabot-core
updated: 2026-11-20
---

# Configuring the Robot System

The robot system's configuration decides which capabilities this machine carries, what hardware each one talks to, how services start, and where network traffic and logs land. This page covers where configuration lives, how to edit it, the ports and environment variables, and the first-boot setup for a new machine. Installation and upgrades are in [Installing & Upgrading the Robot System](./robot-system.md).

## Where configuration is edited

The same configuration can be changed three ways, and all of them write the robot-side user configuration:

| Route | Good for | Entry point |
|-------|----------|-------------|
| Local console | On-site setup, first boot, quick checks | `http://<robot address>:8787/` in a browser, see [Robot System Operations & Local Console](../../usage/testing/robot-system.md) |
| SDK | Batch reads and writes from your application, automation | `robot.configuration` and each slot's `get_config()` / `set_config()` / `edit_config()`, see [Configuration Management](../../usage/configuration/configuration.md) |
| Editing YAML directly | Bulk edits, version control, import and export | `$FABOT_HOME`, `$FABOT_ROOT/data/config/current` by default |

The console is the recommended route: it validates value ranges, turns candidate values (camera serial numbers, CAN interfaces, serial ports, motion models) into dropdowns, and validates the whole batch before saving.

## Two configuration layers

| Layer | Controls | Effect of a change |
|-------|----------|--------------------|
| Whole-robot configuration | Which capability implementation each slot binds, whether it is enabled or required, its deployment node | Triggers a lifecycle transition for that capability |
| Entity config domains | Parameters owned by one capability, skill or service (arrival tolerance, camera streams, sync groups, motion model) | Affects that entity only; most changes need the unit restarted |

Both layers commit with CAS (compare-and-swap): the request carries the expected revision and fails if the robot's configuration has moved on. On conflict, re-read, merge and retry — see [Configuration Management](../../usage/configuration/configuration.md).

Whole-robot configuration only carries bindings; it never inlines hardware parameters. Use it to change *which* adapter a lift slot uses, and an entity config domain to change that lift's screw lead.

## User configuration directory

`$FABOT_HOME` sets the user configuration root and defaults to `$FABOT_ROOT/data/config/current`. The directory is organized by entity:

```text
data/config/current/
├── robot_spec.yaml                          # optional: robot identity and frame extras
├── robot_config.yaml                        # optional: service and capability wiring overlay
├── environments/fabot_env_ros2/communication.yaml
├── services/fabot_ocs2/launch.yaml
├── services/fabot_obs_collector/obs.yaml
├── services/fabot_ros2/node.yaml
├── slots/lift/config/fabot_lift_leadshine/{can,mechanics}.yaml
├── slots/head_camera/config/fabot_camera_orbbec/{camera,video}.yaml
├── slots/chassis/config/fabot_chassis/{network,motion}.yaml
└── subsystems/motion_control/robot.local.yaml
```

`robot_spec.yaml` / `robot_config.yaml` are optional top-level overlays: without the file the packaged default applies; with it, only the parts it writes are overridden. Inspect them with `fabot config show` and delete them with `fabot config clean` (which removes `robot_spec.yaml` as well). The other directories are created on demand — when a config domain is bound for the first time, its packaged template is copied into the user directory.

:::note User copies do not refresh on upgrade
A domain's user copy is copied from the template only on first bind and is never merged with a newer template afterwards. Keys removed or renamed in the package stay in the file and fail loading with `unexpected config field` — see [Troubleshooting](../../troubleshooting.md). To return to defaults, use **Restore defaults** in the console detail page, or delete the domain's file so it is copied again on the next start.
:::

## Network and ports

| Port | Purpose | Default | Notes |
|------|---------|---------|-------|
| TCP 7557 | SDK control plane | `0.0.0.0:7557` | What SDK clients and the application side connect to |
| TCP 7447 | ROS 2 data plane | `127.0.0.1:7447` | Used only on the robot host or inside the motion stack |
| TCP 8787 | Local console | `0.0.0.0:8787` | Browser access; falls forward when taken |
| TCP 9997 / 8554 / 8889 / 8189 | Media services | Their defaults | Camera preview API, RTSP, WebRTC and ICE |

- When a port is taken, the port actually in use is written to `/run/fabot/ports.env`; `fabot status` shows the current port state.
- The control plane listens on `0.0.0.0` and has **no access control** by default. Keep the robot on a trusted network, or restrict which sources can reach 7557 at the network layer.
- Use explicit endpoints across hosts: write `Robot.connect("<robot address>", 7557)` on the SDK side and do not rely on discovery across subnets.
- `FABOT_ZENOHD_PORT` / `FABOT_RMW_ZENOHD_PORT` are only the **preferred** ports: when an unknown process holds one, the system does not exit — it falls forward to a free port and records it in `ports.env`. Remote SDK clients still connect to 7557, so when a field robot turns out to have moved, either free 7557 or make the caller pass the new port explicitly.

## Environment variables

These affect commands and units on the robot host, not SDK client configuration:

| Variable | Default | Effect |
|----------|---------|--------|
| `FABOT_ROOT` | `/opt/fiveages/fabot` | Product root. Written into the systemd units at install time; changing it later does not move an existing install |
| `FABOT_HOME` | `$FABOT_ROOT/data/config/current` | User configuration root |
| `OBS_ROOT` | `$FABOT_ROOT/data/obs` | Observation root: collector logs, freeze records, raw logs and bags |
| `FABOT_LOG_DIR` | `$OBS_ROOT/raw` | Where raw `stdout` / `stderr` are written, only with `FABOT_LOG_RAW_FILES` on |
| `FABOT_LOG_RAW_FILES` | off | Also keep the raw output of child processes |
| `FABOT_LOG_LEVEL` | `warn` | Log level: `debug` / `info` / `warn` / `error`; command-line flags win |
| `FABOT_CONSOLE_BIND` | `0.0.0.0:8787` | Console listen address |
| `FABOT_ZENOHD_PORT` | `7557` | Preferred control-plane port |
| `FABOT_RMW_ZENOHD_PORT` | `7447` | Preferred ROS data-plane port |
| `FABOT_UNIT_NAME` | `fabot.service` | Service unit the operations commands act on |

Console and service startup settings live in the systemd units. To change something like `FABOT_CONSOLE_BIND` you edit the unit, not just the current shell: change the unit file, run `systemctl daemon-reload`, and restart the unit.

## First-boot setup

After a fresh install or a machine swap, bring the robot to a usable state in this order. The console pages are described in [Robot System Operations & Local Console](../../usage/testing/robot-system.md).

### 1. Confirm the service runs

```console
$ fabot status
$ fabot doctor
```

When any `doctor` check fails, apply the command it prints before continuing.

### 2. Bind cameras

On the console's Robot page open **Camera settings** and give every camera slot its serial number:

- the page lists the devices enumerated on this machine; the selected serial number is written to that slot;
- the same camera cannot be bound to two slots;
- clearing the serial number unbinds the slot, so it stops claiming that USB camera;
- a slot with no serial number keeps its placeholder (`REPLACE_` prefix) and does not claim any device.

### 3. Pick the model and motion addresses

In the console, open the `fabot_ocs2` service detail and use **Motion settings** to pick the model and fill in device addresses:

- the model selects the kinematics description and preset; the options come from the model catalog installed on the robot;
- arm IP fields follow the model: single-IP models show one "arm IP", models with a controller per side show "left arm IP" / "right arm IP", and models that identify sides internally show no IP;
- the body CAN interface appears only when the model description declares it — models such as S2 hard-code `can0` and do not show it;
- the end-effector drive decides whether a serial port or an end-effector CAN interface is shown; `usb` / `usb_rs485` use a serial port, `usb_can` uses end-effector CAN.

Saved values take effect the next time motion control starts (the console toolbar's **Stop motion** → **Start motion**, or `fabot motion stop` / `fabot motion start`).

:::warning CAN and serial ports must exist beforehand
CAN interfaces must already be brought up by the system; the adapter only uses the interface and never sets the bitrate. Prefer stable names such as `/dev/serial/by-id/...` for serial ports, so a `/dev/ttyUSB0` does not point at a different device after USB re-enumeration.
:::

### 4. Verify with the self-test

The console's **Checks** page validates capability by capability: a small joint deflection and return, camera capture and frame rate, lift up and down, a short chassis move, light colour, screen and speaker output.

:::warning Checks move the robot
Checks drive joints, end effectors, the lift and the chassis, and may toggle GPIO. Make sure the area is clear before starting; when the e-stop is pressed the run aborts.
:::

## Exporting and importing configuration

The console's Robot page has **Export config** and **Import config** in the toolbar:

- export selects by category → module → config domain and writes a YAML file named with the robot id and date;
- import reads a file and overwrites only the selected domains; everything unselected keeps its current value;
- the export **excludes** enabled flags, capability bindings, `required` and deployment nodes — manage those through whole-robot configuration;
- writes are validated as a batch first; if one item fails, the import stops and the response lists what was already written.

The same operations from the application side use `robot.configuration.get()` / `apply()` and each slot's `edit_config()`, see [Configuration Management](../../usage/configuration/configuration.md).

## Logs and observations

```console
$ fabot logs -f                     # follow the fabot.service journal
$ fabot logs --unit fabot_ocs2      # read one unit's collector log
$ fabot obs status                  # per-unit usage, freeze records and quota
$ fabot obs export                  # package logs for a range
$ fabot obs clean                   # delete records past retention
```

- Collector logs live in `$OBS_ROOT/<unit>/<date>/log.jsonl`; raw `stdout` / `stderr` are written only with `FABOT_LOG_RAW_FILES` on.
- Do not look for product logs under `/var/log/fabot` or `/var/lib/fabot`; the current install layout does not use them.
- To read the same data from an application, use `robot.logs` and `robot.obs`, see [Logs, Metrics & Observability](../../usage/diagnostics/observability.md).

## After an upgrade

An upgrade keeps user configuration and writes a snapshot before it starts. Two things to watch afterwards:

1. **Renamed or removed settings**: `unexpected config field` in the log means the user copy still holds old keys. Delete the domain's file or use **Restore defaults** in the console; the next start rebuilds it from the current template.
2. **Something behaves badly**: use `fabot boot rollback` to return to the previous version; the configuration snapshot is restored with it, see [Installing & Upgrading the Robot System](./robot-system.md).

Reading run mode, health and faults happens on the SDK side, see [Status, Faults & Lifecycle](../../usage/data/status-faults.md).

## Next steps

- [Robot System Operations & Local Console](../../usage/testing/robot-system.md): the `fabot` command and console pages
- [Configuration Management](../../usage/configuration/configuration.md): SDK access to bindings and config domains
- [Platform Service Management](../../usage/configuration/services.md): starting, stopping and configuring services
- [Troubleshooting](../../troubleshooting.md): cannot connect, config load failures, motion control not starting
