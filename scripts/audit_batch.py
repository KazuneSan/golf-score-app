#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch audit multiple courses and emit rank summaries / JSON reports.

Reference resolution options:
  - --reference-dir: use <course-id>.js/.json/.html in the directory
  - --reference-map: JSON file mapping course_id -> file path
  - --reference-url-map: JSON file mapping course_id -> URL
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import audit_course as audit
import scrape_courses as sc


def _load_json_mapping(path: Path) -> Dict[str, str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(data, dict):
        raise ValueError(f"{path} は course_id -> value の JSON object である必要があります")
    return {str(k): str(v) for k, v in data.items()}


def _load_registry(path: Path) -> Dict[str, Dict[str, Any]]:
    data = json.loads(path.read_text(encoding="utf-8"))
    courses = data.get("courses")
    if not isinstance(courses, list):
        raise ValueError(f"{path} の courses 配列を読み取れません")
    result: Dict[str, Dict[str, Any]] = {}
    for course in courses:
        course_id = course.get("scrapedCourseId")
        if course_id:
            result[course_id] = course
    return result


def _find_reference_file(reference_dir: Path, course_id: str) -> Optional[Path]:
    for suffix in (".js", ".json", ".html", ".htm"):
        candidate = reference_dir / f"{course_id}{suffix}"
        if candidate.exists():
            return candidate
    return None


def _resolve_reference(
    *,
    course_id: str,
    reference_dir: Optional[Path],
    reference_map: Optional[Dict[str, str]],
    reference_url_map: Optional[Dict[str, str]],
) -> Tuple[List[Dict[str, Any]], str, str]:
    if reference_map and course_id in reference_map:
        path = Path(reference_map[course_id])
        return audit._load_reference_entries(path), audit._detect_reference_source(path=path), str(path)

    if reference_url_map and course_id in reference_url_map:
        url = reference_url_map[course_id]
        return audit._load_reference_from_url(url), audit._detect_reference_source(url=url), url

    if reference_dir:
        path = _find_reference_file(reference_dir, course_id)
        if path:
            return audit._load_reference_entries(path), audit._detect_reference_source(path=path), str(path)

    raise FileNotFoundError(f"{course_id} の参照データが見つかりません")


def _resolve_reference_from_registry_entry(course_id: str, entry: Dict[str, Any]) -> Tuple[List[Dict[str, Any]], str, str]:
    targets = entry.get("verificationTargets") or []
    if not isinstance(targets, list):
        raise FileNotFoundError(f"{course_id} の verificationTargets がありません")

    preferred = sorted(
        [t for t in targets if isinstance(t, dict)],
        key=lambda t: 0 if t.get("priority") == "preferred" else 1,
    )
    for target in preferred:
        source = target.get("source")
        if target.get("url") and source == "rakuten_gora":
            url = target["url"]
            return audit._load_reference_from_url(url), audit._detect_reference_source(url=url), url
        if target.get("path"):
            path = Path(target["path"])
            if path.exists():
                return audit._load_reference_entries(path), audit._detect_reference_source(path=path), str(path)
    raise FileNotFoundError(f"{course_id} の verificationTargets から使える参照先を解決できません")


def _collect_targets(course_ids: List[str], limit: Optional[int]) -> List[str]:
    if course_ids:
        return course_ids
    ids = sorted(sc.COURSES)
    if limit is not None:
        return ids[:limit]
    return ids


def _run_one(
    *,
    course_id: str,
    from_output: bool,
    force: bool,
    reference_dir: Optional[Path],
    reference_map: Optional[Dict[str, str]],
    reference_url_map: Optional[Dict[str, str]],
    registry_map: Optional[Dict[str, Dict[str, Any]]],
) -> Dict[str, Any]:
    if registry_map and course_id in registry_map:
        reference_entries, reference_source, reference_locator = _resolve_reference_from_registry_entry(course_id, registry_map[course_id])
    else:
        reference_entries, reference_source, reference_locator = _resolve_reference(
            course_id=course_id,
            reference_dir=reference_dir,
            reference_map=reference_map,
            reference_url_map=reference_url_map,
        )

    current_entries = audit._load_generated_entries(course_id) if from_output else audit._scrape_entries(course_id, force=force)
    current_source = audit._detect_current_source(course_id, from_output=from_output)
    pairs, pair_messages = audit._pair_entries(current_entries, reference_entries)

    diffs: List[Dict[str, Any]] = []
    for current, reference in pairs:
        diffs.extend(audit._compare_entry(current, reference))

    report = audit._build_report(
        course_id=course_id,
        current_source=current_source,
        reference_source=reference_source,
        current_entries=current_entries,
        reference_entries=reference_entries,
        pair_messages=pair_messages,
        diffs=diffs,
    )
    report["referenceLocator"] = reference_locator
    return report


def _print_result(report: Dict[str, Any]) -> None:
    rank = report["rank"]
    summary = report["summary"]
    line = (
        f"{rank} {report['courseId']} "
        f"diffs={summary['diffCount']} pairing_warnings={summary['pairingWarnings']} "
        f"matched_variants={summary['matchedVariants']}"
    )
    print(line)

    for warning in report.get("pairingWarnings", [])[:5]:
        if warning.get("variant"):
            print(f"  WARN {warning['type']}: {warning['variant']}")
        else:
            print(f"  WARN {warning.get('message', warning['type'])}")

    for diff in report.get("diffs", [])[:8]:
        print(f"  DIFF {audit._format_diff(diff)}")

    extra_warnings = max(0, len(report.get("pairingWarnings", [])) - 5)
    extra_diffs = max(0, len(report.get("diffs", [])) - 8)
    if extra_warnings or extra_diffs:
        print(f"  ... truncated warnings={len(report.get('pairingWarnings', []))} diffs={len(report.get('diffs', []))}")


def main() -> int:
    parser = argparse.ArgumentParser(description="Batch audit courses and emit verification ranks")
    parser.add_argument("course_ids", nargs="*", help="course ids to audit; omit to use all configured courses")
    parser.add_argument("--limit", type=int, help="limit number of courses when course_ids are omitted")
    parser.add_argument("--from-output", action="store_true", help="use generated JS as current data")
    parser.add_argument("--force", action="store_true", help="bypass cache when scraping current data")
    parser.add_argument("--reference-dir", help="directory containing <course-id>.js/.json/.html references")
    parser.add_argument("--reference-map", help="JSON file mapping course_id to reference file path")
    parser.add_argument("--reference-url-map", help="JSON file mapping course_id to reference URL")
    parser.add_argument("--registry-file", help="registry JSON containing verificationTargets for each course")
    parser.add_argument("--report-dir", help="directory to write per-course JSON reports")
    args = parser.parse_args()

    if not args.reference_dir and not args.reference_map and not args.reference_url_map and not args.registry_file:
        parser.error("one of --reference-dir, --reference-map, --reference-url-map, or --registry-file is required")

    reference_dir = Path(args.reference_dir) if args.reference_dir else None
    reference_map = _load_json_mapping(Path(args.reference_map)) if args.reference_map else None
    reference_url_map = _load_json_mapping(Path(args.reference_url_map)) if args.reference_url_map else None
    registry_map = _load_registry(Path(args.registry_file)) if args.registry_file else None
    report_dir = Path(args.report_dir) if args.report_dir else None
    if report_dir:
        report_dir.mkdir(parents=True, exist_ok=True)

    targets = _collect_targets(args.course_ids, args.limit)
    rank_counts: Dict[str, int] = {}
    failures = 0

    for course_id in targets:
        try:
            report = _run_one(
                course_id=course_id,
                from_output=args.from_output,
                force=args.force,
                reference_dir=reference_dir,
                reference_map=reference_map,
                reference_url_map=reference_url_map,
                registry_map=registry_map,
            )
        except Exception as e:
            failures += 1
            print(f"ERROR {course_id} {e}")
            continue

        rank = report["rank"]
        rank_counts[rank] = rank_counts.get(rank, 0) + 1
        _print_result(report)

        if report_dir:
            out = report_dir / f"{course_id}.json"
            out.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

        if rank == "R":
            failures += 1

    print("SUMMARY " + " ".join(f"{rank}={rank_counts.get(rank, 0)}" for rank in ["A", "B", "C", "R"]))
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
