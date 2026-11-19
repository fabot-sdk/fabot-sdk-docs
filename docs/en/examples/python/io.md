---
title: IO example
status: draft
owner: fabot-core
updated: 2026-11-17
---

# IO example

Acquire a GPIO line, write a level, then read it back. The API is in [IO](../../reference/python/io.md).

A line is identified by a chip plus a line offset, so first look at what the machine has:

```python
from fabot import Robot
from fabot.capabilities.io import PinDirection

with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready(["io"])

    for chip in robot.io.chips().chips:
        print(chip.name, chip.label, len(chip.lines))
```

With the chip label and line offset in hand, run the acquire → read/write → release cycle:

```python
with Robot.connect("127.0.0.1", 7557) as robot:
    robot.wait_ready(["io"])

    robot.io.acquire(
        chip="tegra264-gpio",
        line=17,
        direction=PinDirection.OUTPUT,
        value=False,
    )
    try:
        applied = robot.io.set_level(chip="tegra264-gpio", line=17, value=True)
        print("write:", applied.outcome.success, applied.value)

        level = robot.io.get_level(chip="tegra264-gpio", line=17)
        print("read back:", level.value)
    finally:
        robot.io.release(chip="tegra264-gpio", line=17)
```

## Reading an external input

A line acquired as `PinDirection.INPUT` is read only with `get_level`, never with `set_level`:

```python
robot.io.acquire(
    chip="tegra264-gpio",
    line=18,
    direction=PinDirection.INPUT,
    value=False,
)
try:
    print(robot.io.get_level(chip="tegra264-gpio", line=18).value)
finally:
    robot.io.release(chip="tegra264-gpio", line=18)
```

`value` is ignored for `INPUT`, but the signature still requires it — pass `False`.

## Finding a free line

In `chips()`, an empty `consumer` means nobody holds the line right now, and `name` is the kernel's line name, which usually says what is wired to it:

```python
for chip in robot.io.chips().chips:
    for line in chip.lines:
        if not line.consumer:
            print(chip.label or chip.name, line.line, line.name)
```

Notes:

- Repeating `acquire` on the same line with the same direction is idempotent and does not rewrite the level already driven; changing direction requires `release` first.
- Calling `set_level` / `get_level` on a line that is not acquired raises `FabotError` (`NotSupported`) rather than returning a response with `outcome.success == False`. Use `try/except` to tell "rejected" from "failed"; see [Error Handling](../../usage/diagnostics/errors.md).
- `PinDirection.UNKNOWN` is not a legal command value and is rejected.
- `chip` matches the label first; chips without a label are addressed by device name such as `gpiochipN`. The line number is an **offset inside the chip**, not a global pin number, and `17` / `18` above are examples only.
