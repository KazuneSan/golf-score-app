#!/usr/bin/env python3
"""ドリル解説漫画をアプリに取り込む。

ChatGPT で生成した PNG を ~/Downloads に `{ドリルID}.png` の名前で置いておき、
このスクリプトを実行すると WebP に変換して assets/drills/ に配置する。
最後に DrillDetailScreen.js の DRILL_MANGA に貼る行を出力する。

    python3 scripts/import_drill_manga.py            # Downloads から自動で拾う
    python3 scripts/import_drill_manga.py ~/x/p1.png # ファイル指定

ドリルIDは src/data/drillDetails.js の DRILL_DETAILS のキーと一致させること。
"""
import os
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit('Pillow が必要です:  pip3 install --user Pillow')

ROOT = Path(__file__).resolve().parent.parent
DRILL_JS = ROOT / 'src' / 'data' / 'drillDetails.js'
OUT_DIR = ROOT / 'assets' / 'drills'
DOWNLOADS = Path.home() / 'Downloads'
QUALITY = 88


def known_drill_ids():
    """drillDetails.js の DRILL_DETAILS から id を集める。"""
    src = DRILL_JS.read_text(encoding='utf-8')
    body = src.split('export const DRILL_DETAILS', 1)[1]
    return set(re.findall(r"^\s{2}(\w+):\s*\{", body, re.M))


def convert(src_path: Path, drill_id: str) -> dict:
    im = Image.open(src_path)
    if im.mode not in ('RGB', 'L'):
        im = im.convert('RGB')
    out = OUT_DIR / f'{drill_id}.webp'
    im.save(out, 'WEBP', quality=QUALITY, method=6)
    return {
        'id': drill_id,
        'w': im.size[0],
        'h': im.size[1],
        'before': src_path.stat().st_size // 1024,
        'after': out.stat().st_size // 1024,
    }


def main():
    ids = known_drill_ids()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    if len(sys.argv) > 1:
        candidates = [Path(a).expanduser() for a in sys.argv[1:]]
    else:
        candidates = sorted(DOWNLOADS.glob('*.png'))

    results, skipped = [], []
    for path in candidates:
        drill_id = path.stem
        if drill_id not in ids:
            skipped.append(path.name)
            continue
        results.append(convert(path, drill_id))

    if not results:
        print('取り込めるファイルがありませんでした。')
        if skipped:
            print('\nドリルIDと一致しなかったファイル:')
            for n in skipped[:20]:
                print(f'  - {n}')
            print('\nファイル名は Notion「漫画生成プロンプト集」の各見出しに'
                  '書いてある名前にしてください。')
        return

    total_before = sum(r['before'] for r in results)
    total_after = sum(r['after'] for r in results)
    print(f'取り込み {len(results)} 枚:\n')
    for r in results:
        print(f"  {r['id']:<10} {r['w']}x{r['h']}  {r['before']}KB -> {r['after']}KB")
    print(f'\n合計 {total_before}KB -> {total_after}KB')

    print('\nDrillDetailScreen.js の DRILL_MANGA に以下を追加:\n')
    for r in results:
        print(f"  {r['id']}: require('../../assets/drills/{r['id']}.webp'),")

    # 全ドリルの進捗
    done = {p.stem for p in OUT_DIR.glob('*.webp')}
    print(f'\n進捗: {len(done)} / {len(ids)} ドリル')
    remaining = sorted(ids - done)
    if remaining:
        print(f'残り {len(remaining)}: ' + ' '.join(remaining))


if __name__ == '__main__':
    main()
