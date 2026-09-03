---
title: Version Compatibility
status: draft
owner: fabot-core
updated: 2026-09-03
---

# Version Compatibility

| Item | Baseline |
|------|----------|
| API version | `fabot/v1` |
| Python package | `fabot-sdk` (`requires-python >= 3.12`; depends on `flatbuffers`, `eclipse-zenoh`, `PyYAML`) |

!!! note "The installed SDK is authoritative"
    Interfaces, error codes, and behavior follow the installed `fabot-sdk` type hints and this documentation.
