#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Update master_courses.json verificationStatus from audit report JSON files.
"""

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any


def _load_registry(path: Path) -> Dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    courses = data.get("courses")
    if not isinstance(courses, list):
        raise ValueError(f"{path} の courses 配列を読み取れません")
    return data


def _load_reports(report_dir: Path) -> Dict[str, Dict[str, Any]]:
    reports: Dict[str, Dict[str, Any]] = {}
    for path in sorted(report_dir.glob("*.json")):
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            continue
        course_id = data.get("courseId")
        if course_id:
            data["_report_path"] = str(path)
            reports[course_id] = data
    return reports


def _status_from_report(report: Dict[str, Any]) -> Dict[str, Any]:
    return {
        "rank": report.get("rank"),
        "currentSource": report.get("currentSource"),
        "referenceSource": report.get("referenceSource"),
        "referenceLocator": report.get("referenceLocator"),
        "summary": report.get("summary", {}),
        "pairingWarningsCount": len(report.get("pairingWarnings", [])),
        "diffCount": len(report.get("diffs", [])),
        "reportPath": report.get("_report_path"),
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Update course registry verificationStatus from audit reports")
    parser.add_argument("--registry-file", required=True, help="path to master_courses.json")
    parser.add_argument("--report-dir", required=True, help="directory containing per-course audit JSON reports")
    parser.add_argument("--only-missing", action="store_true", help="update only courses without verificationStatus")
    args = parser.parse_args()

    registry_path = Path(args.registry_file)
    report_dir = Path(args.report_dir)

    payload = _load_registry(registry_path)
    reports = _load_reports(report_dir)

    updated = 0
    for course in payload["courses"]:
        course_id = course.get("scrapedCourseId")
        if not course_id or course_id not in reports:
            continue
        if args.only_missing and course.get("verificationStatus") is not None:
            continue
        course["verificationStatus"] = _status_from_report(reports[course_id])
        updated += 1

    payload["verificationUpdatedAt"] = datetime.now(timezone.utc).isoformat()
    payload["verificationReportCount"] = len(reports)
    registry_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(registry_path)
    print(f"updated {updated}")
    print(f"reports {len(reports)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
