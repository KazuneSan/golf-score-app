#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Annotate PGM review entries in the registry with explicit mismatch classifications.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
REGISTRY_PATH = PROJECT_ROOT / "data" / "course-registry" / "master_courses.json"


def main() -> int:
    payload = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    records = payload["courses"] if isinstance(payload, dict) and "courses" in payload else payload
    updated = 0
    now = datetime.now(timezone.utc).isoformat()

    for rec in records:
        if rec.get("scraper") != "pgm_official":
            continue
        vs = rec.get("verificationStatus") or {}
        if vs.get("rank") != "R":
            continue
        summary = vs.get("summary") or {}
        if summary.get("classification"):
            continue

        diff_count = summary.get("diffCount", vs.get("diffCount", 0)) or 0
        pairing = summary.get("pairingWarnings", vs.get("pairingWarningsCount", 0)) or 0

        if diff_count > 0 and pairing == 0:
            classification = "pgm_value_mismatch"
            note = "Matched variant count is stable, but value-level differences remain against Rakuten GORA."
        elif diff_count == 0 and pairing > 0:
            classification = "pgm_structure_mismatch"
            note = "Current output and Rakuten GORA differ mainly in variant/green/tee structure."
        elif diff_count > 0 and pairing > 0:
            classification = "pgm_mixed_mismatch"
            note = "Both structural pairing differences and value-level differences remain against Rakuten GORA."
        else:
            classification = "pgm_unclassified"
            note = "Review required, but diff summary could not be categorized automatically."

        summary["classification"] = classification
        summary["note"] = note
        vs["summary"] = summary
        vs["updatedAt"] = now
        rec["verificationStatus"] = vs
        updated += 1

    REGISTRY_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"updated {updated}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
