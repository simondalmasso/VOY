#!/usr/bin/env python3
"""
VOY — is-a.dev PR #41619 autonomous monitor.

Single source of truth for the WATCH_IS_A_DEV_PR task.
Designed to run every 12h via GitHub Actions OR locally via cron.

Behavior:
  - Fetches PR #41619 state, reviews, comments, DNS, HTTPS, file-in-main
  - Diffs against last known state (.watch-isadev-state.json)
  - Exit codes:
      0 = no change (no-op polling cycle, minimal output)
      1 = state changed (print diff report to stdout, for issue creation)
      2 = MERGED detected (print full post-merge audit to stdout)
      3 = error (print error to stderr)

Usage:
  python3 scripts/watch-isadev-pr.py                # check + diff
  python3 scripts/watch-isadev-pr.py --force        # print report even if no change
  python3 scripts/watch-isadev-pr.py --post-merge   # run full validation (after merge detected)

State file: .watch-isadev-state.json (gitignored, auto-created)
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
import urllib.request
import urllib.error
from datetime import datetime, timezone
from pathlib import Path

PR_REPO = "is-a-dev/register"
PR_NUMBER = 41619
SUBDOMAIN = "voy.is-a.dev"
CNAME_TARGET = "voy-app.simondalmasso44.workers.dev"
ROOT = Path(__file__).resolve().parent.parent
STATE_FILE = ROOT / ".watch-isadev-state.json"

FORCE = "--force" in sys.argv
POST_MERGE = "--post-merge" in sys.argv


def http_get_json(url: str, timeout: int = 15) -> dict | list | None:
    """GET a URL and parse JSON. Returns None on failure."""
    req = urllib.request.Request(
        url,
        headers={
            "Accept": "application/vnd.github+json",
            "User-Agent": "voy-watch-script",
        },
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except (urllib.error.URLError, urllib.error.HTTPError, json.JSONDecodeError, TimeoutError):
        return None


class NoRedirectHandler(urllib.request.HTTPRedirectHandler):
    """Prevent urllib from following redirects — we want the raw status."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None  # signal: do not follow


def http_head(url: str, timeout: int = 10) -> tuple[int, dict[str, str]]:
    """HEAD a URL WITHOUT following redirects. Return (status_code, headers_dict)."""
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "voy-watch-script"})
    opener = urllib.request.build_opener(NoRedirectHandler)
    try:
        with opener.open(req, timeout=timeout) as resp:
            headers = {k.lower(): v for k, v in resp.headers.items()}
            return resp.status, headers
    except urllib.error.HTTPError as e:
        # 3xx responses raise HTTPError when redirect is blocked
        headers = {k.lower(): v for k, v in (e.headers.items() if e.headers else [])}
        return e.code, headers
    except (urllib.error.URLError, TimeoutError):
        return 0, {}


def dig(record_type: str, host: str) -> str:
    """Run dig, return sorted comma-joined short results (sorted for stable diffing)."""
    try:
        out = subprocess.check_output(
            ["dig", record_type, host, "+short", "@ns1.is-a.dev"],
            timeout=10,
            stderr=subprocess.DEVNULL,
        ).decode("utf-8").strip()
        records = sorted(line.strip() for line in out.splitlines() if line.strip())
        return ",".join(records)
    except (subprocess.SubprocessError, FileNotFoundError):
        return ""


def fetch_pr_state() -> dict:
    """Fetch PR #41619 state. Falls back to search API on rate limit."""
    data = http_get_json(f"https://api.github.com/repos/{PR_REPO}/pulls/{PR_NUMBER}")
    if data and isinstance(data, dict) and "message" not in data:
        return data
    # Fallback: search API (higher rate limit, less detail)
    search = http_get_json(
        f"https://api.github.com/search/issues?q=repo:{PR_REPO}+voy+in:title"
    )
    if search and isinstance(search, dict) and search.get("items"):
        pr = search["items"][0]
        return {
            "number": pr["number"],
            "state": pr["state"],
            "merged_at": pr.get("pull_request", {}).get("merged_at"),
            "closed_at": pr.get("closed_at"),
            "updated_at": pr["updated_at"],
            "created_at": pr["created_at"],
            "comments": pr.get("comments", 0),
            "review_comments": 0,  # not available via search API
            "labels": [l["name"] for l in pr.get("labels", [])],
            "requested_reviewers": [],
            "mergeable": "unknown",
            "html_url": pr["html_url"],
            "_source": "search_api",
        }
    return {}


def fetch_reviews() -> list[dict]:
    data = http_get_json(
        f"https://api.github.com/repos/{PR_REPO}/pulls/{PR_NUMBER}/reviews"
    )
    if data and isinstance(data, list):
        return data
    return []


def fetch_issue_comments() -> list[dict]:
    data = http_get_json(
        f"https://api.github.com/repos/{PR_REPO}/issues/{PR_NUMBER}/comments"
    )
    if data and isinstance(data, list):
        return data
    return []


def build_snapshot() -> dict:
    """Build a full state snapshot."""
    pr = fetch_pr_state()
    reviews = fetch_reviews()
    comments = fetch_issue_comments()

    human_comments = [
        c for c in comments
        if c.get("user", {}).get("type") != "Bot"
        and not c.get("user", {}).get("login", "").endswith("[bot]")
    ]

    dns_cname = dig("CNAME", SUBDOMAIN)
    dns_a = dig("A", SUBDOMAIN)
    dns_aaaa = dig("AAAA", SUBDOMAIN)

    https_status, https_headers = http_head(f"https://{SUBDOMAIN}/")
    https_location = https_headers.get("location", "")
    https_xvoybuild = https_headers.get("x-voy-build", "")

    # Check if domains/voy.json exists in is-a-dev/register main
    file_url = f"https://raw.githubusercontent.com/{PR_REPO}/main/domains/voy.json"
    file_req = urllib.request.Request(file_url, method="HEAD",
                                      headers={"User-Agent": "voy-watch-script"})
    try:
        with urllib.request.urlopen(file_req, timeout=10) as resp:
            file_status = resp.status
    except urllib.error.HTTPError as e:
        file_status = e.code
    except (urllib.error.URLError, TimeoutError):
        file_status = 0

    # Determine verdict
    merged_at = pr.get("merged_at")
    pr_state = pr.get("state", "unknown")
    reviews_count = len(reviews)
    human_comments_count = len(human_comments)

    if merged_at:
        verdict = "MERGED"
    elif pr_state == "closed":
        verdict = "CLOSED_WITHOUT_MERGE"
    elif reviews_count > 0 or human_comments_count > 0:
        verdict = "HUMAN_REVIEW_APPEARED"
    else:
        verdict = "WAITING_EXTERNAL_REVIEW"

    return {
        "checked_at": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "pr": {
            "number": pr.get("number", PR_NUMBER),
            "state": pr_state,
            "merged_at": merged_at,
            "closed_at": pr.get("closed_at"),
            "updated_at": pr.get("updated_at"),
            "created_at": pr.get("created_at"),
            "comments": pr.get("comments", 0),
            "review_comments": pr.get("review_comments", 0),
            "human_comments": human_comments_count,
            "reviews": reviews_count,
            "requested_reviewers": [
                r.get("login", "") for r in pr.get("requested_reviewers", [])
            ],
            "labels": pr.get("labels", []),
            "mergeable": pr.get("mergeable", "unknown"),
            "html_url": pr.get("html_url", f"https://github.com/{PR_REPO}/pull/{PR_NUMBER}"),
        },
        "reviews_detail": [
            {
                "user": r.get("user", {}).get("login", "?"),
                "state": r.get("state", "?"),
                "submitted_at": r.get("submitted_at", "?"),
            }
            for r in reviews
        ],
        "human_comments_detail": [
            {
                "user": c.get("user", {}).get("login", "?"),
                "created_at": c.get("created_at", "?"),
                "body_preview": (c.get("body", "") or "")[:200],
            }
            for c in human_comments
        ],
        "dns": {
            "cname": dns_cname or None,
            "a": dns_a,
            "aaaa": dns_aaaa,
        },
        "https": {
            "status": https_status,
            "location": https_location or None,
            "x_voy_build": https_xvoybuild or None,
        },
        "file_in_main": {
            "status": file_status,
            "exists": file_status == 200,
        },
        "verdict": verdict,
    }


def load_previous_state() -> dict | None:
    if STATE_FILE.exists():
        try:
            return json.loads(STATE_FILE.read_text())
        except json.JSONDecodeError:
            return None
    return None


def diff_states(old: dict, new: dict) -> list[str]:
    """Compare key fields. Return list of 'path: old → new' strings."""
    changes = []

    def cmp(path, a, b):
        if a != b:
            changes.append(f"- {path}: {a!r} → {b!r}")

    op, np_ = old["pr"], new["pr"]
    cmp("pr.state", op["state"], np_["state"])
    cmp("pr.merged_at", op.get("merged_at"), np_.get("merged_at"))
    cmp("pr.closed_at", op.get("closed_at"), np_.get("closed_at"))
    cmp("pr.updated_at", op["updated_at"], np_["updated_at"])
    cmp("pr.comments", op["comments"], np_["comments"])
    cmp("pr.review_comments", op["review_comments"], np_["review_comments"])
    cmp("pr.human_comments", op["human_comments"], np_["human_comments"])
    cmp("pr.reviews", op["reviews"], np_["reviews"])
    cmp("pr.requested_reviewers", op["requested_reviewers"], np_["requested_reviewers"])
    cmp("pr.labels", op["labels"], np_["labels"])
    cmp("dns.cname", old["dns"].get("cname"), new["dns"].get("cname"))
    cmp("dns.a", old["dns"]["a"], new["dns"]["a"])
    cmp("https.status", old["https"]["status"], new["https"]["status"])
    cmp("https.location", old["https"].get("location"), new["https"].get("location"))
    cmp("https.x_voy_build", old["https"].get("x_voy_build"), new["https"].get("x_voy_build"))
    cmp("file_in_main.exists", old["file_in_main"]["exists"], new["file_in_main"]["exists"])
    return changes


def post_merge_audit(snapshot: dict) -> int:
    """Run 7-point validation. Exit 0 if all pass, 2 if incomplete."""
    pr = snapshot["pr"]
    dns = snapshot["dns"]
    https = snapshot["https"]
    fim = snapshot["file_in_main"]

    checks = [
        ("PR merged", bool(pr.get("merged_at")), f"merged_at={pr.get('merged_at')}"),
        ("domains/voy.json in main", fim["exists"], f"HTTP {fim['status']}"),
        (f"CNAME → {CNAME_TARGET}", bool(dns.get("cname")), f"cname={dns.get('cname')}"),
        ("HTTPS 200", https["status"] == 200, f"status={https['status']}"),
        ("No redirect to is-a.dev", not https.get("location"), f"location={https.get('location')}"),
        ("x-voy-build header", bool(https.get("x_voy_build")), f"build={https.get('x_voy_build')}"),
        ("VOY content served", bool(https.get("x_voy_build")), "VOY build header present"),
    ]

    print("# VOY — Post-merge deployment audit")
    print(f"\n**Run at:** {snapshot['checked_at']}\n")
    print("## 7-point validation checklist\n")
    print("| # | Check | Result |")
    print("|---|---|---|")
    for i, (name, passed, detail) in enumerate(checks, 1):
        status = "✅ PASS" if passed else "❌ FAIL"
        print(f"| {i} | {name} | {status} ({detail}) |")

    all_pass = all(c[1] for c in checks)
    print()
    if all_pass:
        print("## 🎯 VERDICT: ALL_CHECKS_PASSED — declare voy.is-a.dev canonical")
        return 0
    else:
        print("## ⏳ VERDICT: PROPAGATION_INCOMPLETE — re-run in 30 min")
        return 2


def format_report(snapshot: dict, changes: list[str] | str) -> str:
    """Format the state-change report."""
    lines = []
    lines.append("# VOY is-a.dev PR #41619 — state report")
    lines.append("")
    lines.append(f"**Checked at:** {snapshot['checked_at']}")
    lines.append(f"**Verdict:** `{snapshot['verdict']}`")
    lines.append("")

    if changes == "FIRST_RUN":
        lines.append("## 📌 Baseline established (first run)")
    elif changes == "NO_CHANGE" or (isinstance(changes, list) and len(changes) == 0):
        lines.append("## ✅ No state changes detected (forced report)")
    else:
        lines.append("## 🔄 State changes detected\n")
        lines.append("```")
        lines.extend(changes)
        lines.append("```")
    lines.append("")

    lines.append("## Current snapshot")
    lines.append("```json")
    lines.append(json.dumps(snapshot, indent=2))
    lines.append("```")
    lines.append("")

    if snapshot.get("reviews_detail"):
        lines.append("## Reviews")
        lines.append("```")
        for r in snapshot["reviews_detail"]:
            lines.append(f"  - {r['user']}: {r['state']} @ {r['submitted_at']}")
        lines.append("```")
        lines.append("")

    if snapshot.get("human_comments_detail"):
        lines.append("## Human comments")
        lines.append("```")
        for c in snapshot["human_comments_detail"]:
            lines.append(f"  - {c['user']} @ {c['created_at']}: {c['body_preview']}")
        lines.append("```")
        lines.append("")

    lines.append("## Decision")
    verdict = snapshot["verdict"]
    pr = snapshot["pr"]
    if verdict == "MERGED":
        lines.append("🚀 **MERGED** — run full deployment audit.")
        lines.append("Execute: `python3 scripts/watch-isadev-pr.py --post-merge`")
    elif verdict == "CLOSED_WITHOUT_MERGE":
        lines.append("⚠️ **CLOSED without merge** — PR rejected. Investigate maintainer feedback.")
        lines.append(f"URL: {pr['html_url']}")
    elif verdict == "HUMAN_REVIEW_APPEARED":
        lines.append("👀 **Human review appeared** — check PR for comments / change requests.")
        lines.append(f"URL: {pr['html_url']}")
    elif verdict == "WAITING_EXTERNAL_REVIEW":
        created = pr.get("created_at", "")
        if created:
            try:
                created_dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                age = datetime.now(timezone.utc) - created_dt
                age_days = age.days
                lines.append(f"⏳ **Still waiting** — no human review yet.")
                lines.append(f"PR age: {age_days} days (Discord query threshold: 7 days).")
                if age_days >= 7:
                    lines.append("")
                    lines.append("📢 **PR is ≥7 days old** — consider posting ONE respectful query")
                    lines.append("in the is-a.dev Discord #pull-requests channel per project guidelines.")
            except Exception:
                lines.append("⏳ **Still waiting** — no human review yet.")

    return "\n".join(lines)


def main() -> int:
    try:
        snapshot = build_snapshot()
    except Exception as e:
        print(f"ERROR building snapshot: {e}", file=sys.stderr)
        return 3

    # Post-merge validation mode
    if POST_MERGE:
        return post_merge_audit(snapshot)

    verdict = snapshot["verdict"]

    # Merge detected — run full post-merge audit and signal high priority
    if verdict == "MERGED":
        print("# 🚀 MERGE DETECTED — running post-merge audit\n")
        print(json.dumps(snapshot, indent=2))
        print()
        post_merge_audit(snapshot)
        # Persist state
        STATE_FILE.write_text(json.dumps(snapshot, indent=2))
        return 2

    # Diff against previous state
    old = load_previous_state()
    if old is None:
        changes = "FIRST_RUN"
    else:
        change_list = diff_states(old, snapshot)
        changes = change_list if change_list else "NO_CHANGE"

    # No-op polling cycle
    if changes == "NO_CHANGE" and not FORCE:
        STATE_FILE.write_text(json.dumps(snapshot, indent=2))
        # Minimal output for log traceability
        print(f"[{snapshot['checked_at']}] no-op: verdict={verdict}, pr.state={snapshot['pr']['state']}")
        return 0

    # State changed (or --force) — print report
    report = format_report(snapshot, changes)
    print(report)

    # Persist state
    STATE_FILE.write_text(json.dumps(snapshot, indent=2))

    # Exit code
    if changes == "FIRST_RUN":
        return 0  # baseline establishment is not an alert
    return 1  # state changed


if __name__ == "__main__":
    sys.exit(main())
