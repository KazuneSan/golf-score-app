#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch-audit PGM courses against Rakuten GORA HTML pages.

Workflow:
  1. Read local PGM official cache files and extract gora_id.
  2. Download Rakuten GORA course pages with curl -L.
  3. Compare current generated output against the downloaded HTML.
  4. Print a compact summary.
"""

import argparse
import re
import subprocess
import sys
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import audit_course as audit
import scrape_courses as sc


def _pgm_cache_path(cc_id: int) -> Path:
    return sc.CACHE_DIR / f"https_booking_pacificgolf_co_jp_p_guide_course_layout_cc_id_{cc_id}.html"


def _extract_gora_id_from_pgm_cache(cc_id: int) -> Optional[str]:
    path = _pgm_cache_path(cc_id)
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r'<input id="gora_id" type="hidden" value="(\d+)"', text)
    if not match:
        return None
    gora_id = match.group(1)
    if gora_id == "0":
        return None
    return gora_id


def _download_gora_html(gora_id: str, target: Path) -> None:
    url = f"https://booking.gora.golf.rakuten.co.jp/guide/course_info/disp/c_id/{gora_id}"
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["curl", "-L", url, "-o", str(target)], check=True, capture_output=True, text=True)


def _run_one(course_id: str, html_path: Path) -> Tuple[bool, List[str], List[str]]:
    current_entries = audit._load_generated_entries(course_id)
    reference_entries = audit._load_reference_entries(html_path)
    pairs, pair_messages = audit._pair_entries(current_entries, reference_entries)

    diffs: List[str] = []
    for current, reference in pairs:
        diffs.extend(audit._compare_entry(current, reference))

    ok = not pair_messages and not diffs
    return ok, pair_messages, diffs


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch-audit PGM courses against Rakuten GORA")
    parser.add_argument("course_ids", nargs="*", help="PGM course ids to audit")
    parser.add_argument("--limit", type=int, default=5, help="number of PGM courses to audit when course_ids are omitted")
    parser.add_argument("--cache-dir", default="/tmp/gora-audit-html", help="directory to store downloaded Rakuten GORA HTML")
    args = parser.parse_args()

    pgm_courses: Dict[str, Dict] = {
        cid: cfg for cid, cfg in sc.COURSES.items() if cfg.get("scraper") == "pgm_official"
    }

    targets = args.course_ids or sorted(pgm_courses)[: args.limit]
    cache_dir = Path(args.cache_dir)

    failures = 0
    for course_id in targets:
        cfg = pgm_courses.get(course_id)
        if not cfg:
            print(f"SKIP {course_id}: not a configured PGM course")
            failures += 1
            continue

        cc_id = cfg.get("pgm_cc_id")
        gora_id = _extract_gora_id_from_pgm_cache(cc_id)
        if not gora_id:
            print(f"SKIP {course_id}: gora_id not found in local PGM cache")
            continue

        html_path = cache_dir / f"{course_id}.html"
        if not html_path.exists():
            try:
                _download_gora_html(gora_id, html_path)
            except subprocess.CalledProcessError as e:
                print(f"SKIP {course_id}: failed to download Rakuten GORA HTML ({e})")
                failures += 1
                continue

        ok, pair_messages, diffs = _run_one(course_id, html_path)
        if ok:
            print(f"PASS {course_id} {cfg['displayName']}")
            continue

        failures += 1
        print(f"FAIL {course_id} {cfg['displayName']}")
        for message in pair_messages[:8]:
            print(f"  WARN {message}")
        for diff in diffs[:12]:
            print(f"  DIFF {diff}")
        if len(pair_messages) > 8 or len(diffs) > 12:
            print(f"  ... truncated warnings={len(pair_messages)} diffs={len(diffs)}")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
