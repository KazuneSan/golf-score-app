#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""任意のURLを fetch してページ構造を表示するデバッグツール。

Usage:
    python3 scripts/inspect_url.py "https://www.akabanegolf.co.jp/courses"
    python3 scripts/inspect_url.py --force "https://..."  # キャッシュ無視

ティー別データなど、ShotNavi にないデータを公式サイトから探すときに使う。
"""

import sys
import re
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from scrape_courses import fetch  # noqa

try:
    from bs4 import BeautifulSoup
except ImportError:
    print("pip3 install -r scripts/requirements.txt をしてください")
    sys.exit(1)


def inspect(url: str, force: bool = False):
    print(f"=== {url} ===")
    html = fetch(url, force=force)
    print(f"HTML size: {len(html)} bytes")
    print()

    soup = BeautifulSoup(html, "html.parser")

    # Title
    title = soup.find("title")
    print(f"<title>: {title.get_text(strip=True) if title else '(none)'}")
    print()

    # Headings
    print("Headings:")
    for tag in ["h1", "h2", "h3"]:
        for e in soup.find_all(tag)[:6]:
            print(f"  <{tag}>: {e.get_text(' ', strip=True)[:80]}")
    print()

    # Tables (全行出す)
    tables = soup.find_all("table")
    print(f"Total tables: {len(tables)}")
    for i, table in enumerate(tables[:6]):
        rows = table.find_all("tr")
        cls = table.get("class")
        print(f"  Table[{i}]: {len(rows)} rows, class={cls}")
        # 全行ダンプ
        for ri, tr in enumerate(rows):
            cells = [c.get_text(' ', strip=True)[:40] for c in tr.find_all(['th', 'td'])]
            print(f"    row[{ri}] ({len(cells)}c): {cells[:14]}")
        print()
    print()

    # キーワードで「ティー別データ」っぽい文字列を探す
    full_text = soup.get_text(" ", strip=True)
    tee_kw = ["BACK", "REGULAR", "FRONT", "WHITE", "BLUE", "RED", "GOLD", "LADIES",
              "バック", "レギュラー", "フロント", "レディース", "ゴールド"]
    print("ティー関連キーワード出現:")
    for kw in tee_kw:
        positions = [m.start() for m in re.finditer(re.escape(kw), full_text)][:2]
        if positions:
            sample = full_text[max(0, positions[0]-30):positions[0]+80]
            print(f"  '{kw}' x{len(positions)}: ...{sample}...")
    print()

    # 内部リンク (各ホール詳細ページなどを探す)
    print("内部リンク (上位30):")
    seen = set()
    for a in soup.find_all("a", href=True)[:60]:
        href = a["href"]
        if href.startswith(("#", "mailto:", "tel:", "javascript:")):
            continue
        if href in seen:
            continue
        seen.add(href)
        text = a.get_text(strip=True)[:30]
        print(f"  {href[:60]:60s} | {text}")


if __name__ == "__main__":
    args = sys.argv[1:]
    force = "--force" in args
    args = [a for a in args if a != "--force"]
    if len(args) < 1:
        print("Usage: python3 scripts/inspect_url.py [--force] <URL>")
        sys.exit(1)
    inspect(args[0], force=force)
