#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Import ShotNavi candidate JSON files into imported_shotnavi_courses.json.

Examples:
    python3 scripts/import_shotnavi_candidates.py --candidate-dir data/course-registry/shotnavi-candidates
    python3 scripts/import_shotnavi_candidates.py --candidate-dir data/course-registry/shotnavi-candidates --prefecture 青森県 --prefecture 岩手県
"""

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Set

import scrape_courses as sc


DEFAULT_CANDIDATE_DIR = sc.PROJECT_ROOT / "data" / "course-registry" / "shotnavi-candidates"
OUTPUT_PATH = sc.IMPORTED_COURSES_PATH


def _load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def _pref_area(prefecture: str) -> str:
    return prefecture.replace("県", "").replace("府", "").replace("都", "").replace("北海道", "北海道")


def _sanitize_display_name(name: str) -> str:
    text = re.sub(r"\s+", " ", name).strip()
    text = text.replace("・", "")
    text = text.replace("　", " ")
    return text


def _course_id(shotnavi_id: int) -> str:
    return f"shotnavi-{shotnavi_id}"


def _existing_shotnavi_ids() -> Set[int]:
    ids: Set[int] = set()
    imported_ids: Set[int] = set()
    if OUTPUT_PATH.exists():
        payload = _load_json(OUTPUT_PATH)
        if isinstance(payload, dict):
            for key, row in payload.items():
                sid = None
                if isinstance(row, dict):
                    sid = row.get("shotnavi_id")
                if isinstance(sid, int):
                    imported_ids.add(sid)
                    continue
                if isinstance(key, str) and key.startswith("shotnavi-"):
                    try:
                        imported_ids.add(int(key.split("shotnavi-")[-1]))
                    except ValueError:
                        pass
    for cfg in sc.COURSES.values():
        sid = cfg.get("shotnavi_id")
        if isinstance(sid, int):
            ids.add(sid)
    return ids - imported_ids


def _load_existing_imports() -> Dict[str, Dict[str, Any]]:
    if not OUTPUT_PATH.exists():
        return {}
    payload = _load_json(OUTPUT_PATH)
    return payload if isinstance(payload, dict) else {}


def _candidate_paths(candidate_dir: Path, prefectures: List[str]) -> List[Path]:
    if prefectures:
        return [candidate_dir / f"{pref}.json" for pref in prefectures]
    return sorted(candidate_dir.glob("*.json"))


def main() -> int:
    parser = argparse.ArgumentParser(description="Import ShotNavi candidates into external COURSES config")
    parser.add_argument("--candidate-dir", default=str(DEFAULT_CANDIDATE_DIR))
    parser.add_argument("--prefecture", action="append", default=[], help="target prefecture name")
    parser.add_argument("--limit", type=int, help="max number of new records to import")
    parser.add_argument("--include-closed", action="store_true", help="include closed candidates")
    args = parser.parse_args()

    candidate_dir = Path(args.candidate_dir)
    existing_imports = _load_existing_imports()
    existing_ids = _existing_shotnavi_ids()
    imported = 0

    for path in _candidate_paths(candidate_dir, args.prefecture):
        if not path.exists():
            print(f"skip missing candidate file: {path}")
            continue
        data = _load_json(path)
        prefecture = data.get("prefecture", "")
        for row in data.get("courses", []):
            if not args.include_closed and row.get("statusHint") != "active":
                continue
            sid = row.get("shotnaviId")
            if not isinstance(sid, int):
                continue
            cid = _course_id(sid)
            if sid in existing_ids or cid in existing_imports:
                continue

            existing_imports[cid] = {
                "displayName": _sanitize_display_name(row.get("displayName", cid)),
                "kana": "",
                "prefecture": prefecture,
                "city": "",
                "area": _pref_area(prefecture),
                "type": "",
                "website": row.get("detailUrl", f"https://shotnavi.jp/gcguide/gcinfo_{sid}.htm"),
                "scraper": "shotnavi",
                "shotnavi_id": sid,
            }
            existing_ids.add(sid)
            imported += 1
            print(f"imported {cid} {existing_imports[cid]['displayName']}")
            if args.limit and imported >= args.limit:
                break
        if args.limit and imported >= args.limit:
            break

    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT_PATH.write_text(json.dumps(existing_imports, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(OUTPUT_PATH)
    print(f"imported {imported}")
    print(f"total imported records {len(existing_imports)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
