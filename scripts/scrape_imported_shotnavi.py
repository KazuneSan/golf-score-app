#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scrape courses defined in imported_shotnavi_courses.json.

Examples:
    python3 scripts/scrape_imported_shotnavi.py --force
    python3 scripts/scrape_imported_shotnavi.py --only-missing-output --limit 20
"""

import argparse
import json
from pathlib import Path
from typing import List

import scrape_courses as sc


def _load_imported_ids() -> List[str]:
    path = sc.IMPORTED_COURSES_PATH
    if not path.exists():
        return []
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        return []
    return sorted(payload.keys())


def main() -> int:
    parser = argparse.ArgumentParser(description="Scrape imported ShotNavi courses")
    parser.add_argument("--force", action="store_true")
    parser.add_argument("--limit", type=int)
    parser.add_argument("--only-missing-output", action="store_true")
    args = parser.parse_args()

    targets = _load_imported_ids()
    if args.only_missing_output:
        filtered = []
        for course_id in targets:
            output = sc.OUTPUT_DIR / f"{course_id}.js"
            if not output.exists():
                filtered.append(course_id)
        targets = filtered
    if args.limit:
        targets = targets[: args.limit]

    print(f"targets {len(targets)}")
    success = 0
    failures = 0
    for course_id in targets:
        try:
            ok = sc.scrape_one(course_id, force=args.force)
        except Exception as e:
            failures += 1
            print(f"ERROR {course_id} {e}")
            continue
        if ok:
            success += 1
        else:
            failures += 1

    print(f"summary success={success} failures={failures} total={len(targets)}")
    sc._regenerate_index_js()
    return 0 if failures == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
