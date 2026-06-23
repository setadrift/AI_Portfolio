#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
SLOT="${1:-}"
WORKTREE_ROOT="${AI_PORTFOLIO_WORKTREE_ROOT:-/Users/duncananderson/Desktop/worktrees}"
MAIN_REF="${AI_PORTFOLIO_MAIN_REF:-origin/main}"

usage() {
  echo "Usage: bash .codex/scripts/setup-worktree.sh slot-1"
  echo "Valid slots: slot-1, slot-2, slot-3, slot-4, slot-5"
}

if [[ ! "$SLOT" =~ ^slot-[1-5]$ ]]; then
  usage
  exit 1
fi

SLOT_PATH="$WORKTREE_ROOT/$SLOT"
BRANCH="worktree/$SLOT"

cd "$REPO_ROOT"

git fetch origin main
git worktree prune
mkdir -p "$WORKTREE_ROOT"

if git worktree list --porcelain | grep -Fxq "worktree $SLOT_PATH"; then
  echo "$SLOT is already registered at $SLOT_PATH"
  echo "Branch: $(git -C "$SLOT_PATH" symbolic-ref --short HEAD 2>/dev/null || echo detached)"
  exit 0
fi

if [[ -e "$SLOT_PATH" ]]; then
  echo "Refusing to overwrite existing path: $SLOT_PATH"
  exit 1
fi

if git show-ref --verify --quiet "refs/heads/$BRANCH"; then
  git worktree add "$SLOT_PATH" "$BRANCH"
else
  git worktree add -b "$BRANCH" "$SLOT_PATH" "$MAIN_REF"
fi

echo "Created $SLOT"
echo "Path: $SLOT_PATH"
echo "Branch: $BRANCH"
echo "Next: cd $SLOT_PATH && Codex"
