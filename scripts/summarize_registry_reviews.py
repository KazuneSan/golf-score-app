#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Summarize registry review targets.

Focuses on `verificationStatus.rank == "R"` and groups them into:
- closed listings
- unsupported cdata structures
- malformed / special short entries
- PGM structure mismatches
- PGM value mismatches
"""

from __future__ import annotations

import json
from collections import Counter
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = PROJECT_ROOT / "data" / "course-registry" / "master_courses.json"


def _pgm_bucket(rec: dict) -> str | None:
    if rec.get("scraper") != "pgm_official":
        return None
    vs = rec.get("verificationStatus") or {}
    summary = vs.get("summary") or {}
    diff_count = summary.get("diffCount", vs.get("diffCount", 0)) or 0
    pairing = summary.get("pairingWarnings", vs.get("pairingWarningsCount", 0)) or 0
    if diff_count > 0 and pairing == 0:
        return "pgm_value_mismatch"
    if diff_count == 0 and pairing > 0:
        return "pgm_structure_mismatch"
    if diff_count > 0 and pairing > 0:
        return "pgm_mixed_mismatch"
    return "pgm_unclassified"


def main() -> int:
    payload = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    records = payload["courses"] if isinstance(payload, dict) and "courses" in payload else payload

    grouped: dict[str, list[dict]] = {}
    counts = Counter()

    for rec in records:
        vs = rec.get("verificationStatus") or {}
        if vs.get("rank") != "R":
            continue

        summary = vs.get("summary") or {}
        classification = summary.get("classification")
        if classification:
            bucket = classification
        else:
            bucket = _pgm_bucket(rec) or "other_review"

        grouped.setdefault(bucket, []).append(
            {
                "id": rec["scrapedCourseId"],
                "name": rec["displayName"],
                "status": rec.get("status"),
                "scraper": rec.get("scraper"),
                "summary": summary,
            }
        )
        counts[bucket] += 1

    print(json.dumps(dict(counts), ensure_ascii=False, indent=2))
    for bucket in sorted(grouped):
        print(f"\n## {bucket} ({len(grouped[bucket])})")
        for row in grouped[bucket]:
            print(json.dumps(row, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
