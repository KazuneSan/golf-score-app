#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Flag registry records whose generated JS contains nonstandard hole counts.

Nonstandard here means any entry whose hole count is not one of:
- 9
- 12
- 18

This is used to move suspicious records into review_required even if they were
previously marked as internally verified.
"""

from __future__ import annotations

import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
AUTO_DIR = PROJECT_ROOT / "src" / "data" / "courses" / "auto"
REGISTRY_PATH = PROJECT_ROOT / "data" / "course-registry" / "master_courses.json"

ALLOWED_HOLES = {9, 12, 18}


def _load_courses_from_js(path: Path) -> list[dict]:
    text = path.read_text(encoding="utf-8")
    m = re.search(r"export const COURSES = (\[.*\]);\s*export default COURSES;\s*\Z", text, re.S)
    if not m:
        return []
    return json.loads(m.group(1))


def _classification_for_holes(holes: int) -> str:
    if holes <= 3:
        return "malformed_partial_entry"
    return "special_short_or_partial"


def _note_for_rows(rows: list[dict]) -> str:
    parts = []
    for row in rows:
        parts.append(f"{row['variant']}={row['holes']}H/par{row['par']}/yards{row['yards']}")
    return "Nonstandard generated entries detected: " + ", ".join(parts)


def main() -> int:
    registry_payload = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    records = registry_payload["courses"] if isinstance(registry_payload, dict) and "courses" in registry_payload else registry_payload

    grouped: dict[str, list[dict]] = defaultdict(list)
    for js_path in AUTO_DIR.glob("*.js"):
        courses = _load_courses_from_js(js_path)
        for course in courses:
            holes = len(course.get("holes", []))
            if holes in ALLOWED_HOLES:
                continue
            grouped[course["parentClubId"]].append(
                {
                    "variant": course.get("variant") or course.get("name") or "unknown",
                    "holes": holes,
                    "par": course.get("totalPar"),
                    "yards": course.get("totalYards"),
                    "source": course.get("source"),
                }
            )

    now = datetime.now(timezone.utc).isoformat()
    updated = 0
    for record in records:
        course_id = record.get("scrapedCourseId")
        if course_id not in grouped:
            continue
        rows = grouped[course_id]
        worst_holes = min(row["holes"] for row in rows)
        classification = _classification_for_holes(worst_holes)
        note = _note_for_rows(rows)
        summary = {
            "classification": classification,
            "note": note,
            "entries": rows,
        }
        record["status"] = "review_required"
        record["verificationStatus"] = {
            "rank": "R",
            "currentSource": "generated_js",
            "referenceSource": rows[0].get("source") or record.get("scraper") or "generated_js",
            "referenceLocator": str(AUTO_DIR / f"{course_id}.js"),
            "summary": summary,
            "pairingWarningsCount": 0,
            "diffCount": 0,
            "reportPath": None,
            "updatedAt": now,
        }
        updated += 1

    REGISTRY_PATH.write_text(json.dumps(registry_payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"flagged {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
