---
name: park
description: "Commit current work and stay on branch for batching multiple tasks into one PR. USE WHEN user says /park, 'park this', 'commit but don't push', or 'save progress'."
allowed-tools:
  - Bash
  - Read
user-invocable: true
---

# /park

Commit current work without pushing. Stays on the same branch so you can continue with another task and ship everything as one PR via `/finish-feature`.

## Steps

1. **Verify not on main** (`git branch --show-current`). If on main, STOP.
2. **Check for changes**: `git status --porcelain`. If clean, tell user nothing to park.
3. **Stage files**: Stage specific files by name (never `git add -A`). Skip secrets.
4. **Commit**: Conventional commit message. Include `Co-Authored-By: Claude <noreply@anthropic.com>`.
5. **Confirm**: Print what was committed and remind user they can continue working on this branch or `/finish-feature` to ship.
