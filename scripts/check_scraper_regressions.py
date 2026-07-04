#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Run a small set of regression checks against representative courses.

This is a lightweight proof-of-concept for the proposed design:
  - classify validation results into error / warning / review
  - keep a fixed set of representative course cases
  - verify entry shape separately from issue severity
"""

from collections import Counter
from typing import Any, Dict, List

import scrape_courses as sc


REGRESSION_CASES: List[Dict[str, Any]] = [
    {
        "course_id": "pgm-41",
        "expected_entries": 1,
        "expected_variants": ["Right Green"],
        "expected_issue_counts": {"error": 0, "review": 0},
    },
    {
        "course_id": "pgm-68",
        "expected_entries": 5,
        "expected_variants": ["OUT / AG", "OUT / BG", "IN / AG", "IN / BG", "WEST / AG"],
        "expected_issue_counts": {"error": 0, "review": 0},
    },
    {
        "course_id": "accordia-shizu",
        "expected_entries": 2,
        "expected_variants": ["Aグリーン", "Bグリーン"],
        "expected_issue_counts": {"error": 0, "review": 0},
    },
    {
        "course_id": "pgm-40",
        "expected_entries": 3,
        "expected_issue_counts": {"error": 0, "review": 1},
    },
    {
        "course_id": "pgm-152",
        "expected_entries": 7,
        "expected_variants": [
            "桜 西コース / MG",
            "桜 中コース / MG",
            "桜 東コース / MG",
            "竹 OUT / MG",
            "竹 OUT / SG",
            "竹 IN / MG",
            "竹 IN / SG",
        ],
        "expected_issue_counts": {"error": 0, "review": 0},
    },
    {
        "course_id": "accordia-newnanso",
        "expected_entries": 2,
        "expected_variants": ["OUT", "IN / LEFTグリーン"],
        "expected_issue_counts": {"error": 0, "review": 0},
    },
    {
        "course_id": "shotnavi-aomori-cc",
        "expected_entries": 3,
        "expected_variants": ["十和田", "むつ湾", "八甲田"],
        "expected_issue_counts": {"error": 0, "review": 0},
    },
]


def _scrape_entries(course_id: str) -> List[Dict[str, Any]]:
    cfg = sc.COURSES[course_id]
    scraper_kind = cfg.get("scraper", "shotnavi")

    if scraper_kind == "pgm_official":
        return sc.scrape_pgm_official({**cfg, "_course_id": course_id}, force=False)
    if scraper_kind == "accordia":
        return sc.scrape_accordia({**cfg, "_course_id": course_id}, force=False)
    if scraper_kind == "akabane_official":
        return sc.scrape_akabane_official(cfg, force=False)

    scraped = sc.scrape_shotnavi(cfg["shotnavi_id"], force=False)
    return sc.build_entries(course_id, cfg, scraped) if scraped else []


def main() -> int:
    failures = 0

    for case in REGRESSION_CASES:
        course_id = case["course_id"]
        entries = _scrape_entries(course_id)
        variants = [entry.get("variant") for entry in entries]

        issue_counts: Counter[str] = Counter()
        messages_by_severity: Dict[str, List[str]] = {"error": [], "warning": [], "review": []}
        for entry in entries:
            for issue in sc.collect_validation_issues(entry):
                sev = issue["severity"]
                issue_counts[sev] += 1
                messages_by_severity.setdefault(sev, []).append(issue["message"])

        case_failed = False
        print(f"## {course_id}")
        print(f"entries={len(entries)} variants={variants}")
        print(f"issues={dict(issue_counts)}")

        expected_entries = case.get("expected_entries")
        if expected_entries is not None and len(entries) != expected_entries:
            case_failed = True
            print(f"FAIL entries expected={expected_entries} actual={len(entries)}")

        expected_variants = case.get("expected_variants")
        if expected_variants is not None and variants != expected_variants:
            case_failed = True
            print(f"FAIL variants expected={expected_variants} actual={variants}")

        expected_issue_counts = case.get("expected_issue_counts", {})
        for severity, expected_count in expected_issue_counts.items():
            actual_count = issue_counts.get(severity, 0)
            if actual_count != expected_count:
                case_failed = True
                print(f"FAIL {severity} expected={expected_count} actual={actual_count}")

        if case_failed:
            failures += 1
            for severity in ("error", "warning", "review"):
                for message in messages_by_severity.get(severity, []):
                    print(f"  {severity.upper()} {message}")
        else:
            print("PASS")

        print()

    return 1 if failures else 0


if __name__ == "__main__":
    raise SystemExit(main())
