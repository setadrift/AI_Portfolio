#!/usr/bin/env bash
# setup-worktree.sh -- Initialize a git worktree slot for isolated Claude Code sessions
#
# Usage:
#   bash .claude/scripts/setup-worktree.sh <slot-name>
#   e.g. bash .claude/scripts/setup-worktree.sh slot-1
#
# Run from the primary repo root.

set -euo pipefail

SLOT_NAME="${1:?Usage: setup-worktree.sh <slot-name>}"
PRIMARY_REPO="$(cd "$(dirname "$0")/../.." && pwd)"
WORKTREE_BASE="$(dirname "$PRIMARY_REPO")/worktrees"
WORKTREE_DIR="$WORKTREE_BASE/$SLOT_NAME"

echo "Primary repo:  $PRIMARY_REPO"
echo "Worktree slot: $WORKTREE_DIR"
echo ""

# 1. Create the worktree
if [ -d "$WORKTREE_DIR" ]; then
    echo "Worktree directory already exists at $WORKTREE_DIR"
    echo "To recreate, first run: git worktree remove $WORKTREE_DIR"
    exit 1
fi

mkdir -p "$WORKTREE_BASE"
echo "[1/4] Creating git worktree at origin/main (detached)..."
git fetch origin main
git worktree add --detach "$WORKTREE_DIR" origin/main
echo "  Done."

# 2. Symlink environment files
echo "[2/4] Symlinking environment files..."
for envfile in .env.local .env; do
    if [ -f "$PRIMARY_REPO/$envfile" ]; then
        ln -sf "$PRIMARY_REPO/$envfile" "$WORKTREE_DIR/$envfile"
        echo "  $envfile -> symlinked"
    fi
done
echo "  Done."

# 3. Install dependencies
echo "[3/4] Installing dependencies..."
cd "$WORKTREE_DIR"
if [ -f "package.json" ]; then
    npm install --silent
    echo "  npm install done."
fi
cd "$PRIMARY_REPO"
echo "  Done."

# 4. Update Claude settings to allow the worktree path
echo "[4/4] Setting up Claude settings..."
SETTINGS_SRC="$PRIMARY_REPO/.claude/settings.local.json"
if [ -f "$SETTINGS_SRC" ]; then
    python3 -c "
import json
with open('$SETTINGS_SRC') as f:
    settings = json.load(f)
worktree_path = '$WORKTREE_DIR/**'
paths = settings.get('allowedPaths', [])
if worktree_path not in paths:
    paths.append(worktree_path)
    settings['allowedPaths'] = paths
with open('$SETTINGS_SRC', 'w') as f:
    json.dump(settings, f, indent=2)
    f.write('\n')
print(f'  Added {worktree_path} to allowedPaths')
"
else
    echo "  No settings.local.json found, skipping."
fi

echo ""
echo "Worktree '$SLOT_NAME' is ready."
echo ""
echo "Usage:"
echo "  cd $WORKTREE_DIR && claude"
echo "  /start-feature <description>"
