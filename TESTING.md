# Testing Guide

## Purpose
This file tracks manual test cases for gameplay UI and room flow.

## Test Environment
- Entry page: `index.html`
- Test room code: `1110408`
- Join path: Front page -> `Join` -> input room code

## Control Mapping (For Testers)
- `Tab`: Switch active control between `Player1` and `Player2` (only in 2-player room)
- `Left` / `Right`: Select left or right role for the currently active player
- `E`: Confirm ready for the currently active player
- `X`: Cancel current player's ready/selection
- `Esc`: Return to front page

### How to Operate Player2
1. Join room code `1110408`.
2. Press `Tab` once to switch active control to `Player2`.
3. Use `Left` / `Right` to choose Player2 role.
4. Press `E` to set Player2 ready.

## Current Manual Test Cases

### TC-001 Play (single player)
1. Open front page.
2. Click `Play`.
3. Verify only `Player1` is shown in center status.
4. Verify `Player2` center status is hidden.

Expected:
- Scene opens to character select.
- Player2 is not joined.

### TC-002 Join test room (two players)
1. Open front page.
2. Click `Join`.
3. Input `1110408`.

Expected:
- Scene opens to character select.
- Player2 is joined immediately.
- Room code text shows on bottom-right as `CODE:1110408`.

### TC-003 Invalid room code
1. Open front page.
2. Click `Join`.
3. Input any code except `1110408`.

Expected:
- Alert shows `Invalid room code.`
- Stay on front page.

### TC-004 Duplicate role block
1. Enter two-player room (`1110408`).
2. Player1 selects left or right role.
3. Switch to Player2 (`Tab`) and try selecting the same role.

Expected:
- Selection is blocked.
- Hint text shows `This role is already selected`.

### TC-005 Selection and ready
1. Player1 selects role using `Left` or `Right`.
2. Press `E` to ready.
3. Press `X` to cancel.

Expected:
- `E` sets ready.
- `X` clears ready and selection.

### TC-006 Player2 control flow
1. Enter two-player room (`1110408`).
2. Press `Tab` to control `Player2`.
3. Use `Left` / `Right` to select role.
4. Press `E` to set ready.
5. Press `Tab` to return to `Player1`.

Expected:
- Player2 role tag appears above chosen role.
- Player2 status updates to `Player2 (Ready)` after `E`.
- Control can switch back to Player1 with `Tab`.

## Notes
- Add new test cases here whenever features are added.
- Keep test IDs stable so regressions can be tracked.
