---
title: Version Compatibility
status: draft
owner: fabot-core
updated: 2026-09-04
---

# Version Compatibility

The fabot SDK and the robot platform (the control-plane software running on the robot) are released under **the same product version scheme**, formatted as `MAJOR.MINOR.PATCH[-stage.N]` (e.g. `1.2.3`, `1.2.3-rc.1`). This page explains the version pairing rules between the SDK and the robot platform, plus upgrade notes.

| Item | Baseline |
|------|----------|
| API version | `fabot/v1` |
| Python package | `fabot-sdk` (`requires-python >= 3.12`; depends on `flatbuffers`, `eclipse-zenoh`, `PyYAML`) |

:::note The installed SDK is authoritative
Interfaces, error codes, and behavior follow the installed `fabot-sdk` type hints and this documentation.
:::

## Version Number Semantics

| Digit | Incremented when | Compatibility meaning |
|-------|------------------|-----------------------|
| MAJOR | The public API changes incompatibly | No compatibility guarantee across MAJOR versions |
| MINOR | Backward-compatible features or interfaces are added | Older clients keep working |
| PATCH | Bug fixes only, no behavior change | Fully compatible |

Pre-release stages order as `dev` < `alpha` < `beta` < `rc` < final release.

## Checking Both Versions

```python
import fabot
from fabot import Robot

print(fabot.__version__)      # Local SDK version

with Robot.connect("192.168.1.10", 7557) as robot:
    print(robot.sdk_version)  # Same as above: local SDK version
    print(robot.version())    # Remote robot platform version
```

- `fabot.__version__` and `robot.sdk_version` report the SDK version installed on **your machine**;
- `robot.version()` queries the **robot-side** platform version and requires an established connection — see [Connection & the Robot Entry Point](../usage/connection.md).

:::note 0.0.0 is a sentinel version
`0.0.0` marks a test build that did not go through the formal release process; do not use it in production. `Robot.mock().version()` also returns `"0.0.0"` by default (see [Mock Testing](../usage/mock.md)).
:::

## Pairing Rules

- **Same version recommended**: running the SDK and the robot platform at the same release version is the only fully validated combination.
- **Mismatched versions within the same MAJOR**: by the version semantics above, MINOR / PATCH differences are backward compatible and generally work, but they are outside the fully validated matrix — for example, interfaces newly added on the SDK side may be unavailable on an older robot. After upgrading either side in production, validate the setup yourself.
- **Across MAJOR versions**: no compatibility guarantee. When the wire protocol is incompatible, connecting or calling fails with a `ProtocolIncompatible` error (see [Error Handling](../usage/errors.md)).

## eclipse-zenoh Versions Must Match

The SDK pins `eclipse-zenoh` exactly (currently `==1.6.2`) to the **same version family** as the robot-side control plane — a hard prerequisite for communication to work:

- Do not manually upgrade or downgrade `eclipse-zenoh` in your environment; follow the dependency declared by `fabot-sdk`;
- A zenoh version-family mismatch between the SDK and the robot causes connection failures — see [Troubleshooting](../troubleshooting.md).

Among the other dependencies, `flatbuffers` is likewise pinned exactly while `PyYAML` is unpinned — see the dependency table in [Installing the Python SDK](python.md).

## Error Text Catalogs Ship as an SDK Snapshot

The localized log / error / fault texts in `Catalogs` are a snapshot embedded at the SDK's release version. If the robot platform is updated while the SDK is not, newly added error codes or faults are still reported correctly; they simply have no catalog entry yet and fall back to the raw ID. Upgrading the SDK brings the latest texts. See [Error Handling](../usage/errors.md) for usage.

## Upgrade Steps

1. After upgrading the robot platform, upgrade the SDK to the same version: reinstall from the wheel shipped with the new release (see [Installing the Python SDK](python.md)).
2. Verify both sides match with `fabot.__version__` and `robot.version()`.
3. Run your key flows (connect, `wait_ready`, core capability calls) in a test environment before switching production over.

## Next Steps

- [Requirements](requirements.md): OS, architecture, Python, and network conditions
- [Installing the Python SDK](python.md): wheel installation and dependency notes
- [Error Handling](../usage/errors.md): error categories, `ProtocolIncompatible`, and retry strategy
- [Troubleshooting](../troubleshooting.md): diagnosing connection failures and related issues
