#!/usr/bin/env python3
"""Run an approval-gated Claude Fable second-opinion eval."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shlex
import sys
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_ENV_FILE = Path(".env.local")
DEFAULT_MODEL = "claude-fable-5"
DEFAULT_OUTPUT_DIR = Path(".tmp/fable-runs")
DEFAULT_SYSTEM_PROMPT = Path("prompts/fable/system/second-opinion-reviewer.md")
DEFAULT_TASK = "willowops-followup-prototype"
ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
ANTHROPIC_VERSION = "2023-06-01"

FABLE_INPUT_PRICE_PER_MTOK = 10.0
FABLE_OUTPUT_PRICE_PER_MTOK = 50.0


def _load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and key not in os.environ:
            os.environ[key] = value.strip().strip("'").strip('"')


def _read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def _estimate_tokens(text: str) -> int:
    # Conservative enough for approval previews without depending on a tokenizer.
    return max(1, int(len(text) / 3.5) + 1)


def _estimate_cost(input_tokens: int, output_tokens: int) -> float:
    input_cost = input_tokens / 1_000_000 * FABLE_INPUT_PRICE_PER_MTOK
    output_cost = output_tokens / 1_000_000 * FABLE_OUTPUT_PRICE_PER_MTOK
    return input_cost + output_cost


def _task_prompt_path(task: str) -> Path:
    return Path("prompts/fable/tasks") / f"{task}.md"


def _build_request_text(args: argparse.Namespace) -> tuple[str, Path, Path]:
    system_path = Path(args.system_prompt)
    task_path = _task_prompt_path(args.task)
    packet_path = Path(args.packet)
    missing = [path for path in (system_path, task_path, packet_path) if not path.is_file()]
    if missing:
        raise FileNotFoundError(
            "Required prompt/packet file missing: "
            + ", ".join(str(path) for path in missing)
        )

    request_text = "\n\n".join(
        [
            _read_text(system_path).strip(),
            _read_text(task_path).strip(),
            "## Evidence Packet",
            _read_text(packet_path).strip(),
        ]
    )
    return request_text, task_path, packet_path


def _approval_id(payload: dict[str, Any]) -> str:
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()[:16]


def _response_text(response: dict[str, Any]) -> str:
    chunks: list[str] = []
    for block in response.get("content", []):
        if block.get("type") == "text":
            chunks.append(str(block.get("text", "")))
    return "\n\n".join(chunk for chunk in chunks if chunk).strip()


def _post_anthropic(
    api_key: str, payload: dict[str, Any], timeout_seconds: int
) -> dict[str, Any]:
    request = Request(
        ANTHROPIC_MESSAGES_URL,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "x-api-key": api_key,
            "anthropic-version": ANTHROPIC_VERSION,
            "content-type": "application/json",
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=timeout_seconds) as response:
            return json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Anthropic API HTTP {exc.code}: {body}") from exc
    except URLError as exc:
        raise RuntimeError(f"Anthropic API request failed: {exc}") from exc


def _write_run_outputs(
    *,
    output_dir: Path,
    task: str,
    request_text: str,
    response: dict[str, Any],
    metadata: dict[str, Any],
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = dt.datetime.now(dt.UTC).strftime("%Y%m%dT%H%M%SZ")
    prefix = output_dir / f"{timestamp}-{task}"
    request_path = prefix.with_name(f"{prefix.name}-request.md")
    response_path = prefix.with_name(f"{prefix.name}-response.md")
    metadata_path = prefix.with_name(f"{prefix.name}-metadata.json")

    response_body = _response_text(response)
    request_path.write_text(request_text + "\n", encoding="utf-8")
    response_path.write_text(
        (response_body or "_No visible text returned._") + "\n",
        encoding="utf-8",
    )
    metadata_path.write_text(
        json.dumps(metadata, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    return response_path


def _shell_command_for_approved_run(args: argparse.Namespace, approval_id: str) -> str:
    parts = [
        "python3",
        "scripts/fable_eval.py",
        "--task",
        args.task,
        "--packet",
        args.packet,
        "--max-input-tokens",
        str(args.max_input_tokens),
        "--max-tokens",
        str(args.max_tokens),
        "--effort",
        args.effort,
        "--require-approved-run-id",
        approval_id,
    ]
    if args.model != DEFAULT_MODEL:
        parts.extend(["--model", args.model])
    if args.system_prompt != str(DEFAULT_SYSTEM_PROMPT):
        parts.extend(["--system-prompt", args.system_prompt])
    if args.env_file != str(DEFAULT_ENV_FILE):
        parts.extend(["--env-file", args.env_file])
    return " ".join(shlex.quote(part) for part in parts)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run a targeted Anthropic Claude Fable eval."
    )
    parser.add_argument("--task", default=DEFAULT_TASK)
    parser.add_argument("--packet", required=True)
    parser.add_argument("--system-prompt", default=str(DEFAULT_SYSTEM_PROMPT))
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--max-tokens", type=int, default=800)
    parser.add_argument("--max-input-tokens", type=int, default=3_000)
    parser.add_argument(
        "--effort",
        choices=("low", "medium", "high", "xhigh"),
        default="low",
        help="Fable output_config effort. Use low for budgeted second opinions.",
    )
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_FILE))
    parser.add_argument("--output-dir", default=str(DEFAULT_OUTPUT_DIR))
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--print-response", action="store_true")
    parser.add_argument(
        "--request-timeout-seconds",
        type=int,
        default=600,
        help="HTTP read timeout for the Anthropic request.",
    )
    parser.add_argument(
        "--require-approved-run-id",
        help="Approval id emitted by --dry-run. Required for real Anthropic calls.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    try:
        request_text, task_path, packet_path = _build_request_text(args)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 1

    estimated_input_tokens = _estimate_tokens(request_text)
    estimated_cost = _estimate_cost(estimated_input_tokens, args.max_tokens)
    payload = {
        "model": args.model,
        "max_tokens": args.max_tokens,
        "output_config": {"effort": args.effort},
        "messages": [{"role": "user", "content": request_text}],
    }
    approval_id = _approval_id(
        {
            "payload": payload,
            "task": args.task,
            "packet": str(packet_path),
            "max_input_tokens": args.max_input_tokens,
        }
    )

    print(f"Task: {args.task}")
    print(f"Packet: {packet_path}")
    print(f"Task prompt: {task_path}")
    print(f"Model: {args.model}")
    print(f"Effort: {args.effort}")
    print(f"Estimated input tokens: {estimated_input_tokens}")
    print(f"Max output tokens: {args.max_tokens}")
    print(f"Estimated max cost: ${estimated_cost:.4f}")
    print(f"Approval id: {approval_id}")
    print("No Anthropic request has been made for this packet yet.")

    if estimated_input_tokens > args.max_input_tokens:
        print(
            "Refusing to run: estimated input tokens exceed "
            f"--max-input-tokens ({args.max_input_tokens}).",
            file=sys.stderr,
        )
        return 2

    if args.dry_run:
        print("\nApproved-run command:")
        print(_shell_command_for_approved_run(args, approval_id))
        return 0

    if args.require_approved_run_id != approval_id:
        print(
            "Refusing to run: pass the exact --require-approved-run-id emitted "
            "by a reviewed --dry-run.",
            file=sys.stderr,
        )
        return 3

    _load_env_file(Path(args.env_file))
    api_key = os.environ.get("ANTHROPIC_API_KEY")
    if not api_key:
        print(
            "ANTHROPIC_API_KEY is not set. Add it to "
            f"{args.env_file} or export it in your shell.",
            file=sys.stderr,
        )
        return 1

    response = _post_anthropic(api_key, payload, args.request_timeout_seconds)
    response_body = _response_text(response)
    usage = response.get("usage", {})
    actual_input_tokens = int(usage.get("input_tokens") or 0)
    actual_output_tokens = int(usage.get("output_tokens") or 0)
    stop_reason = response.get("stop_reason")
    metadata = {
        "approval_id": approval_id,
        "model": args.model,
        "packet": str(packet_path),
        "task": args.task,
        "task_prompt": str(task_path),
        "estimated_input_tokens": estimated_input_tokens,
        "max_output_tokens": args.max_tokens,
        "effort": args.effort,
        "estimated_max_cost": estimated_cost,
        "actual_input_tokens": actual_input_tokens,
        "actual_output_tokens": actual_output_tokens,
        "actual_cost_estimate": _estimate_cost(actual_input_tokens, actual_output_tokens),
        "stop_reason": stop_reason,
        "stop_details": response.get("stop_details"),
        "content_block_types": [
            block.get("type") for block in response.get("content", [])
        ],
        "response_visible": bool(response_body),
        "anthropic_response_id": response.get("id"),
    }
    output_path = _write_run_outputs(
        output_dir=Path(args.output_dir),
        task=args.task,
        request_text=request_text,
        response=response,
        metadata=metadata,
    )
    print(f"Wrote Fable response: {output_path}")

    if not response_body:
        print("Fable returned no visible text.", file=sys.stderr)
        return 4
    if stop_reason != "end_turn":
        print(f"Fable stopped with non-final reason: {stop_reason}", file=sys.stderr)
        return 5
    if args.print_response:
        print(response_body)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
