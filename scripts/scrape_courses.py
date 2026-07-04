#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Golf course scraper for fairway-native app.

スコアカード(ホール毎の par / yards / hdcp)を ShotNavi (主) と公式サイト (補助)
から取得し、`src/data/courses/auto/<course-id>.js` に書き出す。

Usage:
    # まずは両方
    python3 scripts/scrape_courses.py

    # 個別に
    python3 scripts/scrape_courses.py akabane-gc
    python3 scripts/scrape_courses.py koshigaya-gc

    # キャッシュを破棄して再取得
    python3 scripts/scrape_courses.py --force

新しいコースを追加するには COURSES 辞書にエントリを足すだけ。
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import date
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

try:
    import requests
    from bs4 import BeautifulSoup
except ImportError as e:
    print(f"Error: 必要なパッケージがインストールされていません: {e}")
    print("以下を実行してください:")
    print("  pip3 install -r scripts/requirements.txt")
    sys.exit(1)


# ──────────────────────────────────────────────────────────────────
# Paths & HTTP
# ──────────────────────────────────────────────────────────────────

PROJECT_ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = PROJECT_ROOT / "src" / "data" / "courses" / "auto"
CACHE_DIR = PROJECT_ROOT / ".scrape-cache"
IMPORTED_COURSES_PATH = PROJECT_ROOT / "data" / "course-registry" / "imported_shotnavi_courses.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/126.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "ja-JP,ja;q=0.9,en;q=0.8",
}

POLITE_DELAY_SEC = float(os.environ.get("SCRAPE_DELAY_SEC", "1.5"))


def fetch(url: str, *, force: bool = False) -> str:
    """URL を取得 (ディスクキャッシュあり)。"""
    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    safe = re.sub(r"[^a-zA-Z0-9]+", "_", url).strip("_")[:140]
    cache_path = CACHE_DIR / f"{safe}.html"

    if cache_path.exists() and not force:
        return cache_path.read_text(encoding="utf-8", errors="replace")

    print(f"    fetch: {url}")
    resp = requests.get(url, headers=HEADERS, timeout=30)
    resp.raise_for_status()
    resp.encoding = resp.apparent_encoding or "utf-8"
    cache_path.write_text(resp.text, encoding="utf-8")
    time.sleep(POLITE_DELAY_SEC)
    return resp.text


# ──────────────────────────────────────────────────────────────────
# ShotNavi parser
# ──────────────────────────────────────────────────────────────────
#
# ShotNavi の cdata ページの実構造 (調査結果):
#
#   - cdata_{course_id}_0.htm  : OUT (ホール 1-9)
#   - cdata_{course_id}_1.htm  : IN  (ホール 10-18)
#
#   いずれも <div class="data-table"> 内に以下のテキストが入る:
#
#     "No PAR Aグリーン Bグリーン 1 4 375 373 2 4 410 412 ... TOTAL 37 3296 3340"
#
#   (列構成は施設により異なる。例えば 1グリーンなら "No PAR ヤード" の3列、
#    高麗/バミューダ等のラベル違いも有り)


def parse_shotnavi_data_table(soup: BeautifulSoup) -> Optional[Dict[str, Any]]:
    """ShotNavi の <div class='data-table'> 内テキストを解析。

    戻り値:
      {
        'par_by_hole': {1: 4, 2: 4, ...},
        'columns': [
            {'label': 'Aグリーン', 'yards_by_hole': {1: 375, 2: 410, ...}},
            {'label': 'Bグリーン', 'yards_by_hole': {1: 373, 2: 412, ...}},
        ],
      }
    """
    div = soup.find("div", class_="data-table")
    if not div:
        return None

    text = div.get_text(" ", strip=True)
    tokens = text.split()
    if not tokens:
        return None

    # ヘッダー (非数値トークン) を集める。最初の "1〜18 の数字" が出るまで。
    column_labels: List[str] = []
    data_start = -1
    for i, t in enumerate(tokens):
        if t.isdigit() and 1 <= int(t) <= 18:
            data_start = i
            break
        column_labels.append(t)

    # 想定: ['No', 'PAR', 'Aグリーン', 'Bグリーン'] など
    if data_start < 0 or len(column_labels) < 3 or column_labels[0] not in ("No", "NO", "no"):
        return None

    n_cols = len(column_labels)
    yards_label_columns = column_labels[2:]  # "PAR" の右側がヤーデージ列
    par_by_hole: Dict[int, int] = {}
    yards_columns: Dict[str, Dict[int, int]] = {label: {} for label in yards_label_columns}

    pos = data_start
    while pos + n_cols <= len(tokens):
        row = tokens[pos:pos + n_cols]
        if row[0] == "TOTAL" or not row[0].isdigit():
            break
        try:
            hole_no = int(row[0])
            par = int(row[1])
            if not (1 <= hole_no <= 18 and 3 <= par <= 5):
                break
            par_by_hole[hole_no] = par
            for ci, label in enumerate(yards_label_columns, start=2):
                if ci < len(row):
                    yval = re.sub(r"[^\d]", "", row[ci])
                    if yval.isdigit():
                        y = int(yval)
                        if 50 <= y <= 700:
                            yards_columns[label][hole_no] = y
            pos += n_cols
        except (ValueError, IndexError):
            break

    if not par_by_hole:
        return None

    return {
        "par_by_hole": par_by_hole,
        "columns": [
            {"label": label, "yards_by_hole": yards_columns[label]}
            for label in yards_label_columns
        ],
    }


def _shotnavi_selected_section_label(soup: BeautifulSoup) -> str:
    node = soup.select_one("#course-list .box li.select .course-title")
    if node:
        return node.get_text(" ", strip=True)
    node = soup.select_one("section .tab li.select a")
    if node:
        return node.get_text(" ", strip=True)
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    m = re.search(r"^\s*(.+?)\s+(.+?)のコース情報", title)
    if m:
        return m.group(2).strip()
    return ""


def _shotnavi_club_name(soup: BeautifulSoup) -> str:
    node = soup.select_one("header.course-title h1")
    if node:
        return node.get_text(" ", strip=True)
    title = soup.title.get_text(" ", strip=True) if soup.title else ""
    m = re.search(r"^\s*(.+?)\s+.+?のコース情報", title)
    if m:
        return m.group(1).strip()
    return ""


def _shotnavi_current_subcourse_id(soup: BeautifulSoup, course_id: int) -> Optional[int]:
    for selector in ("section .tab li.select a", "#course-list .box li.select a"):
        node = soup.select_one(selector)
        if not node or not node.get("href"):
            continue
        m = re.search(rf"cdata_{course_id}_(\d+)\.htm", node["href"])
        if m:
            return int(m.group(1))
    meta = soup.find("meta", attrs={"property": "og:url"})
    if meta and meta.get("content"):
        m = re.search(rf"cdata_{course_id}_(\d+)\.htm", meta["content"])
        if m:
            return int(m.group(1))
    return None


def _normalize_shotnavi_tee_id(label: str) -> str:
    raw = label.strip()
    lower = raw.lower()
    mappings = {
        "back": "back",
        "regular": "regular",
        "ladies": "ladies",
        "blue": "blue",
        "white": "white",
        "red": "red",
        "gold": "gold",
        "pink": "pink",
        "aグリーン": "a-green",
        "bグリーン": "b-green",
        "ベント": "bent",
        "高麗": "korai",
        "コーライ": "korai",
        "bent": "bent",
        "korai": "korai",
    }
    if lower in mappings:
        return mappings[lower]
    return re.sub(r"[^a-z0-9]+", "-", lower).strip("-") or "tee"


def _shotnavi_columns_map(parsed: Dict[str, Any]) -> Dict[str, Dict[int, int]]:
    return {col["label"]: col["yards_by_hole"] for col in parsed.get("columns", [])}


def _build_shotnavi_section(
    soup: BeautifulSoup,
    parsed: Dict[str, Any],
    *,
    source_url: str,
) -> Optional[Dict[str, Any]]:
    par_by_hole = parsed.get("par_by_hole") or {}
    columns_by_label = _shotnavi_columns_map(parsed)
    if not par_by_hole:
        return None

    club_name = _shotnavi_club_name(soup)
    section_label = _shotnavi_selected_section_label(soup)
    hole_numbers = sorted(par_by_hole.keys())

    tee_totals: List[Dict[str, Any]] = []
    for label, yards_by_hole in columns_by_label.items():
        total = sum(yards_by_hole.values())
        if total <= 0:
            continue
        tee_totals.append({
            "id": _normalize_shotnavi_tee_id(label),
            "label": label.upper() if re.fullmatch(r"[A-Za-z0-9 ]+", label) else label,
            "totalYards": total,
        })

    holes: List[Dict[str, Any]] = []
    for no in hole_numbers:
        yards = {
            _normalize_shotnavi_tee_id(label): by_hole[no]
            for label, by_hole in columns_by_label.items()
            if no in by_hole
        }
        hole: Dict[str, Any] = {"no": no, "par": par_by_hole.get(no)}
        if yards:
            hole["yards"] = yards
        holes.append(hole)

    primary_total = tee_totals[0]["totalYards"] if tee_totals else None
    return {
        "club_name": club_name,
        "label": section_label,
        "holes": holes,
        "tees": tee_totals,
        "totalPar": sum(par_by_hole.values()),
        "totalYards": primary_total,
        "source_url": source_url,
        "_columns_by_label": columns_by_label,
    }


def discover_subcourse_ids(soup: BeautifulSoup, course_id: int) -> List[int]:
    """OUTページの<a>リンクから、同じcourse_idの全サブコースIDを抽出。"""
    pattern = re.compile(rf"cdata_{course_id}_(\d+)\.htm")
    sub_ids = set()
    for a in soup.find_all("a", href=True):
        m = pattern.search(a["href"])
        if m:
            sid = int(m.group(1))
            if sid != 0:  # _0 は別扱い
                sub_ids.add(sid)
    return sorted(sub_ids)


def scrape_shotnavi(course_id: int, *, force: bool = False) -> Optional[Dict[str, Any]]:
    """全サブコース(OUT/IN/東/西/...) を自動発見して section 配列として返す。"""
    base = "https://shotnavi.jp/gcguide"
    main_url = f"{base}/cdata/cdata_{course_id}_0.htm"
    sections: List[Dict[str, Any]] = []
    fetched_urls: List[str] = []
    seen_keys = set()

    # Step 1: メインページ
    try:
        main_html = fetch(main_url, force=force)
    except requests.HTTPError as e:
        print(f"  ShotNavi {course_id} {main_url} fetch failed: {e}")
        return None
    fetched_urls.append(main_url)
    main_soup = BeautifulSoup(main_html, "html.parser")
    main_parsed = parse_shotnavi_data_table(main_soup)
    current_sid = _shotnavi_current_subcourse_id(main_soup, course_id)
    if main_parsed:
        section = _build_shotnavi_section(main_soup, main_parsed, source_url=main_url)
        if section:
            key = (
                section.get("label") or "",
                tuple(h["no"] for h in section.get("holes", [])),
            )
            if key not in seen_keys:
                seen_keys.add(key)
                sections.append(section)

    # Step 2: サブコースID自動発見
    sub_ids = discover_subcourse_ids(main_soup, course_id)
    print(f"  discovered sub-course IDs: {sub_ids}")

    # Step 3-4: 各サブコースを fetch / 解析 / マージ
    for sid in sub_ids:
        if current_sid is not None and sid == current_sid:
            continue
        sub_url = f"{base}/cdata/cdata_{course_id}_{sid}.htm"
        try:
            sub_html = fetch(sub_url, force=force)
        except requests.HTTPError as e:
            print(f"  ShotNavi {course_id} sub {sid} fetch failed: {e}")
            continue
        fetched_urls.append(sub_url)
        sub_soup = BeautifulSoup(sub_html, "html.parser")
        sub_parsed = parse_shotnavi_data_table(sub_soup)
        if not sub_parsed:
            # 空 (data-table div が "TOTAL 0" 等) は黙ってスキップ
            continue
        section = _build_shotnavi_section(sub_soup, sub_parsed, source_url=sub_url)
        if not section:
            continue
        key = (
            section.get("label") or "",
            tuple(h["no"] for h in section.get("holes", [])),
        )
        if key in seen_keys:
            continue
        seen_keys.add(key)
        sections.append(section)

    if not sections:
        print(f"  ShotNavi {course_id}: 全サブコースで data 取得失敗")
        return None

    # backward-compatible summary
    if len(sections) == 1:
        summary_holes = sections[0]["holes"]
        summary_tees = sections[0]["tees"]
        summary_total_par = sections[0]["totalPar"]
        summary_total_yards = sections[0]["totalYards"]
        summary_columns = sections[0].get("_columns_by_label", {})
    else:
        summary_holes = sections[0]["holes"]
        summary_tees = sections[0]["tees"]
        summary_total_par = sections[0]["totalPar"]
        summary_total_yards = sections[0]["totalYards"]
        summary_columns = sections[0].get("_columns_by_label", {})

    return {
        "holes": summary_holes,
        "tees": summary_tees,
        "totalPar": summary_total_par,
        "totalYards": summary_total_yards,
        "source_url": ", ".join(fetched_urls),
        "_columns_by_label": summary_columns,
        "_sections": sections,
    }


# ──────────────────────────────────────────────────────────────────
# Course config
# ──────────────────────────────────────────────────────────────────

COURSES: Dict[str, Dict[str, Any]] = {
    "akabane-gc": {
        "displayName": "赤羽ゴルフ倶楽部",
        "kana": "あかばねごるふくらぶ",
        "prefecture": "東京都",
        "city": "北区",
        "area": "東京",
        "type": "河川敷",
        "website": "https://www.akabanegolf.co.jp/",
        # 公式サイトに 5ティー × 2グリーン の完全データがあるので、
        # それを使う (ShotNavi は BACK ティーのみで不十分)
        "scraper": "akabane_official",
    },
    "koshigaya-gc": {
        "displayName": "KOSHIGAYA GOLF CLUB",
        "kana": "こしがやごるふくらぶ",
        "prefecture": "埼玉県",
        "city": "吉川市",
        "area": "埼玉東部",
        "type": "河川敷",
        "website": "https://www.pacificgolf.co.jp/koshigaya/",
        "scraper": "pgm_official",
        "pgm_cc_id": 54,
    },
    # ── ShotNavi 追加 (未カバー県の着手) ──
    "shotnavi-aomori-cc": {
        "displayName": "青森カントリー倶楽部",
        "kana": "",
        "prefecture": "青森県",
        "city": "",
        "area": "青森",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1141.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1141,
    },
    "shotnavi-maple-cc": {
        "displayName": "メイプルカントリークラブ",
        "kana": "",
        "prefecture": "岩手県",
        "city": "",
        "area": "岩手",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_267.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 267,
    },
    "shotnavi-northampton-gc": {
        "displayName": "ノースハンプトンゴルフ倶楽部",
        "kana": "",
        "prefecture": "秋田県",
        "city": "",
        "area": "秋田",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1026.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1026,
    },
    "shotnavi-tonami-royal-gc": {
        "displayName": "トナミロイヤルゴルフ倶楽部",
        "kana": "",
        "prefecture": "富山県",
        "city": "",
        "area": "富山",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1802.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1802,
    },
    "shotnavi-sunpia-gc": {
        "displayName": "サンピアゴルフクラブ",
        "kana": "",
        "prefecture": "徳島県",
        "city": "",
        "area": "徳島",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1621.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1621,
    },
    "shotnavi-aomori-spring-gc": {
        "displayName": "青森スプリング・ゴルフクラブ",
        "kana": "",
        "prefecture": "青森県",
        "city": "",
        "area": "青森",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1137.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1137,
    },
    "shotnavi-aomori-royal-gc": {
        "displayName": "青森ロイヤルゴルフクラブ",
        "kana": "",
        "prefecture": "青森県",
        "city": "",
        "area": "青森",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1142.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1142,
    },
    "shotnavi-towada-kokusai-cc": {
        "displayName": "十和田国際カントリークラブ",
        "kana": "",
        "prefecture": "青森県",
        "city": "",
        "area": "青森",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1140.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1140,
    },
    "shotnavi-appi-kogen-gc": {
        "displayName": "安比高原ゴルフクラブ",
        "kana": "",
        "prefecture": "岩手県",
        "city": "",
        "area": "岩手",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_268.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 268,
    },
    "shotnavi-ichinoseki-cc": {
        "displayName": "一関カントリークラブ",
        "kana": "",
        "prefecture": "岩手県",
        "city": "",
        "area": "岩手",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_269.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 269,
    },
    "shotnavi-morioka-cc": {
        "displayName": "盛岡カントリークラブ",
        "kana": "",
        "prefecture": "岩手県",
        "city": "",
        "area": "岩手",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_281.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 281,
    },
    "shotnavi-akita-taiheizan-cc": {
        "displayName": "秋田太平山カントリークラブ",
        "kana": "",
        "prefecture": "秋田県",
        "city": "",
        "area": "秋田",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1031.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1031,
    },
    "shotnavi-akita-tsubakidai-cc": {
        "displayName": "秋田椿台カントリークラブ",
        "kana": "",
        "prefecture": "秋田県",
        "city": "",
        "area": "秋田",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1032.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1032,
    },
    "shotnavi-royal-century-gc": {
        "displayName": "ロイヤルセンチュリーゴルフ倶楽部",
        "kana": "",
        "prefecture": "秋田県",
        "city": "",
        "area": "秋田",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1027.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1027,
    },
    "shotnavi-uozu-kokusai-cc": {
        "displayName": "魚津国際カントリークラブ",
        "kana": "",
        "prefecture": "富山県",
        "city": "",
        "area": "富山",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1805.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1805,
    },
    "shotnavi-kureha-cc": {
        "displayName": "呉羽カントリークラブ",
        "kana": "",
        "prefecture": "富山県",
        "city": "",
        "area": "富山",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1806.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1806,
    },
    "shotnavi-himi-cc": {
        "displayName": "氷見カントリークラブ",
        "kana": "",
        "prefecture": "富山県",
        "city": "",
        "area": "富山",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1814.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1814,
    },
    "shotnavi-jclassic-gc": {
        "displayName": "Jクラシックゴルフクラブ",
        "kana": "",
        "prefecture": "徳島県",
        "city": "",
        "area": "徳島",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1619.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1619,
    },
    "shotnavi-naruto-cc": {
        "displayName": "鳴門カントリークラブ",
        "kana": "",
        "prefecture": "徳島県",
        "city": "",
        "area": "徳島",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1632.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1632,
    },
    "shotnavi-grandee-naruto-gc36": {
        "displayName": "グランディ鳴門ゴルフクラブ36",
        "kana": "",
        "prefecture": "徳島県",
        "city": "",
        "area": "徳島",
        "type": "",
        "website": "https://shotnavi.jp/gcguide/gcinfo_1627.htm",
        "scraper": "shotnavi",
        "shotnavi_id": 1627,
    },
    # ── 関東・甲信越 PGM コース (auto-discovered 2026-05-11) ──
    "pgm-40": {
        "displayName": "グランドスラムカントリークラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "常陸太田市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/40.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 40,
    },
    "pgm-39": {
        "displayName": "扶桑カントリー倶楽部",
        "kana": "",
        "prefecture": "茨城県",
        "city": "笠間市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/39.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 39,
    },
    "pgm-38": {
        "displayName": "カントリークラブ ザ・レイクス",
        "kana": "",
        "prefecture": "茨城県",
        "city": "笠間市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/38.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 38,
    },
    "pgm-41": {
        "displayName": "玉造ゴルフ倶楽部 若海コース",
        "kana": "",
        "prefecture": "茨城県",
        "city": "行方市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/41.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 41,
    },
    "pgm-42": {
        "displayName": "玉造ゴルフ倶楽部 捻木コース",
        "kana": "",
        "prefecture": "茨城県",
        "city": "行方市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/42.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 42,
    },
    "pgm-43": {
        "displayName": "霞ヶ浦カントリー倶楽部",
        "kana": "",
        "prefecture": "茨城県",
        "city": "行方市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/43.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 43,
    },
    "pgm-44": {
        "displayName": "笠間カントリークラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "笠間市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/44.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 44,
    },
    "pgm-47": {
        "displayName": "阿見ゴルフクラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "稲敷郡阿見町",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/47.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 47,
    },
    "pgm-52": {
        "displayName": "ザ・インペリアルカントリークラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "稲敷市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/52.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 52,
    },
    "pgm-45": {
        "displayName": "勝田ゴルフ倶楽部",
        "kana": "",
        "prefecture": "茨城県",
        "city": "ひたちなか市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/45.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 45,
    },
    "pgm-46": {
        "displayName": "スプリングフィルズゴルフクラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "筑西市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/46.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 46,
    },
    "pgm-151": {
        "displayName": "内原カントリー倶楽部",
        "kana": "",
        "prefecture": "茨城県",
        "city": "水戸市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/151.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 151,
    },
    "pgm-157": {
        "displayName": "鹿島の杜カントリー倶楽部",
        "kana": "",
        "prefecture": "茨城県",
        "city": "鹿嶋市",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/157.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 157,
    },
    "pgm-172": {
        "displayName": "オールドオーチャードゴルフクラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "東茨城郡茨城町",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/172.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 172,
    },
    "pgm-49": {
        "displayName": "セゴビアゴルフクラブ イン チヨダ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/49.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 49,
    },
    "pgm-51": {
        "displayName": "千代田カントリークラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/51.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 51,
    },
    "pgm-48": {
        "displayName": "美浦ゴルフ倶楽部",
        "kana": "",
        "prefecture": "茨城県",
        "city": "",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/48.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 48,
    },
    "pgm-53": {
        "displayName": "ザ・ゴルフクラブ竜ヶ崎",
        "kana": "",
        "prefecture": "茨城県",
        "city": "",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/53.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 53,
    },
    "pgm-167": {
        "displayName": "ＰＧＭ石岡ゴルフクラブ",
        "kana": "",
        "prefecture": "茨城県",
        "city": "",
        "area": "茨城",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/167.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 167,
    },
    "pgm-30": {
        "displayName": "千成ゴルフクラブ",
        "kana": "",
        "prefecture": "栃木県",
        "city": "大田原市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/30.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 30,
    },
    "pgm-34": {
        "displayName": "皐月ゴルフ倶楽部 鹿沼コース",
        "kana": "",
        "prefecture": "栃木県",
        "city": "鹿沼市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/34.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 34,
    },
    "pgm-35": {
        "displayName": "皐月ゴルフ倶楽部 佐野コース",
        "kana": "",
        "prefecture": "栃木県",
        "city": "佐野市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/35.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 35,
    },
    "pgm-27": {
        "displayName": "大日向カントリー倶楽部",
        "kana": "",
        "prefecture": "栃木県",
        "city": "さくら市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/27.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 27,
    },
    "pgm-31": {
        "displayName": "ピートダイゴルフクラブ VIPコース",
        "kana": "",
        "prefecture": "栃木県",
        "city": "日光市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/31.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 31,
    },
    "pgm-32": {
        "displayName": "ピートダイゴルフクラブ ロイヤルコース",
        "kana": "",
        "prefecture": "栃木県",
        "city": "日光市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/32.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 32,
    },
    "pgm-26": {
        "displayName": "エヴァンタイユゴルフクラブ",
        "kana": "",
        "prefecture": "栃木県",
        "city": "栃木市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/26.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 26,
    },
    "pgm-37": {
        "displayName": "ハーモニーヒルズ ゴルフクラブ",
        "kana": "",
        "prefecture": "栃木県",
        "city": "栃木市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/37.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 37,
    },
    "pgm-146": {
        "displayName": "あさひヶ丘カントリークラブ",
        "kana": "",
        "prefecture": "栃木県",
        "city": "栃木市",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/146.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 146,
    },
    "pgm-33": {
        "displayName": "プレステージカントリークラブ",
        "kana": "",
        "prefecture": "栃木県",
        "city": "",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/33.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 33,
    },
    "pgm-36": {
        "displayName": "サンヒルズカントリークラブ",
        "kana": "",
        "prefecture": "栃木県",
        "city": "",
        "area": "栃木",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/36.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 36,
    },
    "pgm-74": {
        "displayName": "PGM富岡カントリークラブ サウスコース",
        "kana": "",
        "prefecture": "群馬県",
        "city": "富岡市",
        "area": "群馬",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/74.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 74,
    },
    "pgm-165": {
        "displayName": "PGM富岡カントリークラブ ノースコース",
        "kana": "",
        "prefecture": "群馬県",
        "city": "富岡市",
        "area": "群馬",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/165.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 165,
    },
    "pgm-55": {
        "displayName": "京カントリークラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "山武郡芝山町",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/55.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 55,
    },
    "pgm-50": {
        "displayName": "クリアビューゴルフクラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "野田市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/50.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 50,
    },
    "pgm-60": {
        "displayName": "成田の森カントリークラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "香取市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/60.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 60,
    },
    "pgm-58": {
        "displayName": "長太郎カントリークラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "成田市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/58.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 58,
    },
    "pgm-56": {
        "displayName": "丸の内倶楽部",
        "kana": "",
        "prefecture": "千葉県",
        "city": "長生郡長柄町",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/56.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 56,
    },
    "pgm-61": {
        "displayName": "アバイディングクラブ ゴルフソサエティ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "長生郡長南町",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/61.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 61,
    },
    "pgm-59": {
        "displayName": "イーグルレイク ゴルフクラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "山武郡芝山町",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/59.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 59,
    },
    "pgm-63": {
        "displayName": "総武カントリークラブ 印旛コース",
        "kana": "",
        "prefecture": "千葉県",
        "city": "印西市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/63.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 63,
    },
    "pgm-64": {
        "displayName": "総武カントリークラブ 北コース",
        "kana": "",
        "prefecture": "千葉県",
        "city": "印西市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/64.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 64,
    },
    "pgm-65": {
        "displayName": "ムーンレイク ゴルフクラブ 茂原コース",
        "kana": "",
        "prefecture": "千葉県",
        "city": "茂原市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/65.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 65,
    },
    "pgm-141": {
        "displayName": "ムーンレイク ゴルフクラブ 市原コース",
        "kana": "",
        "prefecture": "千葉県",
        "city": "市原市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/141.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 141,
    },
    "pgm-143": {
        "displayName": "ムーンレイク ゴルフクラブ 鶴舞コース",
        "kana": "",
        "prefecture": "千葉県",
        "city": "市原市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/143.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 143,
    },
    "pgm-150": {
        "displayName": "総丘カントリー倶楽部",
        "kana": "",
        "prefecture": "千葉県",
        "city": "富津市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/150.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 150,
    },
    "pgm-152": {
        "displayName": "千葉国際カントリークラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "長生郡長柄町",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/152.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 152,
    },
    "pgm-161": {
        "displayName": "南総ヒルズカントリークラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "富津市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/161.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 161,
    },
    "pgm-159": {
        "displayName": "東京ベイサイドゴルフコース",
        "kana": "",
        "prefecture": "千葉県",
        "city": "富津市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/159.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 159,
    },
    "pgm-164": {
        "displayName": "大多喜カントリークラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "夷隅郡大多喜町",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/164.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 164,
    },
    "pgm-168": {
        "displayName": "PGM南市原ゴルフクラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "市原市",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/168.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 168,
    },
    "pgm-62": {
        "displayName": "総武カントリークラブ 総武コース",
        "kana": "",
        "prefecture": "千葉県",
        "city": "",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/62.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 62,
    },
    "pgm-163": {
        "displayName": "ＰＧＭ総成ゴルフクラブ",
        "kana": "",
        "prefecture": "千葉県",
        "city": "",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/163.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 163,
    },
    "pgm-170": {
        "displayName": "ＰＧＭマリアゴルフリンクス",
        "kana": "",
        "prefecture": "千葉県",
        "city": "",
        "area": "千葉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/170.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 170,
    },
    "pgm-72": {
        "displayName": "岡部チサンカントリークラブ",
        "kana": "",
        "prefecture": "埼玉県",
        "city": "深谷市",
        "area": "埼玉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/72.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 72,
    },
    "pgm-75": {
        "displayName": "飯能くすの樹カントリー倶楽部",
        "kana": "",
        "prefecture": "埼玉県",
        "city": "飯能市",
        "area": "埼玉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/75.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 75,
    },
    "pgm-78": {
        "displayName": "新城カントリー倶楽部",
        "kana": "",
        "prefecture": "愛知県",
        "city": "",
        "area": "愛知",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/78.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 78,
    },
    "pgm-80": {
        "displayName": "多治見北ゴルフ倶楽部",
        "kana": "",
        "prefecture": "岐阜県",
        "city": "",
        "area": "岐阜",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/80.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 80,
    },
    "pgm-82": {
        "displayName": "花の木ゴルフクラブ",
        "kana": "",
        "prefecture": "岐阜県",
        "city": "",
        "area": "岐阜",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/82.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 82,
    },
    "pgm-83": {
        "displayName": "名古屋ヒルズゴルフ倶楽部 ローズコース",
        "kana": "",
        "prefecture": "岐阜県",
        "city": "",
        "area": "岐阜",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/83.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 83,
    },
    "pgm-84": {
        "displayName": "相良カントリー倶楽部",
        "kana": "",
        "prefecture": "静岡県",
        "city": "",
        "area": "静岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/84.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 84,
    },
    "pgm-85": {
        "displayName": "三木の里カントリークラブ",
        "kana": "",
        "prefecture": "静岡県",
        "city": "",
        "area": "静岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/85.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 85,
    },
    "pgm-86": {
        "displayName": "亀山ゴルフクラブ",
        "kana": "",
        "prefecture": "三重県",
        "city": "",
        "area": "三重",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/86.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 86,
    },
    "pgm-87": {
        "displayName": "かさぎゴルフ倶楽部",
        "kana": "",
        "prefecture": "京都府",
        "city": "",
        "area": "京都",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/87.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 87,
    },
    "pgm-88": {
        "displayName": "枚方国際ゴルフ倶楽部",
        "kana": "",
        "prefecture": "大阪府",
        "city": "",
        "area": "大阪",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/88.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 88,
    },
    "pgm-89": {
        "displayName": "木津川カントリー倶楽部",
        "kana": "",
        "prefecture": "奈良県",
        "city": "",
        "area": "奈良",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/89.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 89,
    },
    "pgm-90": {
        "displayName": "名阪チサンカントリークラブ",
        "kana": "",
        "prefecture": "三重県",
        "city": "",
        "area": "三重",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/90.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 90,
    },
    "pgm-71": {
        "displayName": "富貴ゴルフ倶楽部",
        "kana": "",
        "prefecture": "埼玉県",
        "city": "比企郡吉見町",
        "area": "埼玉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/71.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 71,
    },
    "pgm-169": {
        "displayName": "ＰＧＭ武蔵ゴルフクラブ",
        "kana": "",
        "prefecture": "埼玉県",
        "city": "",
        "area": "埼玉",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/169.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 169,
    },
    "pgm-66": {
        "displayName": "秦野カントリークラブ",
        "kana": "",
        "prefecture": "神奈川県",
        "city": "秦野市",
        "area": "神奈川",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/66.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 66,
    },
    "pgm-68": {
        "displayName": "東名厚木カントリー倶楽部",
        "kana": "",
        "prefecture": "神奈川県",
        "city": "愛甲郡愛川町",
        "area": "神奈川",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/68.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 68,
    },
    "pgm-67": {
        "displayName": "富士チサンカントリークラブ",
        "kana": "",
        "prefecture": "静岡県",
        "city": "",
        "area": "静岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/67.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 67,
    },
    "pgm-154": {
        "displayName": "伊勢原カントリークラブ",
        "kana": "",
        "prefecture": "神奈川県",
        "city": "伊勢原市",
        "area": "神奈川",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/154.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 154,
    },
    "pgm-153": {
        "displayName": "大秦野カントリークラブ",
        "kana": "",
        "prefecture": "神奈川県",
        "city": "秦野市",
        "area": "神奈川",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/153.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 153,
    },
    "pgm-69": {
        "displayName": "中央都留カントリー倶楽部",
        "kana": "",
        "prefecture": "山梨県",
        "city": "都留市",
        "area": "山梨",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/69.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 69,
    },
    "pgm-70": {
        "displayName": "中央道晴ヶ峰カントリー倶楽部",
        "kana": "",
        "prefecture": "長野県",
        "city": "伊那市",
        "area": "長野",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/70.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 70,
    },
    "pgm-22": {
        "displayName": "中峰ゴルフ倶楽部",
        "kana": "",
        "prefecture": "新潟県",
        "city": "新発田市",
        "area": "新潟",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/22.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 22,
    },
    "pgm-145": {
        "displayName": "三島ゴルフ倶楽部",
        "kana": "",
        "prefecture": "静岡県",
        "city": "",
        "area": "静岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/145.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 145,
    },
    "pgm-166": {
        "displayName": "御殿場東名ゴルフクラブ",
        "kana": "",
        "prefecture": "静岡県",
        "city": "",
        "area": "静岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/166.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 166,
    },
    "pgm-173": {
        "displayName": "PGM御殿場カントリークラブ",
        "kana": "",
        "prefecture": "静岡県",
        "city": "",
        "area": "静岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/173.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 173,
    },
    "pgm-148": {
        "displayName": "山岡カントリークラブ",
        "kana": "",
        "prefecture": "岐阜県",
        "city": "",
        "area": "岐阜",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/148.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 148,
    },
    "pgm-149": {
        "displayName": "笹平カントリー倶楽部",
        "kana": "",
        "prefecture": "岐阜県",
        "city": "",
        "area": "岐阜",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/149.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 149,
    },
    "pgm-155": {
        "displayName": "福岡国際カントリークラブ",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/155.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 155,
    },
    "pgm-158": {
        "displayName": "滋賀ゴルフ倶楽部",
        "kana": "",
        "prefecture": "滋賀県",
        "city": "",
        "area": "滋賀",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/158.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 158,
    },
    "pgm-162": {
        "displayName": "神戸グランドヒルゴルフクラブ",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/162.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 162,
    },
    "pgm-144": {
        "displayName": "ムーンレイクゴルフクラブ 鞍手コース",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/144.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 144,
    },
    "pgm-156": {
        "displayName": "ニューキャピタルゴルフ倶楽部",
        "kana": "",
        "prefecture": "岐阜県",
        "city": "",
        "area": "岐阜",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/156.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 156,
    },
    "pgm-160": {
        "displayName": "福岡レイクサイドカントリークラブ",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/160.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 160,
    },
    "pgm-171": {
        "displayName": "ＰＧＭ池田カントリークラブ",
        "kana": "",
        "prefecture": "大阪府",
        "city": "",
        "area": "大阪",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/171.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 171,
    },
    "pgm-91": {
        "displayName": "岸和田カントリー倶楽部",
        "kana": "",
        "prefecture": "大阪府",
        "city": "",
        "area": "大阪",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/91.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 91,
    },
    "pgm-92": {
        "displayName": "関西空港ゴルフ倶楽部",
        "kana": "",
        "prefecture": "大阪府",
        "city": "",
        "area": "大阪",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/92.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 92,
    },
    "pgm-93": {
        "displayName": "法隆寺カントリー倶楽部",
        "kana": "",
        "prefecture": "奈良県",
        "city": "",
        "area": "奈良",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/93.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 93,
    },
    "pgm-94": {
        "displayName": "貴志川ゴルフ倶楽部",
        "kana": "",
        "prefecture": "和歌山県",
        "city": "",
        "area": "和歌山",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/94.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 94,
    },
    "pgm-95": {
        "displayName": "近江ヒルズゴルフ倶楽部",
        "kana": "",
        "prefecture": "滋賀県",
        "city": "",
        "area": "滋賀",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/95.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 95,
    },
    "pgm-96": {
        "displayName": "茨木国際ゴルフ倶楽部",
        "kana": "",
        "prefecture": "大阪府",
        "city": "",
        "area": "大阪",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/96.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 96,
    },
    "pgm-98": {
        "displayName": "大宝塚ゴルフクラブ",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/98.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 98,
    },
    "pgm-99": {
        "displayName": "アークよかわゴルフ倶楽部",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/99.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 99,
    },
    "pgm-100": {
        "displayName": "フォレスト三木ゴルフ倶楽部",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/100.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 100,
    },
    "pgm-101": {
        "displayName": "ライオンズカントリー倶楽部",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/101.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 101,
    },
    "pgm-102": {
        "displayName": "ヤシロカントリークラブ",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/102.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 102,
    },
    "pgm-103": {
        "displayName": "三日月カントリークラブ",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/103.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 103,
    },
    "pgm-104": {
        "displayName": "神有カントリー倶楽部",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/104.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 104,
    },
    "pgm-106": {
        "displayName": "たけべの森ゴルフ倶楽部",
        "kana": "",
        "prefecture": "岡山県",
        "city": "",
        "area": "岡山",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/106.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 106,
    },
    "pgm-107": {
        "displayName": "赤坂レイクサイド・カントリークラブ",
        "kana": "",
        "prefecture": "岡山県",
        "city": "",
        "area": "岡山",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/107.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 107,
    },
    "pgm-108": {
        "displayName": "笠岡カントリー倶楽部",
        "kana": "",
        "prefecture": "岡山県",
        "city": "",
        "area": "岡山",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/108.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 108,
    },
    "pgm-110": {
        "displayName": "岡山国際ゴルフ倶楽部",
        "kana": "",
        "prefecture": "岡山県",
        "city": "",
        "area": "岡山",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/110.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 110,
    },
    "pgm-111": {
        "displayName": "琴平カントリー倶楽部",
        "kana": "",
        "prefecture": "香川県",
        "city": "",
        "area": "香川",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/111.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 111,
    },
    "pgm-113": {
        "displayName": "大山アークカントリークラブ",
        "kana": "",
        "prefecture": "鳥取県",
        "city": "",
        "area": "鳥取",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/113.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 113,
    },
    "pgm-115": {
        "displayName": "土佐山田ゴルフ倶楽部",
        "kana": "",
        "prefecture": "高知県",
        "city": "",
        "area": "高知",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/115.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 115,
    },
    "pgm-116": {
        "displayName": "チサンカントリークラブ北条",
        "kana": "",
        "prefecture": "愛媛県",
        "city": "",
        "area": "愛媛",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/116.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 116,
    },
    "pgm-117": {
        "displayName": "柳井カントリー倶楽部",
        "kana": "",
        "prefecture": "山口県",
        "city": "",
        "area": "山口",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/117.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 117,
    },
    "pgm-118": {
        "displayName": "尾道ゴルフ倶楽部",
        "kana": "",
        "prefecture": "広島県",
        "city": "",
        "area": "広島",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/118.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 118,
    },
    "pgm-119": {
        "displayName": "広島国際ゴルフ倶楽部",
        "kana": "",
        "prefecture": "広島県",
        "city": "",
        "area": "広島",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/119.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 119,
    },
    "pgm-120": {
        "displayName": "松山国際ゴルフ倶楽部",
        "kana": "",
        "prefecture": "愛媛県",
        "city": "",
        "area": "愛媛",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/120.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 120,
    },
    "pgm-121": {
        "displayName": "宇和島カントリー倶楽部",
        "kana": "",
        "prefecture": "愛媛県",
        "city": "",
        "area": "愛媛",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/121.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 121,
    },
    "pgm-123": {
        "displayName": "松山ロイヤルゴルフ倶楽部",
        "kana": "",
        "prefecture": "愛媛県",
        "city": "",
        "area": "愛媛",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/123.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 123,
    },
    "pgm-124": {
        "displayName": "東広島カントリークラブ",
        "kana": "",
        "prefecture": "広島県",
        "city": "",
        "area": "広島",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/124.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 124,
    },
    "pgm-125": {
        "displayName": "若木ゴルフ倶楽部",
        "kana": "",
        "prefecture": "佐賀県",
        "city": "",
        "area": "佐賀",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/125.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 125,
    },
    "pgm-126": {
        "displayName": "チサンカントリークラブ遠賀",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/126.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 126,
    },
    "pgm-127": {
        "displayName": "チサンカントリークラブ森山",
        "kana": "",
        "prefecture": "長崎県",
        "city": "",
        "area": "長崎",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/127.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 127,
    },
    "pgm-128": {
        "displayName": "皐月ゴルフ倶楽部 竜王コース",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/128.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 128,
    },
    "pgm-129": {
        "displayName": "皐月ゴルフ倶楽部 天拝コース",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/129.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 129,
    },
    "pgm-130": {
        "displayName": "大博多カントリー倶楽部",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/130.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 130,
    },
    "pgm-131": {
        "displayName": "北九州カントリー倶楽部",
        "kana": "",
        "prefecture": "福岡県",
        "city": "",
        "area": "福岡",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/131.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 131,
    },
    "pgm-132": {
        "displayName": "大分富士見カントリー倶楽部",
        "kana": "",
        "prefecture": "大分県",
        "city": "",
        "area": "大分",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/132.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 132,
    },
    "pgm-133": {
        "displayName": "別府ゴルフ倶楽部",
        "kana": "",
        "prefecture": "大分県",
        "city": "",
        "area": "大分",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/133.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 133,
    },
    "pgm-135": {
        "displayName": "チサンカントリークラブ御船",
        "kana": "",
        "prefecture": "熊本県",
        "city": "",
        "area": "熊本",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/135.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 135,
    },
    "pgm-136": {
        "displayName": "ワールドカントリー倶楽部",
        "kana": "",
        "prefecture": "熊本県",
        "city": "",
        "area": "熊本",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/136.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 136,
    },
    "pgm-137": {
        "displayName": "宮崎国際ゴルフ倶楽部",
        "kana": "",
        "prefecture": "宮崎県",
        "city": "",
        "area": "宮崎",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/137.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 137,
    },
    "pgm-138": {
        "displayName": "ＰＧＭゴルフリゾート沖縄",
        "kana": "",
        "prefecture": "沖縄県",
        "city": "",
        "area": "沖縄",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/138.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 138,
    },
    "pgm-140": {
        "displayName": "入来城山ゴルフ倶楽部",
        "kana": "",
        "prefecture": "鹿児島県",
        "city": "",
        "area": "鹿児島",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/140.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 140,
    },
    "pgm-174": {
        "displayName": "武庫ノ台ゴルフコース",
        "kana": "",
        "prefecture": "兵庫県",
        "city": "",
        "area": "兵庫",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/174.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 174,
    },
    "pgm-175": {
        "displayName": "一志ゴルフ倶楽部",
        "kana": "",
        "prefecture": "三重県",
        "city": "",
        "area": "三重",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/175.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 175,
    },
    "pgm-176": {
        "displayName": "竜王ゴルフコース",
        "kana": "",
        "prefecture": "滋賀県",
        "city": "",
        "area": "滋賀",
        "type": "",
        "website": "https://booking.pacificgolf.co.jp/guide/176.html",
        "scraper": "pgm_official",
        "pgm_cc_id": 176,
    },

    # ── Accordia Golf 関東コース ──────────────────────────────────────
    # 茨城
    "accordia-ishioka-west": {
        "displayName": "石岡ウエストカントリークラブ",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/ishioka_west/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "ishioka_west",
    },
    "accordia-okadaira": {
        "displayName": "おかだいらゴルフリンクス",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/okadaira/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "okadaira",
    },
    "accordia-kasumigaura": {
        "displayName": "かすみがうらゴルフクラブ",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/kasumigaura/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "kasumigaura",
    },
    "accordia-kasumidai": {
        "displayName": "霞台カントリークラブ",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/kasumidai/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "kasumidai",
    },
    "accordia-central": {
        "displayName": "セントラルゴルフクラブ",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/central/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "central",
    },
    "accordia-central-new": {
        "displayName": "セントラルゴルフクラブ NEWコース",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/central_new/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "central_new",
    },
    "accordia-central-aso": {
        "displayName": "セントラルゴルフクラブ 麻生コース",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/central_aso/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "central_aso",
    },
    "accordia-tsuchiura": {
        "displayName": "土浦カントリー倶楽部",
        "kana": "", "prefecture": "茨城県", "city": "土浦市", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/tsuchiura/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "tsuchiura",
    },
    "accordia-dejima": {
        "displayName": "出島ゴルフクラブ",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/dejima/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "dejima",
    },
    "accordia-toride": {
        "displayName": "取手桜が丘ゴルフクラブ",
        "kana": "", "prefecture": "茨城県", "city": "取手市", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/toride/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "toride",
    },
    "accordia-mito": {
        "displayName": "水戸・ゴルフ・クラブ",
        "kana": "", "prefecture": "茨城県", "city": "水戸市", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/mito/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "mito",
    },
    "accordia-wildduck": {
        "displayName": "ワイルドダックカントリークラブ",
        "kana": "", "prefecture": "茨城県", "city": "", "area": "茨城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ibaraki/wildduck/",
        "scraper": "accordia", "accordia_pref": "ibaraki", "accordia_slug": "wildduck",
    },
    # 栃木
    "accordia-azaleahills": {
        "displayName": "アゼリアヒルズカントリークラブ",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/azaleahills/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "azaleahills",
    },
    "accordia-iwafune": {
        "displayName": "岩舟ゴルフクラブ",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/iwafune/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "iwafune",
    },
    "accordia-ohiradai": {
        "displayName": "大平台カントリークラブ",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/ohiradai/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "ohiradai",
    },
    "accordia-kantokokusai": {
        "displayName": "関東国際カントリークラブ",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/kantokokusai/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "kantokokusai",
    },
    "accordia-kitsuregawa": {
        "displayName": "喜連川カントリー倶楽部",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/kitsuregawa/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "kitsuregawa",
    },
    "accordia-koryo": {
        "displayName": "広陵カントリークラブ",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/koryo/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "koryo",
    },
    "accordia-deerlake": {
        "displayName": "ディアレイク・カントリー倶楽部",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/deerlake/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "deerlake",
    },
    "accordia-hitotonoya": {
        "displayName": "ひととのやカントリー倶楽部",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/hitotonoya/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "hitotonoya",
    },
    "accordia-minagawajo": {
        "displayName": "皆川城カントリークラブ",
        "kana": "", "prefecture": "栃木県", "city": "", "area": "栃木", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tochigi/minagawajo/",
        "scraper": "accordia", "accordia_pref": "tochigi", "accordia_slug": "minagawajo",
    },
    # 群馬
    "accordia-kanetsu": {
        "displayName": "関越ハイランドゴルフクラブ",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/kanetsu/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "kanetsu",
    },
    "accordia-kanra": {
        "displayName": "甘楽カントリークラブ",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/kanra/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "kanra",
    },
    "accordia-twin": {
        "displayName": "ツインレイクスカントリー倶楽部",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/twin/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "twin",
    },
    "accordia-akagi": {
        "displayName": "ノーザンカントリークラブ 赤城ゴルフ場",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/akagi/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "akagi",
    },
    "accordia-jyomo": {
        "displayName": "ノーザンカントリークラブ 上毛ゴルフ場",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/jyomo/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "jyomo",
    },
    "accordia-fujioka": {
        "displayName": "藤岡ゴルフクラブ",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/fujioka/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "fujioka",
    },
    "accordia-midono": {
        "displayName": "緑野カントリークラブ",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/midono/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "midono",
    },
    "accordia-myogi": {
        "displayName": "妙義カントリークラブ",
        "kana": "", "prefecture": "群馬県", "city": "", "area": "群馬", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gunma/myogi/",
        "scraper": "accordia", "accordia_pref": "gunma", "accordia_slug": "myogi",
    },
    # 埼玉
    "accordia-adoniso": {
        "displayName": "アドニス小川カントリー倶楽部",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/adoniso/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "adoniso",
    },
    "accordia-oomurasaki": {
        "displayName": "おおむらさきゴルフ倶楽部",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/oomurasaki/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "oomurasaki",
    },
    "accordia-kodama": {
        "displayName": "こだま神川カントリークラブ",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/kodama/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "kodama",
    },
    "accordia-saitamagc": {
        "displayName": "さいたまゴルフクラブ",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/saitamagc/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "saitamagc",
    },
    "accordia-sainomori": {
        "displayName": "彩の森カントリークラブ",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/sainomori/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "sainomori",
    },
    "accordia-tamagawa": {
        "displayName": "玉川カントリークラブ",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/tamagawa/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "tamagawa",
    },
    "accordia-chichibu": {
        "displayName": "秩父国際カントリークラブ",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/chichibu/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "chichibu",
    },
    "accordia-nishikigahara": {
        "displayName": "ノーザンカントリークラブ 錦ヶ原ゴルフ場",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/nishikigahara/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "nishikigahara",
    },
    "accordia-yorii": {
        "displayName": "寄居カントリークラブ",
        "kana": "", "prefecture": "埼玉県", "city": "", "area": "埼玉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saitama/yorii/",
        "scraper": "accordia", "accordia_pref": "saitama", "accordia_slug": "yorii",
    },
    # 千葉
    "accordia-aqualine": {
        "displayName": "アクアラインゴルフクラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/aqualine/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "aqualine",
    },
    "accordia-shizu": {
        "displayName": "アコーディア・ガーデン志津",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/shizu/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "shizu",
    },
    "accordia-kazusa": {
        "displayName": "かずさカントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/kazusa/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "kazusa",
    },
    "accordia-kamogawa": {
        "displayName": "鴨川カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/kamogawa/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "kamogawa",
    },
    "accordia-oakhills": {
        "displayName": "オーク・ヒルズカントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "香取市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/oakhills/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "oakhills",
    },
    "accordia-glenoaks": {
        "displayName": "グレンオークスカントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "香取市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/glenoaks/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "glenoaks",
    },
    "accordia-narashino": {
        "displayName": "習志野カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "印西市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/narashino/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "narashino",
    },
    "accordia-narita": {
        "displayName": "成田ゴルフ倶楽部",
        "kana": "", "prefecture": "千葉県", "city": "成田市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/narita/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "narita",
    },
    "accordia-higashichiba": {
        "displayName": "東千葉カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "東金市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/higashichiba/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "higashichiba",
    },
    "accordia-kukocourse": {
        "displayName": "空港ゴルフコース 成田",
        "kana": "", "prefecture": "千葉県", "city": "成田市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/kukocourse/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "kukocourse",
    },
    "accordia-sawara": {
        "displayName": "佐原カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/sawara/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "sawara",
    },
    "accordia-skyway": {
        "displayName": "スカイウェイカントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/skyway/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "skyway",
    },
    "accordia-sakuranosato": {
        "displayName": "千葉桜の里ゴルフクラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/sakuranosato/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "sakuranosato",
    },
    "accordia-tokyowan": {
        "displayName": "東京湾カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/tokyowan/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "tokyowan",
    },
    "accordia-naritahigashi": {
        "displayName": "成田東カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "成田市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/naritahigashi/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "naritahigashi",
    },
    "accordia-newnanso": {
        "displayName": "ニュー南総ゴルフ倶楽部",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/newnanso/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "newnanso",
    },
    "accordia-hanao": {
        "displayName": "花生カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/hanao/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "hanao",
    },
    "accordia-fujiichihara": {
        "displayName": "富士市原ゴルフクラブ",
        "kana": "", "prefecture": "千葉県", "city": "市原市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/fujiichihara/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "fujiichihara",
    },
    "accordia-boushu": {
        "displayName": "房州カントリークラブ",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/boushu/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "boushu",
    },
    "accordia-yotsukaido": {
        "displayName": "四街道ゴルフ倶楽部",
        "kana": "", "prefecture": "千葉県", "city": "四街道市", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/yotsukaido/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "yotsukaido",
    },
    "accordia-lavista": {
        "displayName": "ラ・ヴィスタゴルフリゾート",
        "kana": "", "prefecture": "千葉県", "city": "", "area": "千葉", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/chiba/lavista/",
        "scraper": "accordia", "accordia_pref": "chiba", "accordia_slug": "lavista",
    },
    # 東京
    "accordia-sobu": {
        "displayName": "東京相武カントリークラブ",
        "kana": "", "prefecture": "東京都", "city": "", "area": "東京", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tokyo/sobu/",
        "scraper": "accordia", "accordia_pref": "tokyo", "accordia_slug": "sobu",
    },
    "accordia-sobu-short": {
        "displayName": "東京相武カントリークラブ ショートコース",
        "kana": "", "prefecture": "東京都", "city": "町田市", "area": "東京", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/tokyo/sobufamilygolf/",
        "scraper": "accordia", "accordia_pref": "tokyo", "accordia_slug": "sobufamilygolf",
    },
    # 神奈川
    "accordia-odawara": {
        "displayName": "小田原ゴルフ倶楽部 松田コース",
        "kana": "", "prefecture": "神奈川県", "city": "", "area": "神奈川", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kanagawa/odawara/",
        "scraper": "accordia", "accordia_pref": "kanagawa", "accordia_slug": "odawara",
    },
    "accordia-daiatsugi-sakura": {
        "displayName": "大厚木カントリークラブ 桜コース",
        "kana": "", "prefecture": "神奈川県", "city": "厚木市", "area": "神奈川", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kanagawa/daiatsugi_sakura/",
        "scraper": "accordia", "accordia_pref": "kanagawa", "accordia_slug": "daiatsugi_sakura",
    },
    "accordia-daiatsugi-hon": {
        "displayName": "大厚木カントリークラブ 本コース",
        "kana": "", "prefecture": "神奈川県", "city": "厚木市", "area": "神奈川", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kanagawa/daiatsugi_hon/",
        "scraper": "accordia", "accordia_pref": "kanagawa", "accordia_slug": "daiatsugi_hon",
    },
    # 山梨
    "accordia-ootsukigarden": {
        "displayName": "大月ガーデンゴルフクラブ",
        "kana": "", "prefecture": "山梨県", "city": "大月市", "area": "山梨", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/yamanashi/ootsukigarden/",
        "scraper": "accordia", "accordia_pref": "yamanashi", "accordia_slug": "ootsukigarden",
    },
    # 新潟
    "accordia-izumozaki": {
        "displayName": "大新潟カントリークラブ 出雲崎コース",
        "kana": "", "prefecture": "新潟県", "city": "", "area": "新潟", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/niigata/izumozaki/",
        "scraper": "accordia", "accordia_pref": "niigata", "accordia_slug": "izumozaki",
    },
    "accordia-dainiigata-sanjo": {
        "displayName": "大新潟カントリークラブ 三条コース",
        "kana": "", "prefecture": "新潟県", "city": "", "area": "新潟", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/niigata/dainiigata_sanjo/",
        "scraper": "accordia", "accordia_pref": "niigata", "accordia_slug": "dainiigata_sanjo",
    },
    # 静岡
    "accordia-jurigi": {
        "displayName": "十里木カントリークラブ",
        "kana": "", "prefecture": "静岡県", "city": "", "area": "静岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shizuoka/jurigi/",
        "scraper": "accordia", "accordia_pref": "shizuoka", "accordia_slug": "jurigi",
    },
    "accordia-mishima": {
        "displayName": "三島カントリークラブ",
        "kana": "", "prefecture": "静岡県", "city": "", "area": "静岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shizuoka/mishima/",
        "scraper": "accordia", "accordia_pref": "shizuoka", "accordia_slug": "mishima",
    },
    "accordia-ashitaka": {
        "displayName": "愛鷹シックスハンドレッドクラブ",
        "kana": "", "prefecture": "静岡県", "city": "", "area": "静岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shizuoka/ashitaka/",
        "scraper": "accordia", "accordia_pref": "shizuoka", "accordia_slug": "ashitaka",
    },
    "accordia-izu": {
        "displayName": "伊豆国際カントリークラブ",
        "kana": "", "prefecture": "静岡県", "city": "", "area": "静岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shizuoka/izu/",
        "scraper": "accordia", "accordia_pref": "shizuoka", "accordia_slug": "izu",
    },
    "accordia-kakegawa": {
        "displayName": "掛川カントリークラブ",
        "kana": "", "prefecture": "静岡県", "city": "", "area": "静岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shizuoka/kakegawa/",
        "scraper": "accordia", "accordia_pref": "shizuoka", "accordia_slug": "kakegawa",
    },
    "accordia-nishifuji": {
        "displayName": "西富士ゴルフ倶楽部",
        "kana": "", "prefecture": "静岡県", "city": "", "area": "静岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shizuoka/nishifuji/",
        "scraper": "accordia", "accordia_pref": "shizuoka", "accordia_slug": "nishifuji",
    },
    "accordia-fujinomori": {
        "displayName": "富士の杜ゴルフクラブ",
        "kana": "", "prefecture": "静岡県", "city": "", "area": "静岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shizuoka/fujinomori/",
        "scraper": "accordia", "accordia_pref": "shizuoka", "accordia_slug": "fujinomori",
    },
    "accordia-otsueast": {
        "displayName": "大津カントリークラブ 東コース",
        "kana": "", "prefecture": "滋賀県", "city": "", "area": "滋賀", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shiga/otsueast/",
        "scraper": "accordia", "accordia_pref": "shiga", "accordia_slug": "otsueast",
    },
    "accordia-otsuwest": {
        "displayName": "大津カントリークラブ 西コース",
        "kana": "", "prefecture": "滋賀県", "city": "", "area": "滋賀", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shiga/otsuwest/",
        "scraper": "accordia", "accordia_pref": "shiga", "accordia_slug": "otsuwest",
    },
    "accordia-asamiya": {
        "displayName": "朝宮ゴルフコース",
        "kana": "", "prefecture": "滋賀県", "city": "", "area": "滋賀", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shiga/asamiya/",
        "scraper": "accordia", "accordia_pref": "shiga", "accordia_slug": "asamiya",
    },
    "accordia-hira": {
        "displayName": "比良ゴルフ倶楽部",
        "kana": "", "prefecture": "滋賀県", "city": "", "area": "滋賀", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shiga/hira/",
        "scraper": "accordia", "accordia_pref": "shiga", "accordia_slug": "hira",
    },
    "accordia-tsuchiyama": {
        "displayName": "双鈴ゴルフクラブ 土山コース",
        "kana": "", "prefecture": "滋賀県", "city": "", "area": "滋賀", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shiga/tsuchiyama/",
        "scraper": "accordia", "accordia_pref": "shiga", "accordia_slug": "tsuchiyama",
    },
    "accordia-lakeforestbirdspring": {
        "displayName": "レイクフォレストリゾート バード・スプリングコース",
        "kana": "", "prefecture": "京都府", "city": "", "area": "京都", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kyoto/lakeforestbirdspring/",
        "scraper": "accordia", "accordia_pref": "kyoto", "accordia_slug": "lakeforestbirdspring",
    },
    "accordia-kameoka": {
        "displayName": "亀岡ゴルフクラブ",
        "kana": "", "prefecture": "京都府", "city": "", "area": "京都", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kyoto/kameoka/",
        "scraper": "accordia", "accordia_pref": "kyoto", "accordia_slug": "kameoka",
    },
    "accordia-lakeforestcentury": {
        "displayName": "レイクフォレストリゾート ザ・センチュリーコース",
        "kana": "", "prefecture": "京都府", "city": "", "area": "京都", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kyoto/lakeforestcentury/",
        "scraper": "accordia", "accordia_pref": "kyoto", "accordia_slug": "lakeforestcentury",
    },
    "accordia-kamo": {
        "displayName": "加茂カントリークラブ",
        "kana": "", "prefecture": "京都府", "city": "", "area": "京都", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kyoto/kamo/",
        "scraper": "accordia", "accordia_pref": "kyoto", "accordia_slug": "kamo",
    },
    "accordia-kyowa": {
        "displayName": "協和ゴルフクラブ",
        "kana": "", "prefecture": "京都府", "city": "", "area": "京都", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kyoto/kyowa/",
        "scraper": "accordia", "accordia_pref": "kyoto", "accordia_slug": "kyowa",
    },
    "accordia-grandvert": {
        "displayName": "グランベール京都ゴルフ倶楽部",
        "kana": "", "prefecture": "京都府", "city": "", "area": "京都", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kyoto/grandvert/",
        "scraper": "accordia", "accordia_pref": "kyoto", "accordia_slug": "grandvert",
    },
    "accordia-izumisano": {
        "displayName": "泉佐野カントリークラブ",
        "kana": "", "prefecture": "大阪府", "city": "", "area": "大阪", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/osaka/izumisano/",
        "scraper": "accordia", "accordia_pref": "osaka", "accordia_slug": "izumisano",
    },
    "accordia-sakai": {
        "displayName": "堺カントリークラブ",
        "kana": "", "prefecture": "大阪府", "city": "", "area": "大阪", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/osaka/sakai/",
        "scraper": "accordia", "accordia_pref": "osaka", "accordia_slug": "sakai",
    },
    "accordia-kisaichi": {
        "displayName": "きさいちカントリークラブ",
        "kana": "", "prefecture": "大阪府", "city": "", "area": "大阪", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/osaka/kisaichi/",
        "scraper": "accordia", "accordia_pref": "osaka", "accordia_slug": "kisaichi",
    },
    "accordia-misaki": {
        "displayName": "みさきカントリークラブ",
        "kana": "", "prefecture": "大阪府", "city": "", "area": "大阪", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/osaka/misaki/",
        "scraper": "accordia", "accordia_pref": "osaka", "accordia_slug": "misaki",
    },
    "accordia-rokkou": {
        "displayName": "六甲カントリー倶楽部",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/rokkou/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "rokkou",
    },
    "accordia-rotary": {
        "displayName": "ロータリーゴルフ倶楽部",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/rotary/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "rotary",
    },
    "accordia-miki": {
        "displayName": "三木セブンハンドレッド倶楽部",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/miki/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "miki",
    },
    "accordia-rosewood": {
        "displayName": "ローズウッドゴルフクラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/rosewood/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "rosewood",
    },
    "accordia-inagawa-green": {
        "displayName": "猪名川グリーンカントリークラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/inagawa_green/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "inagawa_green",
    },
    "accordia-fujiono": {
        "displayName": "富士小野ゴルフクラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/fujiono/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "fujiono",
    },
    "accordia-banshutoyo": {
        "displayName": "播州東洋ゴルフ倶楽部",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/banshutoyo/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "banshutoyo",
    },
    "accordia-tojopine": {
        "displayName": "東条パインバレーゴルフクラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/tojopine/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "tojopine",
    },
    "accordia-yashirotojo": {
        "displayName": "やしろ東条ゴルフクラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/yashirotojo/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "yashirotojo",
    },
    "accordia-kobe": {
        "displayName": "神戸パインウッズゴルフクラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/kobe/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "kobe",
    },
    "accordia-atagohara": {
        "displayName": "愛宕原ゴルフ倶楽部",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/atagohara/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "atagohara",
    },
    "accordia-shirasagi": {
        "displayName": "白鷺ゴルフクラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/shirasagi/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "shirasagi",
    },
    "accordia-inakoku": {
        "displayName": "猪名川国際カントリークラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/inakoku/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "inakoku",
    },
    "accordia-kasai": {
        "displayName": "加西カントリークラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/kasai/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "kasai",
    },
    "accordia-harima": {
        "displayName": "播磨カントリークラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/harima/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "harima",
    },
    "accordia-yamanohara": {
        "displayName": "山の原ゴルフクラブ",
        "kana": "", "prefecture": "兵庫県", "city": "", "area": "兵庫", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hyogo/yamanohara/",
        "scraper": "accordia", "accordia_pref": "hyogo", "accordia_slug": "yamanohara",
    },
    "accordia-manju": {
        "displayName": "万壽ゴルフクラブ",
        "kana": "", "prefecture": "奈良県", "city": "", "area": "奈良", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nara/manju/",
        "scraper": "accordia", "accordia_pref": "nara", "accordia_slug": "manju",
    },
    "accordia-naranomori": {
        "displayName": "奈良の杜ゴルフクラブ",
        "kana": "", "prefecture": "奈良県", "city": "", "area": "奈良", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nara/naranomori/",
        "scraper": "accordia", "accordia_pref": "nara", "accordia_slug": "naranomori",
    },
    "accordia-yamatokougen": {
        "displayName": "大和高原カントリークラブ",
        "kana": "", "prefecture": "奈良県", "city": "", "area": "奈良", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nara/yamatokougen/",
        "scraper": "accordia", "accordia_pref": "nara", "accordia_slug": "yamatokougen",
    },
    "accordia-naramanyo": {
        "displayName": "奈良万葉カンツリー倶楽部",
        "kana": "", "prefecture": "奈良県", "city": "", "area": "奈良", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nara/naramanyo/",
        "scraper": "accordia", "accordia_pref": "nara", "accordia_slug": "naramanyo",
    },
    "accordia-narameihan": {
        "displayName": "奈良名阪ゴルフクラブ",
        "kana": "", "prefecture": "奈良県", "city": "", "area": "奈良", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nara/narameihan/",
        "scraper": "accordia", "accordia_pref": "nara", "accordia_slug": "narameihan",
    },
    "accordia-narawaka": {
        "displayName": "奈良若草カントリー倶楽部",
        "kana": "", "prefecture": "奈良県", "city": "", "area": "奈良", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nara/narawaka/",
        "scraper": "accordia", "accordia_pref": "nara", "accordia_slug": "narawaka",
    },
    "accordia-sunresort": {
        "displayName": "サンリゾートカントリークラブ",
        "kana": "", "prefecture": "和歌山県", "city": "", "area": "和歌山", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/wakayama/sunresort/",
        "scraper": "accordia", "accordia_pref": "wakayama", "accordia_slug": "sunresort",
    },
    "accordia-izumo": {
        "displayName": "いづも大社カントリークラブ",
        "kana": "", "prefecture": "島根県", "city": "", "area": "島根", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/shimane/izumo/",
        "scraper": "accordia", "accordia_pref": "shimane", "accordia_slug": "izumo",
    },
    "accordia-takehara": {
        "displayName": "竹原カントリークラブ",
        "kana": "", "prefecture": "広島県", "city": "", "area": "広島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hiroshima/takehara/",
        "scraper": "accordia", "accordia_pref": "hiroshima", "accordia_slug": "takehara",
    },
    "accordia-hongo": {
        "displayName": "本郷カントリー倶楽部",
        "kana": "", "prefecture": "広島県", "city": "", "area": "広島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hiroshima/hongo/",
        "scraper": "accordia", "accordia_pref": "hiroshima", "accordia_slug": "hongo",
    },
    "accordia-hiroshimaasa": {
        "displayName": "広島安佐ゴルフクラブ",
        "kana": "", "prefecture": "広島県", "city": "", "area": "広島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hiroshima/hiroshimaasa/",
        "scraper": "accordia", "accordia_pref": "hiroshima", "accordia_slug": "hiroshimaasa",
    },
    "accordia-hakuryuko": {
        "displayName": "白竜湖カントリークラブ",
        "kana": "", "prefecture": "広島県", "city": "", "area": "広島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hiroshima/hakuryuko/",
        "scraper": "accordia", "accordia_pref": "hiroshima", "accordia_slug": "hakuryuko",
    },
    "accordia-chiyoda": {
        "displayName": "千代田ゴルフ倶楽部",
        "kana": "", "prefecture": "広島県", "city": "", "area": "広島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hiroshima/chiyoda/",
        "scraper": "accordia", "accordia_pref": "hiroshima", "accordia_slug": "chiyoda",
    },
    "accordia-sanyo": {
        "displayName": "山陽国際ゴルフクラブ",
        "kana": "", "prefecture": "山口県", "city": "", "area": "山口", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/yamaguchi/sanyo/",
        "scraper": "accordia", "accordia_pref": "yamaguchi", "accordia_slug": "sanyo",
    },
    "accordia-waki": {
        "displayName": "和木ゴルフ倶楽部",
        "kana": "", "prefecture": "山口県", "city": "", "area": "山口", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/yamaguchi/waki/",
        "scraper": "accordia", "accordia_pref": "yamaguchi", "accordia_slug": "waki",
    },
    "accordia-shinyo": {
        "displayName": "新陽カントリー倶楽部",
        "kana": "", "prefecture": "岐阜県", "city": "", "area": "岐阜", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gifu/shinyo/",
        "scraper": "accordia", "accordia_pref": "gifu", "accordia_slug": "shinyo",
    },
    "accordia-sunclassic": {
        "displayName": "サンクラシックゴルフクラブ",
        "kana": "", "prefecture": "岐阜県", "city": "", "area": "岐阜", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gifu/sunclassic/",
        "scraper": "accordia", "accordia_pref": "gifu", "accordia_slug": "sunclassic",
    },
    "accordia-mizunami": {
        "displayName": "フォレストみずなみカントリークラブ",
        "kana": "", "prefecture": "岐阜県", "city": "", "area": "岐阜", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gifu/mizunami/",
        "scraper": "accordia", "accordia_pref": "gifu", "accordia_slug": "mizunami",
    },
    "accordia-minozeki": {
        "displayName": "美濃関カントリークラブ",
        "kana": "", "prefecture": "岐阜県", "city": "", "area": "岐阜", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gifu/minozeki/",
        "scraper": "accordia", "accordia_pref": "gifu", "accordia_slug": "minozeki",
    },
    "accordia-kogaya": {
        "displayName": "小萱チェリークリークカントリークラブ",
        "kana": "", "prefecture": "岐阜県", "city": "", "area": "岐阜", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gifu/kogaya/",
        "scraper": "accordia", "accordia_pref": "gifu", "accordia_slug": "kogaya",
    },
    "accordia-mitakehana": {
        "displayName": "エクセレントゴルフクラブ みたけ花トピアコース",
        "kana": "", "prefecture": "岐阜県", "city": "", "area": "岐阜", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/gifu/mitakehana/",
        "scraper": "accordia", "accordia_pref": "gifu", "accordia_slug": "mitakehana",
    },
    "accordia-inabu": {
        "displayName": "稲武カントリークラブ",
        "kana": "", "prefecture": "愛知県", "city": "", "area": "愛知", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/aichi/inabu/",
        "scraper": "accordia", "accordia_pref": "aichi", "accordia_slug": "inabu",
    },
    "accordia-okazaki": {
        "displayName": "岡崎カントリー倶楽部",
        "kana": "", "prefecture": "愛知県", "city": "", "area": "愛知", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/aichi/okazaki/",
        "scraper": "accordia", "accordia_pref": "aichi", "accordia_slug": "okazaki",
    },
    "accordia-tsukude": {
        "displayName": "つくでゴルフクラブ",
        "kana": "", "prefecture": "愛知県", "city": "", "area": "愛知", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/aichi/tsukude/",
        "scraper": "accordia", "accordia_pref": "aichi", "accordia_slug": "tsukude",
    },
    "accordia-castlehill": {
        "displayName": "キャッスルヒルカントリークラブ",
        "kana": "", "prefecture": "愛知県", "city": "", "area": "愛知", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/aichi/castlehill/",
        "scraper": "accordia", "accordia_pref": "aichi", "accordia_slug": "castlehill",
    },
    "accordia-meisho": {
        "displayName": "名松・ゴルフクラブ",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/meisho/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "meisho",
    },
    "accordia-fujiwara": {
        "displayName": "藤原ゴルフクラブ",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/fujiwara/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "fujiwara",
    },
    "accordia-seki": {
        "displayName": "双鈴ゴルフクラブ 関コース",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/seki/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "seki",
    },
    "accordia-route25": {
        "displayName": "ルート25ゴルフクラブ",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/route25/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "route25",
    },
    "accordia-suzukanomori": {
        "displayName": "鈴鹿の森ゴルフクラブ",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/suzukanomori/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "suzukanomori",
    },
    "accordia-yokkaichi": {
        "displayName": "四日市の里ゴルフクラブ",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/yokkaichi/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "yokkaichi",
    },
    "accordia-geino": {
        "displayName": "フォレスト芸濃ゴルフクラブ",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/geino/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "geino",
    },
    "accordia-kasumi": {
        "displayName": "霞ゴルフクラブ",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/kasumi/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "kasumi",
    },
    "accordia-iseootori": {
        "displayName": "エクセレントゴルフクラブ 伊勢大鷲コース",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/iseootori/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "iseootori",
    },
    "accordia-ichishi": {
        "displayName": "エクセレントゴルフクラブ 一志温泉コース",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/ichishi/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "ichishi",
    },
    "accordia-isefutami": {
        "displayName": "エクセレントゴルフクラブ 伊勢二見コース",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/isefutami/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "isefutami",
    },
    "accordia-greenhighland": {
        "displayName": "グリーンハイランドカントリー倶楽部",
        "kana": "", "prefecture": "三重県", "city": "", "area": "三重", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/mie/greenhighland/",
        "scraper": "accordia", "accordia_pref": "mie", "accordia_slug": "greenhighland",
    },
    "accordia-onuma": {
        "displayName": "大沼レイクゴルフクラブ",
        "kana": "", "prefecture": "北海道", "city": "", "area": "北海道", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hokkaido/onuma/",
        "scraper": "accordia", "accordia_pref": "hokkaido", "accordia_slug": "onuma",
    },
    "accordia-tarumae": {
        "displayName": "樽前カントリークラブ",
        "kana": "", "prefecture": "北海道", "city": "", "area": "北海道", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/hokkaido/tarumae/",
        "scraper": "accordia", "accordia_pref": "hokkaido", "accordia_slug": "tarumae",
    },
    "accordia-hananomori": {
        "displayName": "花の杜ゴルフクラブ",
        "kana": "", "prefecture": "宮城県", "city": "", "area": "宮城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/miyagi/hananomori/",
        "scraper": "accordia", "accordia_pref": "miyagi", "accordia_slug": "hananomori",
    },
    "accordia-miyagino": {
        "displayName": "宮城野ゴルフクラブ",
        "kana": "", "prefecture": "宮城県", "city": "", "area": "宮城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/miyagi/miyagino/",
        "scraper": "accordia", "accordia_pref": "miyagi", "accordia_slug": "miyagino",
    },
    "accordia-oosato": {
        "displayName": "おおさとゴルフ倶楽部",
        "kana": "", "prefecture": "宮城県", "city": "", "area": "宮城", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/miyagi/oosato/",
        "scraper": "accordia", "accordia_pref": "miyagi", "accordia_slug": "oosato",
    },
    "accordia-yamagata": {
        "displayName": "山形南カントリークラブ",
        "kana": "", "prefecture": "山形県", "city": "", "area": "山形", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/yamagata/yamagata/",
        "scraper": "accordia", "accordia_pref": "yamagata", "accordia_slug": "yamagata",
    },
    "accordia-uzumine": {
        "displayName": "宇津峰カントリークラブ",
        "kana": "", "prefecture": "福島県", "city": "", "area": "福島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukushima/uzumine/",
        "scraper": "accordia", "accordia_pref": "fukushima", "accordia_slug": "uzumine",
    },
    "accordia-onahamacc": {
        "displayName": "小名浜カントリー倶楽部",
        "kana": "", "prefecture": "福島県", "city": "", "area": "福島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukushima/onahamacc/",
        "scraper": "accordia", "accordia_pref": "fukushima", "accordia_slug": "onahamacc",
    },
    "accordia-onahama": {
        "displayName": "小名浜オーシャンホテル＆ゴルフクラブ",
        "kana": "", "prefecture": "福島県", "city": "", "area": "福島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukushima/onahama/",
        "scraper": "accordia", "accordia_pref": "fukushima", "accordia_slug": "onahama",
    },
    "accordia-ishikawa": {
        "displayName": "石川ゴルフ倶楽部",
        "kana": "", "prefecture": "石川県", "city": "", "area": "石川", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ishikawa/ishikawa/",
        "scraper": "accordia", "accordia_pref": "ishikawa", "accordia_slug": "ishikawa",
    },
    "accordia-kanazawa-central": {
        "displayName": "金沢セントラルカントリー倶楽部",
        "kana": "", "prefecture": "石川県", "city": "", "area": "石川", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/ishikawa/kanazawa_central/",
        "scraper": "accordia", "accordia_pref": "ishikawa", "accordia_slug": "kanazawa_central",
    },
    "accordia-fukui": {
        "displayName": "フクイカントリークラブ",
        "kana": "", "prefecture": "福井県", "city": "", "area": "福井", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukui/fukui/",
        "scraper": "accordia", "accordia_pref": "fukui", "accordia_slug": "fukui",
    },
    "accordia-central-fukuoka": {
        "displayName": "セントラル福岡ゴルフ倶楽部",
        "kana": "", "prefecture": "福岡県", "city": "", "area": "福岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukuoka/central_fukuoka/",
        "scraper": "accordia", "accordia_pref": "fukuoka", "accordia_slug": "central_fukuoka",
    },
    "accordia-nijo": {
        "displayName": "二丈カントリークラブ",
        "kana": "", "prefecture": "福岡県", "city": "", "area": "福岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukuoka/nijo/",
        "scraper": "accordia", "accordia_pref": "fukuoka", "accordia_slug": "nijo",
    },
    "accordia-kaho": {
        "displayName": "かほゴルフクラブ",
        "kana": "", "prefecture": "福岡県", "city": "", "area": "福岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukuoka/kaho/",
        "scraper": "accordia", "accordia_pref": "fukuoka", "accordia_slug": "kaho",
    },
    "accordia-fukuoka": {
        "displayName": "福岡フェザントカントリークラブ",
        "kana": "", "prefecture": "福岡県", "city": "", "area": "福岡", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/fukuoka/fukuoka/",
        "scraper": "accordia", "accordia_pref": "fukuoka", "accordia_slug": "fukuoka",
    },
    "accordia-hanamatsuri": {
        "displayName": "花祭ゴルフ倶楽部",
        "kana": "", "prefecture": "佐賀県", "city": "", "area": "佐賀", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/saga/hanamatsuri/",
        "scraper": "accordia", "accordia_pref": "saga", "accordia_slug": "hanamatsuri",
    },
    "accordia-nagasaki": {
        "displayName": "長崎パークカントリークラブ",
        "kana": "", "prefecture": "長崎県", "city": "", "area": "長崎", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nagasaki/nagasaki/",
        "scraper": "accordia", "accordia_pref": "nagasaki", "accordia_slug": "nagasaki",
    },
    "accordia-sasebo": {
        "displayName": "佐世保国際カントリー倶楽部",
        "kana": "", "prefecture": "長崎県", "city": "", "area": "長崎", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nagasaki/sasebo/",
        "scraper": "accordia", "accordia_pref": "nagasaki", "accordia_slug": "sasebo",
    },
    "accordia-huistenbosch": {
        "displayName": "ハウステンボスカントリークラブ",
        "kana": "", "prefecture": "長崎県", "city": "", "area": "長崎", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/nagasaki/huistenbosch/",
        "scraper": "accordia", "accordia_pref": "nagasaki", "accordia_slug": "huistenbosch",
    },
    "accordia-kikuchi": {
        "displayName": "菊池カントリークラブ",
        "kana": "", "prefecture": "熊本県", "city": "", "area": "熊本", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kumamoto/kikuchi/",
        "scraper": "accordia", "accordia_pref": "kumamoto", "accordia_slug": "kikuchi",
    },
    "accordia-aso": {
        "displayName": "阿蘇大津ゴルフクラブ",
        "kana": "", "prefecture": "熊本県", "city": "", "area": "熊本", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kumamoto/aso/",
        "scraper": "accordia", "accordia_pref": "kumamoto", "accordia_slug": "aso",
    },
    "accordia-beppu": {
        "displayName": "別府の森ゴルフ倶楽部",
        "kana": "", "prefecture": "大分県", "city": "", "area": "大分", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/oita/beppu/",
        "scraper": "accordia", "accordia_pref": "oita", "accordia_slug": "beppu",
    },
    "accordia-oita": {
        "displayName": "大分サニーヒルゴルフ倶楽部",
        "kana": "", "prefecture": "大分県", "city": "", "area": "大分", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/oita/oita/",
        "scraper": "accordia", "accordia_pref": "oita", "accordia_slug": "oita",
    },
    "accordia-amagase": {
        "displayName": "天瀬温泉カントリークラブ",
        "kana": "", "prefecture": "大分県", "city": "", "area": "大分", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/oita/amagase/",
        "scraper": "accordia", "accordia_pref": "oita", "accordia_slug": "amagase",
    },
    "accordia-aoshima": {
        "displayName": "青島ゴルフ倶楽部",
        "kana": "", "prefecture": "宮崎県", "city": "", "area": "宮崎", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/miyazaki/aoshima/",
        "scraper": "accordia", "accordia_pref": "miyazaki", "accordia_slug": "aoshima",
    },
    "accordia-rainbow": {
        "displayName": "レインボースポーツランドゴルフクラブ",
        "kana": "", "prefecture": "宮崎県", "city": "", "area": "宮崎", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/miyazaki/rainbow/",
        "scraper": "accordia", "accordia_pref": "miyazaki", "accordia_slug": "rainbow",
    },
    "accordia-yunoura": {
        "displayName": "湯の浦カントリー倶楽部",
        "kana": "", "prefecture": "鹿児島県", "city": "", "area": "鹿児島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kagoshima/yunoura/",
        "scraper": "accordia", "accordia_pref": "kagoshima", "accordia_slug": "yunoura",
    },
    "accordia-kagoshima": {
        "displayName": "鹿児島ガーデンゴルフ倶楽部",
        "kana": "", "prefecture": "鹿児島県", "city": "", "area": "鹿児島", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/kagoshima/kagoshima/",
        "scraper": "accordia", "accordia_pref": "kagoshima", "accordia_slug": "kagoshima",
    },
    "accordia-palmhills": {
        "displayName": "パームヒルズゴルフリゾートクラブ",
        "kana": "", "prefecture": "沖縄県", "city": "", "area": "沖縄", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/okinawa/palmhills/",
        "scraper": "accordia", "accordia_pref": "okinawa", "accordia_slug": "palmhills",
    },
    "accordia-okinawa": {
        "displayName": "沖縄カントリークラブ",
        "kana": "", "prefecture": "沖縄県", "city": "", "area": "沖縄", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/okinawa/okinawa/",
        "scraper": "accordia", "accordia_pref": "okinawa", "accordia_slug": "okinawa",
    },
    "accordia-oceancastle": {
        "displayName": "オーシャンキャッスルカントリークラブ",
        "kana": "", "prefecture": "沖縄県", "city": "", "area": "沖縄", "type": "",
        "website": "https://reserve.accordiagolf.com/golfCourse/okinawa/oceancastle/",
        "scraper": "accordia", "accordia_pref": "okinawa", "accordia_slug": "oceancastle",
    },
}


def _load_imported_courses() -> Dict[str, Dict[str, Any]]:
    if not IMPORTED_COURSES_PATH.exists():
        return {}
    try:
        payload = json.loads(IMPORTED_COURSES_PATH.read_text(encoding="utf-8"))
    except Exception as e:
        print(f"  ⚠ imported courses 読み込み失敗: {e}")
        return {}
    if not isinstance(payload, dict):
        return {}
    loaded: Dict[str, Dict[str, Any]] = {}
    for course_id, cfg in payload.items():
        if not isinstance(cfg, dict):
            continue
        loaded[course_id] = cfg
    return loaded


_imported_courses = _load_imported_courses()
for _course_id, _cfg in _imported_courses.items():
    if _course_id not in COURSES:
        COURSES[_course_id] = _cfg


# ──────────────────────────────────────────────────────────────────
# Official site: 赤羽ゴルフ倶楽部
# ──────────────────────────────────────────────────────────────────
#
# https://www.akabanegolf.co.jp/courses は 5ティー × 2グリーン × 18ホール の
# 完全スコアカードが <table class="course__table"> に入っている。
# OUT (1-9) と IN (10-18) で 2 つの summary テーブルがあり、各テーブル構造:
#
#   row 0: HOLE  | 1   | 2   | ... | 9   | OUT
#   row 1: PAR   | 4   | 4   | ... | 5   | 37
#   row 2: HDCP  | 9   | 3   | ... | 11  | -
#   row 3: Aグリーン | BACK    | 375 | 410 | ... | 180 | 3284
#   row 4:           | REGULAR | 375 | 380 | ... | 174 | 3194
#   row 5-7:         | FRONT/GOLD/LADIES
#   row 8: Bグリーン | BACK    | 373 | 412 | ... | 186 | ...
#   row 9-12:        | REGULAR/FRONT/GOLD/LADIES

AKABANE_TEE_ORDER = ["BACK", "REGULAR", "FRONT", "GOLD", "LADIES"]


def _cells(tr) -> List[str]:
    return [c.get_text(" ", strip=True) for c in tr.find_all(["th", "td"])]


def _to_int_or_none(s: str) -> Optional[int]:
    s = re.sub(r"[^\d]", "", s or "")
    return int(s) if s else None


def _parse_akabane_summary_table(table) -> Dict[str, Any]:
    """OUT or IN の summary table 1つを解析。

    戻り値: {
      'hole_numbers': [1,2,...,9] or [10..18],
      'pars': [...],
      'hdcps': [...],
      'yards_by_green_tee': {'A': {'BACK': [...], 'REGULAR': [...], ...}, 'B': {...}}
    }
    """
    rows = [_cells(tr) for tr in table.find_all("tr")]
    if len(rows) < 13:
        return {}

    header = rows[0]              # HOLE | 1..9 | OUT
    par_row = rows[1]             # PAR | values | total
    hdcp_row = rows[2]            # HDCP | values | -

    hole_numbers = [int(c) for c in header[1:-1] if c.isdigit()]
    n = len(hole_numbers)
    pars = [_to_int_or_none(c) for c in par_row[1:1 + n]]
    hdcps = [_to_int_or_none(c) for c in hdcp_row[1:1 + n]]

    yards_by_green_tee: Dict[str, Dict[str, List[Optional[int]]]] = {}
    current_green: Optional[str] = None

    for row in rows[3:]:
        if not row:
            continue
        # green セルは "Aグリーン" or "Bグリーン" を含む
        first = row[0]
        if "グリーン" in first:
            # A or B
            current_green = "A" if first.startswith("A") else "B"
            tee_name = row[1]
            yards_cells = row[2:2 + n]
        else:
            tee_name = first
            yards_cells = row[1:1 + n]
        if not current_green:
            continue
        yards_by_green_tee.setdefault(current_green, {})[tee_name] = [
            _to_int_or_none(c) for c in yards_cells
        ]

    return {
        "hole_numbers": hole_numbers,
        "pars": pars,
        "hdcps": hdcps,
        "yards_by_green_tee": yards_by_green_tee,
    }


def scrape_akabane_official(cfg: Dict[str, Any], *, force: bool = False) -> List[Dict[str, Any]]:
    """赤羽ゴルフ倶楽部 公式サイトから A/B グリーン × 5 ティー × 18 ホールを取得。"""
    url = "https://www.akabanegolf.co.jp/courses"
    print(f"  fetching official site: {url}")
    html = fetch(url, force=force)
    soup = BeautifulSoup(html, "html.parser")

    # course__table のうち、HOLEヘッダーと13行以上を持つ summary テーブルを探す
    summary_tables = []
    for table in soup.find_all("table", class_="course__table"):
        rows = table.find_all("tr")
        if len(rows) < 13:
            continue
        first_cell = rows[0].find(["th", "td"])
        if first_cell and "HOLE" in first_cell.get_text():
            summary_tables.append(table)

    if len(summary_tables) < 2:
        print(f"  ⚠ 期待した summary table 2個 (OUT/IN) が見つからず: 実際 {len(summary_tables)}")
        return []

    # OUT (1-9), IN (10-18) を解析
    parsed_halves = []
    for half_idx, table in enumerate(summary_tables[:2]):
        parsed = _parse_akabane_summary_table(table)
        if not parsed:
            print(f"  ⚠ summary table {half_idx} の解析失敗")
            continue
        parsed_halves.append(parsed)

    # 全 18 ホールをグリーン別に組み立て
    holes_by_green: Dict[str, List[Dict[str, Any]]] = {"A": [], "B": []}
    for half in parsed_halves:
        for i, hole_no in enumerate(half["hole_numbers"]):
            par = half["pars"][i] if i < len(half["pars"]) else None
            hdcp = half["hdcps"][i] if i < len(half["hdcps"]) else None
            for green in ["A", "B"]:
                yards_for_hole: Dict[str, int] = {}
                tees = half["yards_by_green_tee"].get(green, {})
                for tee_name, yards_list in tees.items():
                    if i < len(yards_list) and yards_list[i] is not None:
                        yards_for_hole[tee_name.lower()] = yards_list[i]
                holes_by_green[green].append({
                    "no": hole_no,
                    "par": par,
                    "hdcp": hdcp,
                    "yards": yards_for_hole,
                })

    # ベース情報
    base = {
        "kana": cfg["kana"],
        "prefecture": cfg["prefecture"],
        "city": cfg["city"],
        "area": cfg["area"],
        "type": cfg["type"],
        "website": cfg["website"],
    }

    entries = []
    for green_id in ["A", "B"]:
        holes = holes_by_green[green_id]
        if not holes:
            continue

        # ティー別合計
        tee_totals: Dict[str, int] = {}
        for h in holes:
            for tee, y in h.get("yards", {}).items():
                tee_totals[tee] = tee_totals.get(tee, 0) + y

        tees_array = [
            {
                "id": tee_id,
                "label": tee_id.upper(),
                "totalYards": total,
            }
            for tee_id, total in tee_totals.items()
        ]
        # 並び順は BACK > REGULAR > FRONT > GOLD > LADIES
        order = {n.lower(): i for i, n in enumerate(AKABANE_TEE_ORDER)}
        tees_array.sort(key=lambda t: order.get(t["id"], 99))

        total_par = sum(h["par"] for h in holes if h.get("par"))

        entries.append({
            "id": f"akabane-gc-{green_id.lower()}",
            "parentClubId": "akabane-gc",
            "parentClubName": cfg["displayName"],
            "name": f'{cfg["displayName"]} - {green_id}グリーン',
            "variant": f"{green_id}グリーン",
            **base,
            "totalPar": total_par,
            "tees": tees_array,
            "holes": holes,
            "source": "official",
            "sourceUrl": url,
        })

    return entries


# ──────────────────────────────────────────────────────────────────
# Official site: PGM (Pacific Golf Management) 系列
# ──────────────────────────────────────────────────────────────────
#
# URL: https://booking.pacificgolf.co.jp/?p=guide.course_layout&cc_id=<cc_id>
#
# テーブル構造 (Table[1] = OUT, Table[2] = IN):
#
#   row 0: HOLE NO. | 1   | 2   | ... | 9   | TOTAL
#   row 1: HDCP     | 11  | 17  | ... | 3   | (空)
#   row 2: コウライ Blue   | 429 | 410 | ... | 410 | 3,360
#   row 3: コウライ White  | 404 | 374 | ... | 375 | 3,113
#   row 4: コウライ Red    | 313 | 297 | ...
#   row 5: バミューダ White| 378 | 372 | ...
#   row 6: バミューダ Red  | 287 | 295 | ...
#   row 7: PAR      | 4   | 4   | ... | 4   | 36
#
# テーブル class なし。ティーラベルは「<グリーン> <ティー>」の形式。
# 高麗には Blue/White/Red の3ティー、バミューダは White/Red の2ティーが多い。

# 緑→variant ID マッピング
PGM_GREEN_MAP = {
    "コウライ": ("korai", "高麗グリーン"),
    "高麗": ("korai", "高麗グリーン"),
    "バミューダ": ("bermuda", "バミューダグリーン"),
}

# ティー優先順 (Blue=BACK, White=REGULAR, Red=LADIES)
PGM_TEE_ORDER = ["black", "blue", "gold", "white", "red"]

# ヤーデージ行ではないラベル (PAR/HDCP集計行 や HOLE番号行を除外)
_NON_YARDAGE_ROW_LABELS = {
    "par", "hdcp", "hcp", "hole", "no.", "no", "sum", "total", "合計", "計"
}


_PGM_TEE_LABELS = {"black", "blue", "gold", "white", "red", "regular", "front", "ladies"}


def _split_pgm_yardage_label(label: str) -> Tuple[str, str]:
    """PGM のヤーデージ行ラベルを (green, tee) に分解する。

    Examples:
      - "コウライ Blue"         -> ("コウライ", "Blue")
      - "Blue（Right Green）"   -> ("Right Green", "Blue")
      - "AG /Blue"              -> ("AG", "Blue")
      - "Blue"                  -> ("", "Blue")
    """
    text = re.sub(r"\s+", " ", label.strip())
    if not text:
        return "", ""

    slash_match = re.match(
        r"^(?P<green>.+?)\s*/\s*(?P<tee>black|blue|gold|white|red|regular|front|ladies)\s*$",
        text,
        flags=re.I,
    )
    if slash_match:
        return slash_match.group("green").strip(), slash_match.group("tee").strip()

    paren_match = re.match(
        r"^(?P<tee>black|blue|gold|white|red|regular|front|ladies)\s*[（(](?P<green>.+?)[）)]\s*$",
        text,
        flags=re.I,
    )
    if paren_match:
        return paren_match.group("green").strip(), paren_match.group("tee").strip()

    suffix_match = re.match(
        r"^(?P<green>.+?)\s+(?P<tee>black|blue|gold|white|red|regular|front|ladies)\s*$",
        text,
        flags=re.I,
    )
    if suffix_match:
        return suffix_match.group("green").strip(), suffix_match.group("tee").strip()

    lowered = text.lower()
    if lowered in _PGM_TEE_LABELS:
        return "", text

    parts = text.split(maxsplit=1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return "", text


def _parse_pgm_summary_table(table) -> Dict[str, Any]:
    """PGM 公式 OUT or IN summary table 1つを解析。"""
    rows = [_cells(tr) for tr in table.find_all("tr")]
    if len(rows) < 4:
        return {}

    header = rows[0]
    hole_numbers = [int(c) for c in header[1:-1] if c.isdigit()]
    n = len(hole_numbers)
    if n == 0:
        return {}

    hdcps = [_to_int_or_none(c) for c in rows[1][1:1 + n]]
    pars = [_to_int_or_none(c) for c in rows[-1][1:1 + n]]

    yards_by_green: Dict[str, Dict[str, List[Optional[int]]]] = {}
    for row in rows[2:-1]:
        if not row:
            continue
        label = row[0]
        green, tee = _split_pgm_yardage_label(label)
        if not tee:
            continue
        # PAR/HDCP/HOLE など非ヤーデージ行をスキップ
        if tee.lower() in _NON_YARDAGE_ROW_LABELS:
            continue
        yards_cells = row[1:1 + n]
        yards = [_to_int_or_none(c) for c in yards_cells]
        if not any(y and y > 0 for y in yards):
            continue
        yards_by_green.setdefault(green, {})[tee] = yards

    return {
        "hole_numbers": hole_numbers,
        "pars": pars,
        "hdcps": hdcps,
        "yards_by_green": yards_by_green,
    }


def _find_section_name_for_table(table) -> str:
    """テーブル直前の見出し (h2〜h4) テキストを返す。なければ空文字。"""
    heading = table.find_previous(re.compile(r'^h[2-4]$'))
    return heading.get_text(strip=True) if heading else ""


def _build_pgm_entries_from_halves(
    cfg: Dict[str, Any],
    halves: List[Dict[str, Any]],
    url: str,
    course_id: str,
    *,
    id_suffix: str = "",
    variant_label: str = "",
) -> List[Dict[str, Any]]:
    """OUT/IN (または単一テーブル) をマージし、グリーン別エントリを返す。

    Args:
        halves:        _parse_pgm_summary_table の結果リスト (18H なら [out, in]、9H なら [single])
        id_suffix:     複合コース時のID末尾 ("1", "2" 等)。通常は空文字。
        variant_label: 複合コース時の表示名 ("岡部OUT" 等)。通常は空文字。
    """
    base = {
        "kana": cfg["kana"], "prefecture": cfg["prefecture"],
        "city": cfg["city"], "area": cfg["area"],
        "type": cfg["type"], "website": cfg["website"],
    }

    # グリーン毎にホールを集約 (OUT→IN の順にマージ。先に入ったホールのpar/hdcpを優先)
    holes_by_green: Dict[str, List[Dict[str, Any]]] = {}
    for half in halves:
        for i, hole_no in enumerate(half["hole_numbers"]):
            par  = half["pars"][i]  if i < len(half["pars"])  else None
            hdcp = half["hdcps"][i] if i < len(half["hdcps"]) else None
            for green_name, tee_yards in half["yards_by_green"].items():
                holes_for_green = holes_by_green.setdefault(green_name, [])
                hole_entry = next((h for h in holes_for_green if h["no"] == hole_no), None)
                if hole_entry is None:
                    hole_entry = {"no": hole_no, "par": par, "hdcp": hdcp, "yards": {}}
                    holes_for_green.append(hole_entry)
                for tee_name, yards_list in tee_yards.items():
                    if i < len(yards_list) and yards_list[i] is not None:
                        # ホール番号が重複するテーブルは通常ここに来ない(構造検知済み)
                        # 万が一重複しても既存値を上書きしない
                        key = tee_name.lower()
                        if key not in hole_entry["yards"]:
                            hole_entry["yards"][key] = yards_list[i]

    for green in holes_by_green:
        holes_by_green[green].sort(key=lambda h: h["no"])

    entries = []
    for green_name, holes in holes_by_green.items():
        if not _has_meaningful_hole_yards(holes):
            continue

        if green_name == "":
            green_id, green_label = "", ""
        else:
            green_id, green_label = PGM_GREEN_MAP.get(green_name, (green_name.lower(), green_name))

        tee_totals: Dict[str, int] = {}
        for h in holes:
            for tee, y in h.get("yards", {}).items():
                tee_totals[tee] = tee_totals.get(tee, 0) + y

        order = {n: i for i, n in enumerate(PGM_TEE_ORDER)}
        tees_array = sorted(
            [{"id": t, "label": t.upper(), "totalYards": total} for t, total in tee_totals.items()],
            key=lambda x: order.get(x["id"], 99),
        )

        total_par = sum(h["par"] for h in holes if h.get("par"))

        # ID: course_id[-id_suffix][-green_id]
        id_parts = [course_id]
        if id_suffix:
            id_parts.append(id_suffix)
        if green_id:
            id_parts.append(green_id)
        entry_id = "-".join(id_parts)

        # 表示名と variant
        name_parts   = [cfg["displayName"]]
        variant_parts: List[str] = []
        if variant_label:
            name_parts.append(variant_label)
            variant_parts.append(variant_label)
        if green_label:
            name_parts.append(green_label)
            variant_parts.append(green_label)
        entry_name = " - ".join(name_parts)
        variant    = " / ".join(variant_parts) if variant_parts else None

        entries.append({
            "id": entry_id,
            "parentClubId": course_id,
            "parentClubName": cfg["displayName"],
            "name": entry_name,
            "variant": variant,
            **base,
            "totalPar": total_par,
            "tees": tees_array,
            "holes": holes,
            "source": "official",
            "sourceUrl": url,
        })

    return entries


def scrape_pgm_official(cfg: Dict[str, Any], *, force: bool = False) -> List[Dict[str, Any]]:
    """PGM 系列ゴルフ場の公式コースガイドから取得。

    コース構成を自動判定:
      テーブル1つ            → 9Hコース (例: 北コース)
      テーブル2つ・非重複    → 標準18H  (OUT 1-9 + IN 10-18)
      テーブルN個・ホール重複 → 複合コース (例: 36H施設の岡部OUT/IN/美里OUT/IN)
                               各テーブルを個別エントリとして出力する
    """
    cc_id = cfg.get("pgm_cc_id")
    if not cc_id:
        print(f"  ⚠ pgm_cc_id が未設定")
        return []

    url = f"https://booking.pacificgolf.co.jp/?p=guide.course_layout&cc_id={cc_id}"
    print(f"  fetching PGM official: {url}")
    html = fetch(url, force=force)
    soup = BeautifulSoup(html, "html.parser")
    course_id = cfg.get("_course_id", "unknown")

    # "HOLE NO." を1行目に持つテーブルを全て収集
    summary_tables = []
    for table in soup.find_all("table"):
        rows = table.find_all("tr")
        if len(rows) < 4:
            continue
        first_cell = rows[0].find(["th", "td"])
        if first_cell and "HOLE" in first_cell.get_text():
            summary_tables.append(table)

    if not summary_tables:
        print(f"  ⚠ HOLE NO. を含むテーブルが見つかりません")
        return []

    # 全テーブルをパース
    parsed: List[Tuple[Any, Dict[str, Any]]] = []
    for table in summary_tables:
        result = _parse_pgm_summary_table(table)
        if result and result.get("hole_numbers"):
            parsed.append((table, result))

    if not parsed:
        print(f"  ⚠ 解析できるテーブルがありません")
        return []

    # ── 構成判定 ────────────────────────────────────────────────────
    def _holes_overlap(p1: Dict, p2: Dict) -> bool:
        return bool(set(p1["hole_numbers"]) & set(p2["hole_numbers"]))

    # ケース1: テーブル1つ → 9Hコース
    if len(parsed) == 1:
        print(f"  ℹ 9Hコース (テーブル1つ)")
        return _build_pgm_entries_from_halves(cfg, [parsed[0][1]], url, course_id)

    # ケース2: テーブル2つのみ・非重複 → 標準OUT/INマージ
    # 3テーブル以上ある施設は 27H / 36H の可能性が高く、
    # 先頭2テーブルだけをマージすると残りを落としてしまう。
    if len(parsed) == 2 and not _holes_overlap(parsed[0][1], parsed[1][1]):
        print(f"  ℹ 標準18Hコース (OUT+IN マージ)")
        return _build_pgm_entries_from_halves(cfg, [p for _, p in parsed[:2]], url, course_id)

    # ケース3: ホール番号が重複 → 複合コース
    print(f"  ℹ 複合コース ({len(parsed)} セクション) → 各セクションを個別エントリ化")
    entries: List[Dict[str, Any]] = []
    section_name_count: Dict[str, int] = {}
    for i, (table, half) in enumerate(parsed):
        raw_name = _find_section_name_for_table(table)
        # セクション名の重複を連番で解決
        cnt = section_name_count.get(raw_name, 0)
        section_name_count[raw_name] = cnt + 1
        if raw_name:
            display_name = raw_name if cnt == 0 else f"{raw_name}({cnt + 1})"
        else:
            display_name = f"コース{i + 1}"
        entries.extend(
            _build_pgm_entries_from_halves(
                cfg, [half], url, course_id,
                id_suffix=str(i + 1),
                variant_label=display_name,
            )
        )
    return entries


# ──────────────────────────────────────────────────────────────────
# Variant matching helper (ShotNavi 用、従来通り)
# ──────────────────────────────────────────────────────────────────


def find_yards_for_variant(
    columns_by_label: Dict[str, Dict[int, int]],
    variant: Dict[str, str],
) -> Tuple[str, Dict[int, int]]:
    """variant の match キーワードで列を探す。見つからなければ最初の列をフォールバック。"""
    match_key = variant.get("match", variant["label"])
    for label, by_hole in columns_by_label.items():
        if match_key in label:
            return label, by_hole
    # フォールバック: 最初の列
    if columns_by_label:
        first_label = next(iter(columns_by_label.keys()))
        return first_label, columns_by_label[first_label]
    return "", {}


def _merge_shotnavi_sections_if_standard_course(sections: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if len(sections) != 2:
        return sections

    a, b = sections
    nums_a = {h.get("no") for h in a.get("holes", []) if h.get("no") is not None}
    nums_b = {h.get("no") for h in b.get("holes", []) if h.get("no") is not None}
    if not nums_a or not nums_b or nums_a & nums_b:
        return sections
    merged_numbers = nums_a | nums_b
    if merged_numbers != set(range(1, 19)):
        return sections

    tee_totals = {t["id"]: dict(t) for t in a.get("tees", [])}
    for tee in b.get("tees", []):
        if tee["id"] in tee_totals:
            tee_totals[tee["id"]]["totalYards"] += tee["totalYards"]
        else:
            tee_totals[tee["id"]] = dict(tee)

    merged = {
        **a,
        "label": "",
        "holes": sorted(a.get("holes", []) + b.get("holes", []), key=lambda h: h["no"]),
        "tees": list(tee_totals.values()),
        "totalPar": (a.get("totalPar") or 0) + (b.get("totalPar") or 0),
        "totalYards": sum(t.get("totalYards", 0) for t in tee_totals.values()) if len(tee_totals) == 1 else None,
        "source_url": ", ".join(filter(None, [a.get("source_url"), b.get("source_url")])),
    }
    return [merged]


def build_entries(course_id: str, cfg: Dict[str, Any], scraped: Dict[str, Any]) -> List[Dict[str, Any]]:
    """COURSES 設定 + スクレイプ結果から、保存用エントリ配列を作る。"""
    base = {
        "kana": cfg["kana"],
        "prefecture": cfg["prefecture"],
        "city": cfg["city"],
        "area": cfg["area"],
        "type": cfg["type"],
        "website": cfg["website"],
    }
    holes = scraped["holes"]
    total_par = scraped["totalPar"]
    source_url = scraped["source_url"]
    columns_by_label = scraped.get("_columns_by_label", {})
    sections = scraped.get("_sections") or []

    if sections:
        sections = _merge_shotnavi_sections_if_standard_course(sections)
        entries = []
        for idx, section in enumerate(sections, start=1):
            variant = section.get("label") or None
            entry_id = course_id if len(sections) == 1 else f"{course_id}-{idx}"
            entry_name = cfg["displayName"] if not variant else f'{cfg["displayName"]} - {variant}'
            entries.append({
                "id": entry_id,
                "parentClubId": course_id,
                "parentClubName": cfg["displayName"],
                "name": entry_name,
                "variant": variant,
                **base,
                "totalPar": section.get("totalPar"),
                "totalYards": section.get("totalYards"),
                "holes": section.get("holes", []),
                "tees": section.get("tees", []),
                "source": "shotnavi",
                "sourceUrl": section.get("source_url") or source_url,
            })
        return entries

    variants = cfg.get("variants")
    if not variants:
        return [{
            "id": course_id,
            "parentClubId": course_id,
            "parentClubName": cfg["displayName"],
            "name": cfg["displayName"],
            "variant": None,
            **base,
            "totalPar": total_par,
            "totalYards": scraped["totalYards"],
            "holes": holes,
            "tees": scraped["tees"],
            "source": "shotnavi",
            "sourceUrl": source_url,
        }]

    entries = []
    for v in variants:
        suffix = v["id_suffix"]
        label = v["label"]
        matched_label, v_yards = find_yards_for_variant(columns_by_label, v)
        if not v_yards:
            print(f"  ⚠ variant '{label}' に対応する列が見つかりません (見つけた列: {list(columns_by_label.keys())})")
            continue

        v_holes = []
        for h in holes:
            new_h = dict(h)
            if h["no"] in v_yards:
                new_h["yards"] = v_yards[h["no"]]
            v_holes.append(new_h)

        v_total_yards = sum(v_yards.values())

        entries.append({
            "id": f"{course_id}-{suffix}",
            "parentClubId": course_id,
            "parentClubName": cfg["displayName"],
            "name": f'{cfg["displayName"]} - {label}',
            "variant": label,
            **base,
            "totalPar": total_par,
            "totalYards": v_total_yards,
            "holes": v_holes,
            "tees": [{"color": matched_label[:20], "label": matched_label[:20], "yards": v_total_yards}],
            "source": "shotnavi",
            "sourceUrl": source_url,
        })
    return entries


# ──────────────────────────────────────────────────────────────────
# Validation
# ──────────────────────────────────────────────────────────────────

ValidationIssue = Dict[str, str]


def _validation_issue(severity: str, code: str, message: str) -> ValidationIssue:
    return {"severity": severity, "code": code, "message": message}


def _has_meaningful_hole_yards(holes: List[Dict[str, Any]]) -> bool:
    for hole in holes:
        yards = hole.get("yards")
        if isinstance(yards, dict) and any(v for v in yards.values()):
            return True
        if isinstance(yards, int) and yards > 0:
            return True
    return False


def _count_filled_holes(holes: List[Dict[str, Any]]) -> int:
    count = 0
    for hole in holes:
        yards = hole.get("yards")
        if isinstance(yards, dict) and any(v for v in yards.values()):
            count += 1
        elif isinstance(yards, int) and yards > 0:
            count += 1
    return count


def collect_validation_issues(entry: Dict[str, Any]) -> List[ValidationIssue]:
    """エントリの妥当性チェック結果を severity 付きで返す。"""
    issues: List[ValidationIssue] = []
    name = entry.get("name", "?")

    holes = entry.get("holes", [])
    if len(holes) not in (6, 9, 12, 18):
        issues.append(_validation_issue(
            "error",
            "hole_count_invalid",
            f"{name}: ホール数が6/9/12/18ではありません ({len(holes)})",
        ))

    tees = entry.get("tees", [])
    if not tees:
        issues.append(_validation_issue(
            "error",
            "tees_missing",
            f"{name}: ティー情報がありません",
        ))

    par_total = sum(h.get("par", 0) for h in holes)
    all_par3_short_course = (
        len(holes) in (6, 9, 12)
        and bool(holes)
        and all(h.get("par") == 3 for h in holes)
    )
    expected_range = (
        (len(holes) * 3, len(holes) * 3)
        if all_par3_short_course
        else ((32, 37) if len(holes) == 9 else (68, 74))
    )
    if not (expected_range[0] <= par_total <= expected_range[1]):
        issues.append(_validation_issue(
            "warning",
            "total_par_unexpected",
            f"{name}: 合計Parが異常 ({par_total})",
        ))

    for h in holes:
        no = h.get("no", "?")
        par = h.get("par")
        yards = h.get("yards")
        if yards is None or (isinstance(yards, dict) and not yards):
            issues.append(_validation_issue(
                "error",
                "yards_missing",
                f"{name} #{no}: yards 欠落",
            ))
        # 新形式 (dict {tee: yards}) は BACK 値 or 最大値で代表
        if isinstance(yards, dict):
            yards = yards.get("back") or (max(yards.values()) if yards else None)
        if par is None:
            issues.append(_validation_issue(
                "error",
                "par_missing",
                f"{name} #{no}: par 欠落",
            ))
        elif par == 3 and yards and yards > 260:
            issues.append(_validation_issue(
                "warning",
                "par3_yards_unusual",
                f"{name} #{no}: PAR3 で {yards}Y は不自然",
            ))
        elif par == 4 and yards and (yards < 230 or yards > 500):
            issues.append(_validation_issue(
                "warning",
                "par4_yards_out_of_range",
                f"{name} #{no}: PAR4 で {yards}Y は範囲外",
            ))
        elif par == 5 and yards and yards < 440:
            issues.append(_validation_issue(
                "warning",
                "par5_yards_short",
                f"{name} #{no}: PAR5 で {yards}Y は短すぎる",
            ))

    # HDCP の重複チェック
    # 18H コースでも OUT / IN でそれぞれ 1〜9 を使うケースがあるため、
    # 9ホール単位で一意性を見る。
    hdcp_chunks: List[List[int]] = []
    if len(holes) == 18:
        chunk_ranges = [(1, 9), (10, 18)]
        for start, end in chunk_ranges:
            chunk = [
                h.get("hdcp") for h in holes
                if start <= h.get("no", 0) <= end and h.get("hdcp") is not None
            ]
            if chunk:
                hdcp_chunks.append(chunk)
    else:
        chunk = [h.get("hdcp") for h in holes if h.get("hdcp") is not None]
        if chunk:
            hdcp_chunks.append(chunk)

    for chunk in hdcp_chunks:
        if len(chunk) != len(set(chunk)):
            issues.append(_validation_issue(
                "review",
                "hdcp_duplicate",
                f"{name}: HDCP に重複あり (実データ要確認)",
            ))
            break

    return issues


def validate_entry(entry: Dict[str, Any]) -> List[str]:
    """エントリの妥当性チェック。問題があればメッセージ配列を返す。"""
    return [issue["message"] for issue in collect_validation_issues(entry)]


# ──────────────────────────────────────────────────────────────────
# Output
# ──────────────────────────────────────────────────────────────────

def write_js(course_id: str, entries: List[Dict[str, Any]]) -> Path:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{course_id}.js"

    today = date.today().isoformat()
    js_lines = [
        f"// Auto-generated by scripts/scrape_courses.py",
        f"// Source: ShotNavi gcguide",
        f"// Generated: {today}",
        f"//",
        f"// 値が不正な場合は scripts/scrape_courses.py 内の COURSES 設定 or",
        f"// parser を調整してから再実行してください。",
        f"",
        f"export const COURSES = {json.dumps(entries, ensure_ascii=False, indent=2)};",
        f"",
        f"export default COURSES;",
        "",
    ]
    output_path.write_text("\n".join(js_lines), encoding="utf-8")
    return output_path


# ──────────────────────────────────────────────────────────────────
# Accordia Golf official scraper
# ──────────────────────────────────────────────────────────────────
#
# ページ構造 (reserve.accordiagolf.com/golfCourse/{pref}/{slug}/layout):
#   <table class="m-table__main"> が各サブコース毎に存在
#   前の <table class="m-table__heading"> が 1行でサブコース名 ("西", "南" 等)
#
#   m-table__main の行構成:
#     Row 0: HOLE | 1 | 2 | ... | 9 | 計
#     Row 1: PAR  | 4 | 4 | ... | 5 | 36
#     Row 2: <td colspan=N>Aグリーン</td>   ← グリーンセパレータ
#     Row 3: Blue Tee | 450 | ... | 3331
#     Row 4: White Tee | ...
#     Row 5: Green Tee | ...
#     Row 6: Red Tee | ...
#     Row 7: <td colspan=N>Bグリーン</td>   ← 2グリーンの場合
#     Row 8: Blue Tee | ...  (B グリーン用ヤーデージ)
#     ...
#     Row N: HDCP | 1 | 4 | ... | 9 | -

ACCORDIA_TEE_ORDER = ["black", "blue", "white", "green", "gold", "silver", "red"]


def _normalize_accordia_tee(label: str) -> str:
    """'Blue Tee' -> 'blue', 'White Tee' -> 'white' etc."""
    return re.sub(r"\s*[Tt]ee\s*$", "", label).strip().lower()


def _parse_accordia_main_table(table) -> Optional[Dict[str, Any]]:
    """m-table__main 1つを解析。

    Returns:
      {
        'hole_numbers': [1..9],
        'pars': [4, 4, 5, ...],
        'hdcps': [1, 4, 9, ...],
        'yards_by_green': {
          'Aグリーン': {'blue': [450,...], 'white': [435,...], ...},
          'Bグリーン': {'blue': [445,...], ...},
          ''          : {'blue': [...]}  # シングルグリーン
        }
      }
    """
    rows = table.find_all("tr")
    if len(rows) < 4:
        return None

    # ── フォーマット判定 ─────────────────────────────────────────────
    # 横形式: Row0 の 2列目以降に hole番号(1〜18)が並ぶ → 従来の複数ティー横並び表
    # 縦形式: Row0 が HOLE|PAR|ティー名... で Row1 以降がホール番号行
    header_cells = rows[0].find_all(["th", "td"])
    header_vals = [c.get_text(" ", strip=True) for c in header_cells]

    # 2列目以降に数字(ホール番号)があれば横形式
    hole_numbers_in_header = [
        int(v) for v in header_vals[1:] if v.isdigit() and 1 <= int(v) <= 18
    ]
    is_vertical = len(hole_numbers_in_header) == 0  # ホール番号がヘッダーにない

    if is_vertical:
        # ── 縦形式: 各行がホール1つ ─────────────────────────────────
        # ヘッダー: [HOLE_cell, PAR_cell, tee1_cell, ...]
        tee_ids_v = [_normalize_accordia_tee(v) for v in header_vals[2:]
                     if v and v.upper() not in _NON_YARDAGE_ROW_LABELS]
        hole_numbers: List[int] = []
        pars: List[Optional[int]] = []
        hdcps: List[Optional[int]] = []
        tee_yards_v: Dict[str, List[Optional[int]]] = {t: [] for t in tee_ids_v}

        for row in rows[1:]:
            rcells = row.find_all(["th", "td"])
            if not rcells:
                continue
            first_text = rcells[0].get_text(strip=True)
            if not first_text.isdigit():
                continue  # 計/TOTAL 行スキップ
            hole_no = int(first_text)
            if not (1 <= hole_no <= 18):
                continue
            hole_numbers.append(hole_no)
            pars.append(_to_int_or_none(rcells[1].get_text(strip=True)) if len(rcells) > 1 else None)
            hdcps.append(None)
            for ti, tee_id in enumerate(tee_ids_v):
                ci = ti + 2
                y = _to_int_or_none(rcells[ci].get_text(strip=True)) if ci < len(rcells) else None
                tee_yards_v[tee_id].append(y if y and 30 <= y <= 700 else None)

        if not hole_numbers:
            return None

        return {
            "hole_numbers": hole_numbers,
            "pars": pars,
            "hdcps": hdcps,
            "yards_by_green": {"": tee_yards_v},
        }

    # ── 横形式: Row0 にホール番号, 各ティーが行 ──────────────────────
    hole_numbers = hole_numbers_in_header
    n = len(hole_numbers)

    # Row 1: PAR
    par_cells = rows[1].find_all(["th", "td"])
    pars = [_to_int_or_none(c.get_text(strip=True)) for c in par_cells[1:1 + n]]

    # 残りの行: グリーンセパレータ / ティー行 / HDCP行
    yards_by_green: Dict[str, Dict[str, List[Optional[int]]]] = {}
    hdcps = []
    current_green = ""  # "" = シングルグリーン

    for row in rows[2:]:
        cells = row.find_all(["th", "td"])
        if not cells:
            continue

        first = cells[0]
        first_text = first.get_text(strip=True)

        # グリーンセパレータ行 (colspan あり)
        if first.get("colspan"):
            if first_text and first_text not in ("計", "TOTAL", "OUT", "IN"):
                current_green = first_text
            continue

        # HDCP 行
        if first_text.upper() in ("HDCP", "HCP"):
            hdcps = [_to_int_or_none(c.get_text(strip=True)) for c in cells[1:1 + n]]
            continue

        # 無視: 計/TOTAL/OUT/IN
        if first_text in ("計", "TOTAL", "OUT", "IN", ""):
            continue

        # ティー行
        tee_id = _normalize_accordia_tee(first_text)
        if not tee_id:
            continue

        yards_list = [_to_int_or_none(c.get_text(strip=True)) for c in cells[1:1 + n]]
        yards_by_green.setdefault(current_green, {})[tee_id] = [
            y if y and 30 <= y <= 700 else None for y in yards_list
        ]

    if not yards_by_green:
        return None

    return {
        "hole_numbers": hole_numbers,
        "pars": pars,
        "hdcps": hdcps,
        "yards_by_green": yards_by_green,
    }


def _accordia_subcourse_name(table) -> str:
    """m-table__main の直前 m-table__heading からサブコース名を取得。"""
    sib = table.find_previous_sibling("table")
    if sib and "m-table__heading" in (sib.get("class") or []):
        txt = sib.get_text(strip=True)
        # 複数行あれば最初の意味のある行だけ
        return txt.split("\n")[0].strip()
    return ""


def scrape_accordia(cfg: Dict[str, Any], *, force: bool = False) -> List[Dict[str, Any]]:
    """Accordia Golf 公式コースレイアウトページから取得。

    URL: https://reserve.accordiagolf.com/golfCourse/{pref}/{slug}/layout
    """
    slug = cfg.get("accordia_slug")
    pref = cfg.get("accordia_pref")
    if not slug or not pref:
        print(f"  ⚠ accordia_slug または accordia_pref が未設定")
        return []

    url = f"https://reserve.accordiagolf.com/golfCourse/{pref}/{slug}/layout"
    print(f"  fetching Accordia: {url}")
    html = fetch(url, force=force)
    soup = BeautifulSoup(html, "html.parser")
    course_id = cfg.get("_course_id", "unknown")

    # スコアカードとなる m-table__main を収集
    # ページには同じデータが複数フォーマット（横形式・縦形式）で存在することがある。
    # 前の <table class="m-table__heading"> にサブコース名がある場合はそれを優先し、
    # 見出しなしテーブルはモバイル用重複とみなして除外する。
    named_tables: List[Any] = []   # 前に m-table__heading がある
    unnamed_tables: List[Any] = [] # ない
    for table in soup.find_all("table", class_="m-table__main"):
        rows = table.find_all("tr")
        if len(rows) < 4:
            continue
        first_row_text = rows[0].get_text(" ", strip=True).upper().replace(" ", "")
        if "HOLE" not in first_row_text:
            continue
        sib = table.find_previous_sibling("table")
        if sib and "m-table__heading" in (sib.get("class") or []):
            named_tables.append(table)
        else:
            unnamed_tables.append(table)

    # named がある場合は named のみ、なければ unnamed を使う
    scorecard_tables = named_tables if named_tables else unnamed_tables

    if not scorecard_tables:
        print(f"  ⚠ スコアカードテーブル (m-table__main) が見つかりません")
        return []

    display_name = cfg["displayName"]
    base = {
        "kana": cfg["kana"], "prefecture": cfg["prefecture"],
        "city": cfg["city"], "area": cfg["area"],
        "type": cfg["type"], "website": cfg["website"],
    }
    entries: List[Dict[str, Any]] = []

    for table in scorecard_tables:
        parsed = _parse_accordia_main_table(table)
        if not parsed or not parsed["hole_numbers"]:
            continue

        subcourse_raw = _accordia_subcourse_name(table)

        for green_name, tee_yards in parsed["yards_by_green"].items():
            # ── ホールデータ組み立て ──────────────────────────────────
            holes: List[Dict[str, Any]] = []
            for i, hole_no in enumerate(parsed["hole_numbers"]):
                par  = parsed["pars"][i] if i < len(parsed["pars"]) else None
                hdcp = parsed["hdcps"][i] if i < len(parsed["hdcps"]) else None
                yards: Dict[str, int] = {}
                for tee_id, yards_list in tee_yards.items():
                    if i < len(yards_list) and yards_list[i] is not None:
                        yards[tee_id] = yards_list[i]
                holes.append({"no": hole_no, "par": par, "hdcp": hdcp, "yards": yards})

            if not holes:
                continue
            if not _has_meaningful_hole_yards(holes):
                continue
            if _count_filled_holes(holes) < len(holes) // 2:
                continue

            # ── tees 合計 ─────────────────────────────────────────────
            tee_totals: Dict[str, int] = {}
            for h in holes:
                for tee, y in h["yards"].items():
                    tee_totals[tee] = tee_totals.get(tee, 0) + y

            order = {n: i for i, n in enumerate(ACCORDIA_TEE_ORDER)}
            tees_array = sorted(
                [{"id": t, "label": t.upper(), "totalYards": total}
                 for t, total in tee_totals.items()],
                key=lambda x: order.get(x["id"], 99),
            )

            total_par = sum(h["par"] for h in holes if h.get("par"))

            # ── ID / 名前 ─────────────────────────────────────────────
            # サブコース名 + グリーン名 を組み合わせる
            parts: List[str] = []
            if subcourse_raw:
                parts.append(subcourse_raw)
            if green_name:
                parts.append(green_name)

            variant_label = " / ".join(parts) if parts else None

            id_suffix = re.sub(r"[^\w]", "", "".join(parts), flags=re.UNICODE).lower()
            entry_id = f"{course_id}-{id_suffix}" if id_suffix else course_id

            name_parts = [display_name] + parts
            entry_name = " - ".join(name_parts)

            entries.append({
                "id": entry_id,
                "parentClubId": course_id,
                "parentClubName": display_name,
                "name": entry_name,
                "variant": variant_label,
                **base,
                "totalPar": total_par,
                "tees": tees_array,
                "holes": holes,
                "source": "official",
                "sourceUrl": url,
            })

    # 同一 variant の複数テーブルが連番ホールで分割されている場合は 1 entry にマージする。
    merged: Dict[Tuple[str, str, str], Dict[str, Any]] = {}
    merged_order: List[Tuple[str, str, str]] = []
    for entry in entries:
        key = (entry["id"], entry.get("variant") or "", entry["name"])
        existing = merged.get(key)
        if existing is None:
            merged[key] = entry
            merged_order.append(key)
            continue

        existing_holes = {h["no"] for h in existing.get("holes", [])}
        new_holes = {h["no"] for h in entry.get("holes", [])}
        if existing_holes & new_holes:
            # 本当に重複している場合は従来どおり後で suffix を付けて分離する
            alt_key = (f"{entry['id']}__dup{len(merged_order)}", entry.get("variant") or "", entry["name"])
            merged[alt_key] = entry
            merged_order.append(alt_key)
            continue

        existing["holes"].extend(entry.get("holes", []))
        existing["holes"].sort(key=lambda h: h["no"])
        existing["totalPar"] = sum(h["par"] for h in existing["holes"] if h.get("par"))

        tee_totals = {t["id"]: dict(t) for t in existing.get("tees", [])}
        for tee in entry.get("tees", []):
            if tee["id"] in tee_totals:
                tee_totals[tee["id"]]["totalYards"] += tee["totalYards"]
            else:
                tee_totals[tee["id"]] = dict(tee)
        order = {n: i for i, n in enumerate(ACCORDIA_TEE_ORDER)}
        existing["tees"] = sorted(
            tee_totals.values(),
            key=lambda x: order.get(x["id"], 99),
        )

    entries = [merged[key] for key in merged_order]

    # ── ID 重複を解消 ──────────────────────────────────────────────
    # サブコース名もグリーン名も取れない場合（例: 9H 2グリーン）に同一IDが
    # 複数できることがある。その場合は末尾に -a / -b / -c を付与する。
    _id_counts: Dict[str, int] = {}
    for e in entries:
        _id_counts[e["id"]] = _id_counts.get(e["id"], 0) + 1
    _id_seen: Dict[str, int] = {}
    _alpha = ["a", "b", "c", "d", "e"]
    for e in entries:
        eid = e["id"]
        if _id_counts[eid] > 1:
            _id_seen[eid] = _id_seen.get(eid, 0) + 1
            idx = _id_seen[eid] - 1
            suffix = _alpha[idx] if idx < len(_alpha) else str(idx + 1)
            e["id"] = f"{eid}-{suffix}"
            if e["variant"] is None:
                e["variant"] = suffix.upper() + "グリーン"
            if e["name"] == display_name:
                e["name"] = f"{display_name} - {suffix.upper()}グリーン"

    return entries


def scrape_one(course_id: str, *, force: bool) -> bool:
    cfg = COURSES.get(course_id)
    if not cfg:
        print(f"Unknown course: {course_id}")
        return False

    print(f"\n=== {cfg['displayName']} ({course_id}) ===")

    # スクレイパーをディスパッチ
    scraper_kind = cfg.get("scraper", "shotnavi")

    if scraper_kind == "akabane_official":
        entries = scrape_akabane_official(cfg, force=force)
        if not entries:
            print(f"  → スクレイプ失敗")
            return False
    elif scraper_kind == "pgm_official":
        # course_id を cfg に注入(PGMスクレイパーが entry id 生成に使う)
        cfg_with_id = {**cfg, "_course_id": course_id}
        entries = scrape_pgm_official(cfg_with_id, force=force)
        if not entries:
            print(f"  → スクレイプ失敗")
            return False
    elif scraper_kind == "accordia":
        cfg_with_id = {**cfg, "_course_id": course_id}
        entries = scrape_accordia(cfg_with_id, force=force)
        if not entries:
            print(f"  → スクレイプ失敗")
            return False
    elif scraper_kind == "shotnavi":
        scraped = scrape_shotnavi(cfg["shotnavi_id"], force=force)
        if not scraped:
            print(f"  → スクレイプ失敗")
            return False
        print(f"  parsed holes: {len([h for h in scraped['holes'] if 'par' in h])}/18")
        print(f"  total par: {scraped['totalPar']}, total yards: {scraped['totalYards']}")
        print(f"  yards rows (tees): {len(scraped['tees'])}")
        entries = build_entries(course_id, cfg, scraped)
    else:
        print(f"  unknown scraper kind: {scraper_kind}")
        return False

    output = write_js(course_id, entries)
    print(f"  → wrote {output}")

    # Validation
    any_warning = False
    for entry in entries:
        warnings = validate_entry(entry)
        if warnings:
            any_warning = True
            for w in warnings:
                print(f"  ⚠ {w}")
    if not any_warning:
        print(f"  ✓ all validations passed")
    return True


def main():
    parser = argparse.ArgumentParser(description="Golf course scraper")
    parser.add_argument("courses", nargs="*", help="Course ID(s) to scrape (omit for all)")
    parser.add_argument("--force", action="store_true", help="Bypass cache, re-fetch")
    parser.add_argument("--list", action="store_true", help="List configured courses and exit")
    args = parser.parse_args()

    if args.list:
        for cid, cfg in COURSES.items():
            print(f"  {cid:20s} {cfg['displayName']}")
        return 0

    targets = args.courses or list(COURSES.keys())
    success = 0
    for cid in targets:
        if scrape_one(cid, force=args.force):
            success += 1

    print(f"\nSummary: {success}/{len(targets)} courses scraped successfully")
    print(f"Output dir: {OUTPUT_DIR}")

    # index.js を自動再生成
    _regenerate_index_js()

    if success < len(targets):
        return 1
    return 0


def _regenerate_index_js() -> None:
    """src/data/courses/index.js を auto/*.js に合わせて再生成する。"""
    index_path = OUTPUT_DIR.parent / "index.js"

    files = sorted(p.stem for p in OUTPUT_DIR.glob("*.js"))

    def varname(slug: str) -> str:
        return "C_" + slug.replace("-", "_").replace(".", "_")

    lines: List[str] = [
        "// 全コースデータの集約・正規化。",
        "// auto/*.js の生成フォーマット → アプリ共通フォーマットに変換して export する。",
        "// ⚠ このファイルは scripts/scrape_courses.py 実行後に自動再生成される。手動編集不要。",
        "",
    ]
    for slug in files:
        vn = varname(slug)
        lines.append(f"import {{ COURSES as {vn} }} from './auto/{slug}';")

    lines += [
        "",
        "// auto/*.js の tees フォーマット: { id, label, totalYards }",
        "// アプリ共通フォーマット: { color, label, yards }",
        "function normalizeTee(t) {",
        "  return {",
        "    color: t.id || t.color || 'white',",
        "    label: t.label,",
        "    yards: t.totalYards || t.yards || 0,",
        "  };",
        "}",
        "",
        "// auto/*.js → アプリ共通フォーマットに変換",
        "function normalize(entry) {",
        "  return {",
        "    ...entry,",
        "    par: entry.totalPar || entry.par || 72,",
        "    tees: (entry.tees || []).map(normalizeTee),",
        "  };",
        "}",
        "",
        "const RAW = [",
    ]
    for i in range(0, len(files), 4):
        chunk = files[i:i + 4]
        spread = ", ".join(f"...{varname(s)}" for s in chunk)
        lines.append(f"  {spread},")

    lines += [
        "];",
        "",
        "export const ALL_COURSES = RAW.map(normalize);",
        "export default ALL_COURSES;",
        "",
    ]

    index_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"  ✓ regenerated {index_path.relative_to(PROJECT_ROOT)} ({len(files)} files)")


if __name__ == "__main__":
    sys.exit(main())
