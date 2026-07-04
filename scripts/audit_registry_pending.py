#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audit registry courses whose verificationStatus is null.
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List

import audit_batch


def _load_registry(path: Path) -> Dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    courses = data.get("courses")
    if not isinstance(courses, list):
        raise ValueError(f"{path} の courses 配列を読み取れません")
    return data


def _pending_course_ids(data: Dict[str, Any]) -> List[str]:
    pending: List[str] = []
    for course in data["courses"]:
        if course.get("verificationStatus") is None and course.get("scrapedCourseId"):
            pending.append(course["scrapedCourseId"])
    return pending


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit registry courses with null verificationStatus")
    parser.add_argument("--registry-file", required=True, help="path to master_courses.json")
    parser.add_argument("--limit", type=int, default=20, help="number of pending courses to audit")
    parser.add_argument("--from-output", action="store_true", help="use generated JS as current data")
    parser.add_argument("--force", action="store_true", help="bypass cache when scraping current data")
    parser.add_argument("--report-dir", required=True, help="directory to write per-course audit JSON reports")
    args = parser.parse_args()

    registry_path = Path(args.registry_file)
    registry = _load_registry(registry_path)
    targets = _pending_course_ids(registry)[: args.limit]
    if not targets:
        print("no pending registry courses")
        return 0

    rank_counts: Dict[str, int] = {}
    failures = 0
    report_dir = Path(args.report_dir)
    report_dir.mkdir(parents=True, exist_ok=True)

    registry_map = audit_batch._load_registry(registry_path)
    for course_id in targets:
        try:
            report = audit_batch._run_one(
                course_id=course_id,
                from_output=args.from_output,
                force=args.force,
                reference_dir=None,
                reference_map=None,
                reference_url_map=None,
                registry_map=registry_map,
            )
        except Exception as e:
            failures += 1
            print(f"ERROR {course_id} {e}")
            continue

        rank = report["rank"]
        rank_counts[rank] = rank_counts.get(rank, 0) + 1
        audit_batch._print_result(report)

        out = report_dir / f"{course_id}.json"
        out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        if rank == "R":
            failures += 1

    print("SUMMARY " + " ".join(f"{rank}={rank_counts.get(rank, 0)}" for rank in ["A", "B", "C", "R"]))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
