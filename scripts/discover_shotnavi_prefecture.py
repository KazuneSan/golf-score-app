#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Discover ShotNavi course candidates from prefecture listing pages.

Examples:
    python3 scripts/discover_shotnavi_prefecture.py 青森県
    python3 scripts/discover_shotnavi_prefecture.py 青森県 岩手県 --write-dir data/course-registry/shotnavi-candidates
"""

import argparse
import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

from bs4 import BeautifulSoup

import scrape_courses as sc


PREF_CODES: Dict[str, int] = {
    "北海道": 1,
    "青森県": 2,
    "岩手県": 3,
    "宮城県": 4,
    "秋田県": 5,
    "山形県": 6,
    "福島県": 7,
    "茨城県": 8,
    "栃木県": 9,
    "群馬県": 10,
    "埼玉県": 11,
    "千葉県": 12,
    "東京都": 13,
    "神奈川県": 14,
    "新潟県": 15,
    "長野県": 16,
    "山梨県": 17,
    "富山県": 18,
    "石川県": 19,
    "福井県": 20,
    "岐阜県": 21,
    "静岡県": 22,
    "愛知県": 23,
    "三重県": 24,
    "滋賀県": 25,
    "京都府": 26,
    "大阪府": 27,
    "兵庫県": 28,
    "奈良県": 29,
    "和歌山県": 30,
    "鳥取県": 31,
    "島根県": 32,
    "岡山県": 33,
    "広島県": 34,
    "山口県": 35,
    "徳島県": 36,
    "香川県": 37,
    "愛媛県": 38,
    "高知県": 39,
    "福岡県": 40,
    "佐賀県": 41,
    "長崎県": 42,
    "熊本県": 43,
    "大分県": 44,
    "宮崎県": 45,
    "鹿児島県": 46,
    "沖縄県": 47,
}

BASE_URL = "https://shotnavi.jp/gcguide"


def _listing_url(prefecture: str) -> str:
    code = PREF_CODES[prefecture]
    return f"{BASE_URL}/searchpref.php?pref={code}"


def _normalize_course_name(name: str) -> str:
    text = re.sub(r"\s+", " ", name).strip()
    text = re.sub(r"\(.*?閉鎖.*?\)", "", text).strip()
    return text


def _slugify(text: str) -> str:
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "course"


def _roman_hint(name: str) -> str:
    ascii_only = re.sub(r"[^A-Za-z0-9]+", "-", name)
    return _slugify(ascii_only)


def discover_prefecture(prefecture: str, *, force: bool = False) -> Tuple[str, List[Dict[str, Any]]]:
    if prefecture not in PREF_CODES:
        raise KeyError(f"unsupported prefecture: {prefecture}")

    url = _listing_url(prefecture)
    html = sc.fetch(url, force=force)
    soup = BeautifulSoup(html, "html.parser")

    seen_ids = set()
    records: List[Dict[str, Any]] = []
    for a in soup.find_all("a", href=True):
        match = re.search(r"gcinfo_(\d+)\.htm", a["href"])
        if not match:
            continue
        shotnavi_id = int(match.group(1))
        if shotnavi_id in seen_ids:
            continue
        seen_ids.add(shotnavi_id)

        raw_text = a.get_text(" ", strip=True)
        name_node = a.find(class_="gc-name")
        figure_node = a.find(class_="gc-figure")
        hiway_node = a.find(class_="gc-hiway")
        display_text = name_node.get_text(" ", strip=True) if name_node else raw_text
        if not display_text:
            continue
        display_name = _normalize_course_name(display_text)
        closed = "閉鎖" in raw_text
        figure_text = figure_node.get_text(" ", strip=True) if figure_node else ""
        hiway_text = hiway_node.get_text(" ", strip=True) if hiway_node else ""

        records.append({
            "displayName": display_name,
            "prefecture": prefecture,
            "shotnaviId": shotnavi_id,
            "detailUrl": f"{BASE_URL}/gcinfo_{shotnavi_id}.htm",
            "listingUrl": url,
            "listingText": raw_text,
            "figureText": figure_text,
            "highwayText": hiway_text,
            "statusHint": "closed" if closed else "active",
            "provisionalCourseId": f"shotnavi-{PREF_CODES[prefecture]:02d}-{shotnavi_id}",
            "slugHint": _roman_hint(display_name),
        })

    return url, records


def main() -> int:
    parser = argparse.ArgumentParser(description="Discover ShotNavi course candidates from prefecture listings")
    parser.add_argument("prefectures", nargs="+", help="prefecture names, e.g. 青森県")
    parser.add_argument("--force", action="store_true", help="bypass cache")
    parser.add_argument("--write-dir", help="directory to write per-prefecture JSON files")
    args = parser.parse_args()

    write_dir = Path(args.write_dir) if args.write_dir else None
    if write_dir:
        write_dir.mkdir(parents=True, exist_ok=True)

    for prefecture in args.prefectures:
        url, records = discover_prefecture(prefecture, force=args.force)
        payload = {
            "prefecture": prefecture,
            "listingUrl": url,
            "courseCount": len(records),
            "courses": records,
        }
        print(f"## {prefecture}")
        print(f"listing: {url}")
        print(f"courses: {len(records)}")
        for row in records[:10]:
            print(f"- {row['displayName']} | shotnaviId={row['shotnaviId']} | status={row['statusHint']}")
        if len(records) > 10:
            print(f"... ({len(records) - 10} more)")
        if write_dir:
            out = write_dir / f"{prefecture}.json"
            out.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            print(f"wrote: {out}")
        print()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
