#!/usr/bin/env python3
"""Smoke-check that calls used in the docs exist on the installed SDK.

Usage:
    python3 scripts/check-doc-api.py [--sdk PATH] [--lang zh|en|all]

With no --sdk the newest of these paths that exists is used:
  1. ../fabot_system/build/amd64/colcon/fabot_sdk_py/generated/client_install
  2. ../fabot_system/build/amd64/prefix/fabot_sdk_py/lib/python3.12/site-packages
  3. an already importable `fabot` package

It extracts `robot.<name>(`, `robot.<slot>.<method>(`, `robot.<ns>.<name>.<method>(`
(e.g. `robot.skills.camera_sync.get_sync_groups(`) and headings, then checks them
against a `Robot.mock()`.
Exit code 1 when something is missing. Intentionally permissive: it only proves a
name exists, not that the arguments are right.
"""

from __future__ import annotations

import argparse
import glob
import os
import re
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent

CANDIDATE_SDKS = [
    REPO.parent / "fabot_system/build/amd64/colcon/fabot_sdk_py/generated/client_install",
    REPO.parent
    / "fabot_system/build/amd64/prefix/fabot_sdk_py/lib/python3.12/site-packages",
]

CALL_PATTERNS = [
    re.compile(r"robot\.([a-z_][a-z0-9_]*)\s*\("),
    re.compile(r"robot\.([a-z_][a-z0-9_]*)\.([a-z_][a-z0-9_]*)\s*\("),
    # Namespaced entries outside the slot system: robot.skills.<name>.<method>(
    re.compile(
        r"robot\.(skills|services|environments)\.([a-z_][a-z0-9_]*)\."
        r"([A-Za-z_][A-Za-z0-9_]*)\s*\("
    ),
]
HEADING = re.compile(r"^### ([a-z_][a-z0-9_]*)$", re.M)

# Names that are documented as events/channels entries rather than proxy methods,
# plus dict-like members used in examples.
EVENT_SUFFIXES = ("_changed", "_detected")


def resolve_sdk(explicit: str | None) -> str | None:
    if explicit:
        return explicit
    for candidate in CANDIDATE_SDKS:
        if (candidate / "fabot").is_dir():
            return str(candidate)
    return None


def collect(lang: str) -> set[tuple[str, str, str]]:
    pages = glob.glob(str(REPO / "docs" / lang / "**/*.md"), recursive=True)
    found: set[tuple[str, str, str]] = set()
    for page in pages:
        # Migration pages deliberately contain 1.0.x snippets.
        if "migration-1.0-to-1.1" in page:
            continue
        text = Path(page).read_text(encoding="utf-8")
        rel = Path(page).relative_to(REPO / "docs" / lang).as_posix()
        for pattern in CALL_PATTERNS:
            for match in pattern.finditer(text):
                groups = match.groups()
                if len(groups) == 1:
                    found.add(("Robot", match.group(1), rel))
                elif len(groups) == 2:
                    found.add((match.group(1), match.group(2), rel))
                else:
                    ns, entity, name = groups
                    found.add((f"{ns}.{entity}", name, rel))
        for heading in HEADING.findall(text):
            found.add(("<heading>", heading, rel))
    return found


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--sdk", default=None, help="directory containing the fabot package")
    parser.add_argument("--lang", default="all", choices=("zh", "en", "all"))
    args = parser.parse_args()

    sdk = resolve_sdk(args.sdk)
    if sdk:
        sys.path.insert(0, sdk)
    try:
        from fabot import Robot  # noqa: PLC0415
    except ImportError:
        print("cannot import fabot; pass --sdk or build the SDK first", file=sys.stderr)
        return 2

    robot = Robot.mock()
    robot_attrs = set(dir(robot))
    proxy_attrs = {slot: set(dir(proxy)) for slot, proxy in robot.slots.items()}
    # Non-capability namespaces documented with their own headings.
    from fabot import Catalogs, FrameSystem  # noqa: PLC0415

    extra_attrs = {
        "frames": set(dir(FrameSystem)) | {"set_tool", "apply_calibration", "scoped_frame"},
        "catalogs": set(dir(Catalogs)) | set(dir(Catalogs.load("en"))),
    }
    for attrs in extra_attrs.values():
        proxy_attrs["<extra>"] = proxy_attrs.get("<extra>", set()) | attrs

    # Namespaced entries outside the slot system.
    ns_attrs = {
        f"skills.{name}": set(dir(proxy))
        for name, proxy in vars(robot.skills).items()
        if not name.startswith("_")
    }
    ns_attrs.update(
        {
            f"services.{name}": set(dir(handle))
            for name, handle in vars(robot.services).items()
            if not name.startswith("_")
        }
    )
    ns_attrs.update(
        {
            f"environments.{name}": set(dir(handle))
            for name, handle in vars(robot.environments).items()
            if not name.startswith("_")
        }
    )

    langs = ("zh", "en") if args.lang == "all" else (args.lang,)
    problems: list[str] = []
    for lang in langs:
        for slot, name, rel in sorted(collect(lang)):
            if slot == "Robot":
                if name not in robot_attrs:
                    problems.append(f"[{lang}] robot.{name}")
            elif slot == "<heading>":
                if (
                    name not in robot_attrs
                    and name not in {"slots", "estop", "events", "logs", "metrics", "frames"}
                    and name not in {"configuration", "connection", "services", "skills"}
                    and name not in {"obs", "environments"}
                    and not name.endswith(EVENT_SUFFIXES)
                    and not any(name in attrs for attrs in proxy_attrs.values())
                    and not any(name in attrs for attrs in ns_attrs.values())
                    and name not in {"lookup", "lookup_full", "can_transform", "wait_for_transform"}
                ):
                    problems.append(f"[{lang}] heading '{name}' matches no proxy member")
            elif slot in proxy_attrs:
                if name not in proxy_attrs[slot] and not name.endswith(EVENT_SUFFIXES):
                    problems.append(f"[{lang}] robot.{slot}.{name}")
            elif slot in ns_attrs:
                if name not in ns_attrs[slot] and not name.endswith(EVENT_SUFFIXES):
                    problems.append(f"[{lang}] robot.{slot}.{name}")

    if problems:
        print(f"{len(problems)} unresolved API references:")
        for item in problems:
            print("  " + item)
        return 1
    print("all documented API references resolve")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
