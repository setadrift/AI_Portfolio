#!/usr/bin/env python3
"""Build a compact local evidence packet for a Fable second-opinion run."""

from __future__ import annotations

import argparse
import datetime as dt
from pathlib import Path
import re
import sys


DEFAULT_OUTPUT_DIR = Path(".tmp/fable-packets")
SECRET_PATTERNS = (
    re.compile(r"sk-ant-[A-Za-z0-9_-]+"),
    re.compile(r"ANTHROPIC_API_KEY\s*="),
    re.compile(r"OPENAI_API_KEY\s*="),
    re.compile(r"SUPABASE_SERVICE_ROLE_KEY\s*="),
    re.compile(r"STRIPE_SECRET_KEY\s*="),
    re.compile(r"BLOB_READ_WRITE_TOKEN\s*="),
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----"),
)


def _estimate_tokens(text: str) -> int:
    return max(1, int(len(text) / 3.5) + 1)


def _parse_source(value: str) -> tuple[Path, int | None, int | None]:
    parts = value.rsplit(":", 2)
    if len(parts) == 3 and parts[1].isdigit() and parts[2].isdigit():
        return Path(parts[0]), int(parts[1]), int(parts[2])
    if len(parts) == 2 and parts[1].isdigit():
        return Path(parts[0]), int(parts[1]), int(parts[1])
    return Path(value), None, None


def _read_source_snippet(path: Path, start: int | None, end: int | None) -> str:
    if not path.is_file():
        raise FileNotFoundError(f"Source file not found: {path}")
    lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
    if start is None or end is None:
        start = 1
        end = len(lines)
    if start < 1 or end < start:
        raise ValueError(f"Invalid source range for {path}: {start}:{end}")
    selected = lines[start - 1 : end]
    return "\n".join(f"{idx:>5} {line}" for idx, line in enumerate(selected, start))


def _secret_scan(text: str) -> list[str]:
    return [pattern.pattern for pattern in SECRET_PATTERNS if pattern.search(text)]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a Fable evidence packet.")
    parser.add_argument("--task", required=True)
    parser.add_argument("--title", required=True)
    parser.add_argument(
        "--question",
        required=True,
        help="The exact decision question Fable should answer.",
    )
    parser.add_argument(
        "--source",
        action="append",
        default=[],
        help="Source snippet as path:start:end. Repeatable.",
    )
    parser.add_argument(
        "--note",
        action="append",
        default=[],
        help="Short evidence note, unknown, or local review summary. Repeatable.",
    )
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument(
        "--max-estimated-tokens",
        type=int,
        default=2_400,
        help="Fail if the packet itself exceeds this estimate.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    sections = [
        f"# {args.title}",
        "",
        f"- task: `{args.task}`",
        f"- generated_at_utc: `{dt.datetime.now(dt.UTC).isoformat()}`",
        "",
        "## Decision Question",
        args.question.strip(),
        "",
    ]

    if args.note:
        sections.extend(["## Evidence Notes", ""])
        sections.extend(f"- {note.strip()}" for note in args.note)
        sections.append("")

    if args.source:
        sections.extend(["## Source Snippets", ""])
        for raw_source in args.source:
            path, start, end = _parse_source(raw_source)
            try:
                snippet = _read_source_snippet(path, start, end)
            except (FileNotFoundError, ValueError) as exc:
                print(str(exc), file=sys.stderr)
                return 1
            label = f"{path}:{start}-{end}" if start is not None and end is not None else str(path)
            sections.extend([f"### {label}", "```text", snippet, "```", ""])

    packet = "\n".join(sections).rstrip() + "\n"
    secret_hits = _secret_scan(packet)
    if secret_hits:
        print(
            "Refusing to write packet: possible secret pattern(s) found: "
            + ", ".join(secret_hits),
            file=sys.stderr,
        )
        return 2

    estimated_tokens = _estimate_tokens(packet)
    if estimated_tokens > args.max_estimated_tokens:
        print(
            "Refusing to write packet: estimated packet tokens "
            f"{estimated_tokens} exceed {args.max_estimated_tokens}.",
            file=sys.stderr,
        )
        return 3

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    output_path = output_dir / f"{timestamp}-{args.task}.md"
    output_path.write_text(packet, encoding="utf-8")
    print(f"Wrote packet: {output_path}")
    print(f"Estimated packet tokens: {estimated_tokens}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
