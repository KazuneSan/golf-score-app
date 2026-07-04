#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Cache 内の HTML ページ構造を簡易表示するデバッグツール。

Usage:
    python3 scripts/inspect_cache.py akabane-gc
    python3 scripts/inspect_cache.py koshigaya-gc

スクレイプが失敗したときに、ページの中身がどうなっているか確認するために使う。
"""

import sys
import re
from pathlib import Path

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("pip3 install -r scripts/requirements.txt をしてください")
    sys.exit(1)

# scrape_courses.py と合わせる
sys.path.insert(0, str(Path(__file__).parent))
from scrape_courses import COURSES, CACHE_DIR  # noqa


def inspect_url(course_id: str, url: str, label: str):
    cfg = COURSES.get(course_id)
    safe = re.sub(r"[^a-zA-Z0-9]+", "_", url).strip("_")[:140]
    cache_path = CACHE_DIR / f"{safe}.html"

    if not cache_path.exists():
        print(f"Cache not found: {cache_path}")
        print(f"先に python3 scripts/scrape_courses.py {course_id} を実行してキャッシュを作ってください")
        return

    html = cache_path.read_text(encoding="utf-8", errors="replace")
    soup = BeautifulSoup(html, "html.parser")

    print(f"=== {cfg['displayName']} ({course_id}) — {label} ===")
    print(f"URL: {url}")
    print(f"HTML size: {len(html)} bytes")
    print()
    _inspect_soup(soup)
    print()
    print("─" * 60)
    print()


def inspect(course_id: str):
    cfg = COURSES.get(course_id)
    if not cfg:
        print(f"Unknown course: {course_id}")
        return

    shotnavi_id = cfg["shotnavi_id"]
    out_url = f"http://shotnavi.jp/gcguide/cdata/cdata_{shotnavi_id}_0.htm"
    in_url = f"http://shotnavi.jp/gcguide/cdata/cdata_{shotnavi_id}_1.htm"

    inspect_url(course_id, out_url, "OUT (cdata_X_0.htm)")
    inspect_url(course_id, in_url, "IN (cdata_X_1.htm)")


def _inspect_soup(soup):

    # ページタイトル
    title = soup.find("title")
    print(f"<title>: {title.get_text(strip=True) if title else '(none)'}")
    print()

    # H1, H2
    for tag in ["h1", "h2", "h3"]:
        elements = soup.find_all(tag)
        for e in elements[:5]:
            print(f"<{tag}>: {e.get_text(strip=True)[:80]}")
    print()

    # テーブル一覧
    tables = soup.find_all("table")
    print(f"Total tables: {len(tables)}")
    for i, table in enumerate(tables):
        rows = table.find_all("tr")
        print(f"  Table[{i}]: {len(rows)} rows, class={table.get('class')}, id={table.get('id')}")
        for ri, tr in enumerate(rows[:3]):
            cells = [c.get_text(' ', strip=True)[:25] for c in tr.find_all(['th', 'td'])]
            print(f"    row[{ri}] ({len(cells)}cells): {cells[:10]}")
    print()

    # divベースのスコアカード探索
    keywords = ["PAR", "ヤード", "Yards", "ハンディ", "HOLE", "OUT", "IN"]
    print("テキスト全文中のキーワード出現位置 (上位3つ):")
    full_text = soup.get_text(' ', strip=True)
    for kw in keywords:
        positions = [m.start() for m in re.finditer(re.escape(kw), full_text)][:3]
        if positions:
            samples = [full_text[max(0, p-30):p+50] for p in positions]
            print(f"  '{kw}': found at {positions}")
            for s in samples[:1]:
                print(f"    ...{s}...")
    print()

    # data-table div の有無を最優先で確認
    print("--- data-table div ---")
    dt = soup.find("div", class_="data-table")
    if dt:
        print(f"FOUND <div class='data-table'>:")
        print(f"  text: {dt.get_text(' ', strip=True)[:400]}")
    else:
        print("NOT FOUND <div class='data-table'>")
        # data-table らしき他の要素も探してみる
        for cls_name in ["data-area", "scorecard", "course-data", "hole-list"]:
            elems = soup.find_all(class_=cls_name)
            if elems:
                print(f"  alt found: class={cls_name}, count={len(elems)}")
                for e in elems[:1]:
                    print(f"    text: {e.get_text(' ', strip=True)[:300]}")
    print()

    # ホール番号シーケンスを含む要素 (OUT: 1-9, IN: 10-18 どちらでも検出)
    print("ホール番号シーケンス (OUT 1〜9 or IN 10〜18) を含む要素:")
    for elem in soup.find_all(['table', 'div', 'section'])[:50]:
        text = elem.get_text(' ', strip=True)
        if not text or len(text) > 2000:
            continue
        nums = re.findall(r'\b(\d{1,2})\b', text)
        nums_int = [int(n) for n in nums if n.isdigit()]
        # OUT (1〜9 全部) または IN (10〜18 全部)
        has_out = all(n in nums_int for n in range(1, 10))
        has_in = all(n in nums_int for n in range(10, 19))
        if has_out or has_in:
            which = "OUT+IN" if (has_out and has_in) else ("OUT" if has_out else "IN")
            tag = elem.name
            cls = elem.get('class')
            print(f"  [{which}] <{tag} class={cls}>: {text[:250]}")
            print()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/inspect_cache.py <course_id>")
        print("Example: python3 scripts/inspect_cache.py akabane-gc")
        sys.exit(1)
    inspect(sys.argv[1])
