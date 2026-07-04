#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Build the national course registry seed from current COURSES definitions.
"""

import json
import re
from pathlib import Path
from typing import Dict, List, Optional

import scrape_courses as sc


REGISTRY_DIR = Path(__file__).resolve().parents[1] / "data" / "course-registry"
REGISTRY_PATH = REGISTRY_DIR / "master_courses.json"


def _load_existing_registry() -> Dict[str, Dict]:
    if not REGISTRY_PATH.exists():
        return {}
    try:
        payload = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}
    courses = payload.get("courses")
    if not isinstance(courses, list):
        return {}
    existing: Dict[str, Dict] = {}
    for record in courses:
        scraped_id = record.get("scrapedCourseId")
        if scraped_id:
            existing[scraped_id] = record
    return existing


def _pgm_cache_path(cc_id: int) -> Path:
    return sc.CACHE_DIR / f"https_booking_pacificgolf_co_jp_p_guide_course_layout_cc_id_{cc_id}.html"


def _extract_gora_id_from_pgm_cache(cc_id: int) -> Optional[str]:
    path = _pgm_cache_path(cc_id)
    if not path.exists():
        return None
    text = path.read_text(encoding="utf-8", errors="replace")
    match = re.search(r'<input id="gora_id" type="hidden" value="(\d+)"', text)
    if not match or match.group(1) == "0":
        return None
    return match.group(1)


def _candidate_sources(course_id: str, cfg: Dict) -> List[Dict[str, str]]:
    sources: List[Dict[str, str]] = []
    website = cfg.get("website")
    if website:
        sources.append({"source": "official_candidate", "url": website})

    scraper = cfg.get("scraper", "unknown")
    if scraper == "accordia" and cfg.get("accordia_pref") and cfg.get("accordia_slug"):
        sources.append({
            "source": "accordia_layout",
            "url": f"https://reserve.accordiagolf.com/golfCourse/{cfg['accordia_pref']}/{cfg['accordia_slug']}/layout",
        })
    elif scraper == "pgm_official" and cfg.get("pgm_cc_id"):
        sources.append({
            "source": "pgm_layout",
            "url": f"https://booking.pacificgolf.co.jp/?p=guide.course_layout&cc_id={cfg['pgm_cc_id']}",
        })
        gora_id = _extract_gora_id_from_pgm_cache(cfg["pgm_cc_id"])
        if gora_id:
            sources.append({
                "source": "rakuten_gora",
                "url": f"https://booking.gora.golf.rakuten.co.jp/guide/course_info/disp/c_id/{gora_id}",
            })
    elif scraper == "shotnavi" and cfg.get("shotnavi_id"):
        sources.append({
            "source": "shotnavi",
            "url": f"https://shotnavi.jp/gcguide/gcinfo_{cfg['shotnavi_id']}.htm",
        })
    return sources


def _verification_targets(course_id: str, cfg: Dict) -> List[Dict[str, str]]:
    targets: List[Dict[str, str]] = [
        {
            "source": "generated_js",
            "path": str(sc.OUTPUT_DIR / f"{course_id}.js"),
            "priority": "fallback",
        }
    ]
    scraper = cfg.get("scraper", "unknown")
    if scraper == "pgm_official" and cfg.get("pgm_cc_id"):
        gora_id = _extract_gora_id_from_pgm_cache(cfg["pgm_cc_id"])
        if gora_id:
            targets.insert(0, {
                "source": "rakuten_gora",
                "url": f"https://booking.gora.golf.rakuten.co.jp/guide/course_info/disp/c_id/{gora_id}",
                "priority": "preferred",
            })
    return targets


def build_registry() -> Dict:
    existing_map = _load_existing_registry()
    records = []
    for course_id, cfg in sorted(sc.COURSES.items()):
        existing = existing_map.get(course_id, {})
        records.append({
            "id": f"registry-{course_id}",
            "scrapedCourseId": course_id,
            "displayName": cfg.get("displayName", ""),
            "prefecture": cfg.get("prefecture", ""),
            "city": cfg.get("city", ""),
            "area": cfg.get("area", ""),
            "officialUrl": cfg.get("website"),
            "scraper": cfg.get("scraper", "unknown"),
            "candidateSources": _candidate_sources(course_id, cfg),
            "verificationTargets": _verification_targets(course_id, cfg),
            "status": "collected",
            "verificationStatus": existing.get("verificationStatus"),
        })

    return {
        "version": 2,
        "description": "National course registry seed built from current COURSES definitions.",
        "courses": records,
    }


def main() -> int:
    payload = build_registry()
    REGISTRY_DIR.mkdir(parents=True, exist_ok=True)
    REGISTRY_PATH.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(REGISTRY_PATH)
    print(f"records {len(payload['courses'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
