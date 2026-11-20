---
title: Version Compatibility
status: draft
owner: fabot-core
updated: 2026-11-20
---

# Version Compatibility

The fabot SDK and the robot system are released under **the same product version scheme**, formatted as `MAJOR.MINOR.PATCH[-stage.N]` (e.g. `1.2.3`, `1.2.3-rc.1`). This page covers how to check both versions, how to read a release number, and what to watch when upgrading.

The product is still moving quickly and its interfaces and release rhythm have not fully settled, so **we do not currently commit to compatibility across versions**. Once that phase is behind us we will publish an explicit commitment — which versions are guaranteed to work together and what the upgrade path is — and update this page.

| Item | Baseline |
|------|----------|
| API version | `fabot/v1` |
| Python package | `fabot-sdk` (`requires-python >= 3.12`; depends on `flatbuffers`, `eclipse-zenoh`, `PyYAML`) |

:::note The installed SDK is authoritative
Interfaces, error codes, and behavior follow the installed `fabot-sdk` type hints and this documentation.
:::

## Version this documentation covers

This site (`main`) documents **1.1.0**. Compare it against `fabot.__version__` / `robot.sdk_version`; when they differ, the installed package wins.

The "latest" entry in the top-bar version dropdown comes from the site's `package.json` at build time, which is why it reads `v1.1.0(latest)`. `1.1.0` is a general release; builds carrying a `-dev` / `-alpha` / `-beta` / `-rc` suffix are pre-releases, meant for integration and validation work rather than production as-is.

## Reading a version number

A version number places this release on the product's timeline; for now it is not a signal of whether it works with another release:

| Digit | Means |
|-------|-------|
| MAJOR | The product's major line |
| MINOR | A feature increment within that line |
| PATCH | A revision on that feature set |

Pre-release stages order as `dev` < `alpha` < `beta` < `rc` < final release; within a stage the trailing number increases, so `1.1.0-alpha.1` < `1.1.0-alpha.2`.

For what changed in each release, see the [Changelog](../../changelog.md).

## Checking Both Versions

```python
import fabot
from fabot import Robot

print(fabot.__version__)      # Local SDK version

with Robot.connect("127.0.0.1", 7557) as robot:
    print(robot.sdk_version)  # Same as above: local SDK version
    print(robot.version())    # Remote robot platform version
```

- `fabot.__version__` and `robot.sdk_version` report the SDK version installed on **your machine**;
- `robot.version()` queries the **robot-side** platform version and requires an established connection — see [Connection & the Robot Entry Point](../../usage/basics/connection.md).

:::note 0.0.0 is a sentinel version
`0.0.0` marks a test build that did not go through the formal release process; do not use it in production. `Robot.mock().version()` also returns `"0.0.0"` by default (see [Mock Testing](../../usage/testing/mock.md)).
:::

## Pairing Rules

- **Matched versions are recommended**: the SDK and the robot system are released under one product version number, and the matched pair is the combination our testing mainly covers.
- **Mixed versions are yours to validate**: at this stage we do not judge whether an unmatched pair works, and you may hit missing interfaces or behavioral differences. Validate thoroughly in a test environment before going live.
- **When a connection is refused**: if the wire protocol does not line up, connecting or calling fails with `ProtocolIncompatible` (see [Error Handling](../../usage/diagnostics/errors.md)). That is the runtime outcome, not a statement about any other combination.

## eclipse-zenoh Versions Must Match

The SDK pins `eclipse-zenoh` exactly (currently `==1.6.2`) to the **same version family** as the robot-side control plane — a hard prerequisite for communication to work:

- Do not manually upgrade or downgrade `eclipse-zenoh` in your environment; follow the dependency declared by `fabot-sdk`;
- A zenoh version-family mismatch between the SDK and the robot causes connection failures — see [Troubleshooting](../../troubleshooting.md).

Among the other dependencies, `flatbuffers` is likewise pinned exactly while `PyYAML` is unpinned — see the dependency table in [Installing the Python SDK](./python.md).

## Error Text Catalogs Ship as an SDK Snapshot

The localized log / error / fault texts in `Catalogs` are a snapshot embedded at the SDK's release version. If the robot system is updated while the SDK is not, newly added error codes or faults are still reported correctly; they simply have no catalog entry yet and fall back to the raw ID. Upgrading the SDK brings the latest texts. See [Localized Text (Catalogs)](../../usage/diagnostics/catalogs.md) for usage.

## Upgrade Steps

1. After upgrading the robot system, move the SDK to the same version: reinstall from the wheel shipped with the new release (see [Installing the Python SDK](./python.md)). The robot-side upgrade procedure is in [Installing & Upgrading the Robot System](./robot-system.md).
2. Verify both sides match with `fabot.__version__` and `robot.version()`.
3. Run your key flows (connect, `wait_ready`, core capability calls) in a test environment before switching production over.

## Next Steps

- [Requirements](./requirements.md): OS, architecture, Python, and network conditions
- [Installing the Python SDK](./python.md): wheel installation and dependency notes
- [Installing & Upgrading the Robot System](./robot-system.md): installing, upgrading and rolling back the robot-side software
- [Error Handling](../../usage/diagnostics/errors.md): error categories, `ProtocolIncompatible`, and retry strategy
- [Troubleshooting](../../troubleshooting.md): diagnosing connection failures and related issues
