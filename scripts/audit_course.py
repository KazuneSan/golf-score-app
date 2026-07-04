#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Audit one course by comparing the current scraped result against a reference file.

Reference file formats:
  - generated JS file: export const COURSES = [...]
  - JSON file containing:
      * a list of entries
      * {"entries": [...]}
      * a single entry object
"""

import argparse
import json
import re
import sys
import tempfile
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import scrape_courses as sc


def _normalize_text(value: Optional[str]) -> str:
    if not value:
        return ""
    value = value.strip().lower()
    value = re.sub(r"\s+", "", value)
    return value


def _normalize_variant_text(value: Optional[str]) -> str:
    value = _normalize_text(value)
    value = value.replace("グリーン", "")
    return value


TEE_ID_ALIASES = {
    "青": "blue",
    "ブルー": "blue",
    "blue": "blue",
    "白": "white",
    "ホワイト": "white",
    "white": "white",
    "赤": "red",
    "レッド": "red",
    "red": "red",
    "緑": "green",
    "グリーン": "green",
    "green": "green",
    "黒": "black",
    "ブラック": "black",
    "black": "black",
    "金": "gold",
    "ゴールド": "gold",
    "gold": "gold",
    "銀": "silver",
    "シルバー": "silver",
    "silver": "silver",
    "back": "blue",
    "regular": "white",
    "front": "red",
    "ladies": "red",
}


def _canonical_tee_id(value: Optional[str]) -> str:
    normalized = _normalize_text(value)
    if not normalized:
        return ""
    if normalized in TEE_ID_ALIASES:
        return TEE_ID_ALIASES[normalized]

    for key, canonical in TEE_ID_ALIASES.items():
        if key and key in normalized:
            return canonical

    compact = normalized
    compact = compact.replace("【a】", "").replace("【b】", "")
    compact = compact.replace("aグリーン", "").replace("bグリーン", "")
    compact = compact.replace("グリーン", "")
    compact = compact.replace("ベント", "").replace("bent", "")
    compact = compact.replace("高麗", "").replace("コーライ", "").replace("korai", "")
    compact = compact.replace("t", "")
    compact = compact.strip("-_/")
    if compact in TEE_ID_ALIASES:
        return TEE_ID_ALIASES[compact]
    for key, canonical in TEE_ID_ALIASES.items():
        if key and key in compact:
            return canonical
    return normalized


def _candidate_tee_keys(tee_id: str) -> List[str]:
    return [tee_id]


def _load_js_array(path: Path) -> List[Dict[str, Any]]:
    text = path.read_text(encoding="utf-8")
    match = re.search(r"export const COURSES = (\[.*\]);", text, flags=re.S)
    if not match:
        raise ValueError(f"{path} から COURSES 配列を抽出できません")
    return json.loads(match.group(1))


def _decode_nuxt_value(table: List[Any], value: Any, memo: Dict[int, Any]) -> Any:
    if isinstance(value, bool) or value is None or isinstance(value, str):
        return value
    if isinstance(value, float):
        return value
    if isinstance(value, int):
        if value < 0 or value >= len(table):
            return value
        if value in memo:
            return memo[value]
        raw = table[value]
        if isinstance(raw, list) and raw:
            tag = raw[0]
            if tag in ("ShallowReactive", "Reactive"):
                decoded = _decode_nuxt_value(table, raw[1], memo)
                memo[value] = decoded
                return decoded
            if tag == "Set":
                decoded = [_decode_nuxt_value(table, item, memo) for item in raw[1:]]
                memo[value] = decoded
                return decoded
        if isinstance(raw, list):
            decoded = [_decode_nuxt_value(table, item, memo) for item in raw]
            memo[value] = decoded
            return decoded
        if isinstance(raw, dict):
            decoded = {k: _decode_nuxt_value(table, v, memo) for k, v in raw.items()}
            memo[value] = decoded
            return decoded
        memo[value] = raw
        return raw
    if isinstance(value, list):
        return [_decode_nuxt_value(table, item, memo) for item in value]
    if isinstance(value, dict):
        return {k: _decode_nuxt_value(table, v, memo) for k, v in value.items()}
    return value


def _parse_gora_html(text: str) -> List[Dict[str, Any]]:
    match = re.search(r'<script type="application/json" data-nuxt-data="nuxt-app"[^>]*id="__NUXT_DATA__">(.+?)</script>', text, flags=re.S)
    if not match:
        raise ValueError("楽天GORAの __NUXT_DATA__ が見つかりません")

    raw_table = json.loads(match.group(1))
    root = _decode_nuxt_value(raw_table, 1, {})

    pinia = root.get("pinia", {})
    course_info = pinia.get("golfCourse", {})
    basic = course_info.get("basic", {})
    course = course_info.get("course", {})
    course_list = course.get("list", [])
    course_name = basic.get("name") or ""

    raw_entries: List[Dict[str, Any]] = []
    for section in course_list:
        section_name = section.get("name") or ""
        section_name_key = _normalize_text(section_name)
        hole_offset = 9 if section_name_key in {"in", "back9", "back"} else 0
        tee_list = section.get("tee", {}).get("list", [])
        green_list = section.get("green", {}).get("list", [])
        layout_list = section.get("layout", {}).get("list", [])

        tee_names = {tee.get("teeId"): _normalize_text(tee.get("name")) for tee in tee_list}
        tee_labels = {tee.get("teeId"): (tee.get("name") or "").strip() for tee in tee_list}
        green_names = {green.get("greenId"): (green.get("name") or "").strip() for green in green_list}

        holes_by_green: Dict[str, List[Dict[str, Any]]] = {gid: [] for gid in green_names}
        for hole in layout_list:
            hole_no = hole.get("holeNumber")
            if not isinstance(hole_no, int):
                continue
            hole_no += hole_offset
            par = hole.get("par")
            hdcp = hole.get("handicap")

            by_green: Dict[str, Dict[str, int]] = {gid: {} for gid in green_names}
            for distance in hole.get("distance", []):
                green_id = distance.get("greenId")
                tee_id = distance.get("teeId")
                value = distance.get("value")
                tee_name = tee_names.get(tee_id)
                if green_id in by_green and tee_name and isinstance(value, int):
                    by_green[green_id][tee_name] = value

            for green_id, yards in by_green.items():
                holes_by_green.setdefault(green_id, []).append({
                    "no": hole_no,
                    "par": par,
                    "hdcp": hdcp,
                    "yards": yards,
                })

        for green_id, holes in holes_by_green.items():
            holes.sort(key=lambda h: h["no"])
            tee_totals: Dict[str, int] = {}
            for hole in holes:
                for tee_name, yards in hole.get("yards", {}).items():
                    tee_totals[tee_name] = tee_totals.get(tee_name, 0) + yards

            green_label = green_names.get(green_id, "")
            parts = []
            if len(course_list) > 1 and section_name:
                parts.append(section_name)
            if green_label:
                parts.append(green_label)
            variant = " / ".join(parts) if parts else None

            raw_entries.append({
                "id": None,
                "name": f"{course_name} - {variant}" if variant else course_name,
                "variant": variant,
                "totalPar": sum(h.get("par", 0) for h in holes),
                "tees": [
                    {
                        "id": tee_name,
                        "label": tee_labels.get(tee_id, tee_name).upper(),
                        "totalYards": total,
                    }
                    for tee_id, tee_name in ((tee.get("teeId"), tee_names.get(tee.get("teeId"))) for tee in tee_list)
                    if tee_name in tee_totals
                    for total in [tee_totals[tee_name]]
                ],
                "holes": holes,
                "source": "rakuten_gora",
            })

    if not raw_entries:
        raise ValueError("楽天GORA HTML からコース情報を抽出できません")

    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for entry in raw_entries:
        variant = entry.get("variant") or ""
        parts = [p.strip() for p in variant.split("/") if p.strip()]
        green_key = _normalize_variant_text(parts[-1] if parts else variant)
        grouped.setdefault(green_key, []).append(entry)

    merged_entries: List[Dict[str, Any]] = []
    for group_entries in grouped.values():
        if len(group_entries) == 1:
            merged_entries.extend(group_entries)
            continue

        hole_sets = []
        overlap = False
        for entry in group_entries:
            numbers = {h["no"] for h in entry.get("holes", []) if isinstance(h.get("no"), int)}
            for seen in hole_sets:
                if numbers & seen:
                    overlap = True
                    break
            hole_sets.append(numbers)
            if overlap:
                break

        if overlap:
            merged_entries.extend(group_entries)
            continue

        base = dict(group_entries[0])
        all_holes = []
        tee_totals: Dict[str, int] = {}
        for entry in group_entries:
            all_holes.extend(entry.get("holes", []))
            for tee in entry.get("tees", []):
                tee_id = tee.get("id")
                total = tee.get("totalYards") or 0
                tee_totals[tee_id] = tee_totals.get(tee_id, 0) + total

        all_holes.sort(key=lambda h: h["no"])
        base["holes"] = all_holes
        base["totalPar"] = sum(h.get("par", 0) for h in all_holes)
        base["tees"] = [
            {
                "id": tee.get("id"),
                "label": tee.get("label"),
                "totalYards": tee_totals.get(tee.get("id"), tee.get("totalYards")),
            }
            for tee in group_entries[0].get("tees", [])
            if tee.get("id") in tee_totals
        ]
        parts = [p.strip() for p in (base.get("variant") or "").split("/") if p.strip()]
        if len(parts) >= 2:
            base["variant"] = parts[-1]
            base["name"] = f"{course_name} - {base['variant']}"
        merged_entries.append(base)

    return merged_entries


def _load_reference_entries(path: Path) -> List[Dict[str, Any]]:
    if path.suffix.lower() == ".js":
        return _load_js_array(path)
    if path.suffix.lower() in (".html", ".htm"):
        text = path.read_text(encoding="utf-8", errors="replace")
        if "__NUXT_DATA__" in text and "rakuten.co.jp" in text:
            return _parse_gora_html(text)
        raise ValueError(f"{path} のHTML形式は未対応です")

    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        if isinstance(data.get("entries"), list):
            return data["entries"]
        if "holes" in data:
            return [data]
    raise ValueError(f"{path} の形式を解釈できません")


def _detect_reference_source(*, path: Optional[Path] = None, url: Optional[str] = None) -> str:
    if url:
        if "rakuten.co.jp" in url:
            return "rakuten_gora"
        return "web_reference"
    if not path:
        return "unknown"
    if path.suffix.lower() == ".js":
        return "generated_js"
    if path.suffix.lower() in (".html", ".htm"):
        text = path.read_text(encoding="utf-8", errors="replace")
        if "__NUXT_DATA__" in text and "rakuten.co.jp" in text:
            return "rakuten_gora"
        return "html_reference"
    if path.suffix.lower() == ".json":
        return "json_reference"
    return path.suffix.lower().lstrip(".") or "unknown"


def _scrape_entries(course_id: str, *, force: bool = False) -> List[Dict[str, Any]]:
    cfg = sc.COURSES.get(course_id)
    if not cfg:
        raise KeyError(f"Unknown course: {course_id}")

    scraper_kind = cfg.get("scraper", "shotnavi")
    if scraper_kind == "akabane_official":
        return sc.scrape_akabane_official(cfg, force=force)
    if scraper_kind == "pgm_official":
        return sc.scrape_pgm_official({**cfg, "_course_id": course_id}, force=force)
    if scraper_kind == "accordia":
        return sc.scrape_accordia({**cfg, "_course_id": course_id}, force=force)
    if scraper_kind == "shotnavi":
        scraped = sc.scrape_shotnavi(cfg["shotnavi_id"], force=force)
        if not scraped:
            return []
        return sc.build_entries(course_id, cfg, scraped)
    raise ValueError(f"Unknown scraper kind: {scraper_kind}")


def _load_generated_entries(course_id: str) -> List[Dict[str, Any]]:
    path = sc.OUTPUT_DIR / f"{course_id}.js"
    if not path.exists():
        raise FileNotFoundError(f"生成済みファイルがありません: {path}")
    return _load_js_array(path)


def _entry_key(entry: Dict[str, Any]) -> str:
    for value in (entry.get("variant"), entry.get("name"), entry.get("id")):
        key = _normalize_variant_text(value)
        if key:
            return key
    return ""


def _tee_totals(entry: Dict[str, Any]) -> Dict[str, Optional[int]]:
    totals: Dict[str, Optional[int]] = {}
    for tee in entry.get("tees", []):
        tee_id = _canonical_tee_id(tee.get("id") or tee.get("label"))
        total = tee.get("totalYards")
        if total is None:
            total = tee.get("yards")
        if tee_id:
            existing = totals.get(tee_id)
            if existing is None or (isinstance(total, int) and isinstance(existing, int) and total > existing):
                totals[tee_id] = total
    return totals


def _hole_map(entry: Dict[str, Any]) -> Dict[int, Dict[str, Any]]:
    result: Dict[int, Dict[str, Any]] = {}
    for hole in entry.get("holes", []):
        no = hole.get("no")
        if isinstance(no, int):
            result[no] = hole
    return result


def _has_meaningful_hdcp(entry: Dict[str, Any]) -> bool:
    for hole in entry.get("holes", []):
        hdcp = hole.get("hdcp")
        if isinstance(hdcp, int) and hdcp > 0:
            return True
    return False


def _yards_map(hole: Dict[str, Any]) -> Dict[str, Any]:
    yards = hole.get("yards")
    if isinstance(yards, dict):
        result: Dict[str, Any] = {}
        for key, value in yards.items():
            tee_id = _canonical_tee_id(key)
            if not tee_id:
                continue
            existing = result.get(tee_id)
            if existing is None or (isinstance(value, int) and isinstance(existing, int) and value > existing):
                result[tee_id] = value
        return result
    if yards is None:
        return {}
    return {"default": yards}


def _resolve_tee_value(values: Dict[str, Any], tee_id: str) -> Any:
    for candidate in _candidate_tee_keys(tee_id):
        if candidate in values:
            return values.get(candidate)
    return None


def _pair_entries(
    current_entries: List[Dict[str, Any]],
    reference_entries: List[Dict[str, Any]],
) -> Tuple[List[Tuple[Dict[str, Any], Dict[str, Any]]], List[str]]:
    current_by_key = {_entry_key(e): e for e in current_entries}
    reference_by_key = {_entry_key(e): e for e in reference_entries}
    messages: List[str] = []

    if len(current_entries) == 1 and len(reference_entries) == 1:
        return [(current_entries[0], reference_entries[0])], messages

    pairs: List[Tuple[Dict[str, Any], Dict[str, Any]]] = []
    all_keys = sorted(set(current_by_key) | set(reference_by_key))
    for key in all_keys:
        cur = current_by_key.get(key)
        ref = reference_by_key.get(key)
        if cur and ref:
            pairs.append((cur, ref))
        elif cur and not ref:
            messages.append(f"current only variant: {cur.get('variant') or cur.get('name')}")
        elif ref and not cur:
            messages.append(f"reference only variant: {ref.get('variant') or ref.get('name')}")
    return pairs, messages


def _compare_entry(current: Dict[str, Any], reference: Dict[str, Any]) -> List[Dict[str, Any]]:
    diffs: List[Dict[str, Any]] = []
    label = current.get("variant") or current.get("name") or current.get("id")
    compare_hdcp = _has_meaningful_hdcp(current) and _has_meaningful_hdcp(reference)

    if current.get("totalPar") != reference.get("totalPar"):
        diffs.append({
            "type": "value_mismatch",
            "variant": label,
            "field": "totalPar",
            "current": current.get("totalPar"),
            "reference": reference.get("totalPar"),
        })

    current_tees = _tee_totals(current)
    reference_tees = _tee_totals(reference)
    tee_ids = sorted(set(current_tees) | set(reference_tees))
    for tee_id in tee_ids:
        current_total = _resolve_tee_value(current_tees, tee_id)
        reference_total = _resolve_tee_value(reference_tees, tee_id)
        if current_total != reference_total:
            diffs.append({
                "type": "tee_total_mismatch",
                "variant": label,
                "field": "totalYards",
                "tee": tee_id or "?",
                "current": current_total,
                "reference": reference_total,
            })

    current_holes = _hole_map(current)
    reference_holes = _hole_map(reference)
    hole_numbers = sorted(set(current_holes) | set(reference_holes))
    for no in hole_numbers:
        cur_hole = current_holes.get(no)
        ref_hole = reference_holes.get(no)
        if cur_hole is None or ref_hole is None:
            diffs.append({
                "type": "missing_hole",
                "variant": label,
                "hole": no,
                "field": "hole",
                "current": None if cur_hole is None else "present",
                "reference": None if ref_hole is None else "present",
            })
            continue

        if cur_hole.get("par") != ref_hole.get("par"):
            diffs.append({
                "type": "value_mismatch",
                "variant": label,
                "hole": no,
                "field": "par",
                "current": cur_hole.get("par"),
                "reference": ref_hole.get("par"),
            })
        if compare_hdcp and cur_hole.get("hdcp") != ref_hole.get("hdcp"):
            diffs.append({
                "type": "value_mismatch",
                "variant": label,
                "hole": no,
                "field": "hdcp",
                "current": cur_hole.get("hdcp"),
                "reference": ref_hole.get("hdcp"),
            })

        cur_yards = _yards_map(cur_hole)
        ref_yards = _yards_map(ref_hole)
        yard_keys = sorted(set(cur_yards) | set(ref_yards))
        for yard_key in yard_keys:
            current_yards = _resolve_tee_value(cur_yards, yard_key)
            reference_yards = _resolve_tee_value(ref_yards, yard_key)
            if current_yards != reference_yards:
                diffs.append({
                    "type": "yardage_mismatch",
                    "variant": label,
                    "hole": no,
                    "field": "yards",
                    "tee": yard_key,
                    "current": current_yards,
                    "reference": reference_yards,
                })

    return diffs


def _format_diff(diff: Dict[str, Any]) -> str:
    label = diff.get("variant") or "(unknown)"
    hole = diff.get("hole")
    field = diff.get("field")
    tee = diff.get("tee")
    current = diff.get("current")
    reference = diff.get("reference")

    if diff.get("type") == "tee_total_mismatch":
        return f"{label}: tee total {tee or '?'} current={current} reference={reference}"
    if diff.get("type") == "missing_hole":
        return f"{label}: hole #{hole} missing current={current is None} reference={reference is None}"
    if diff.get("type") == "yardage_mismatch":
        return f"{label}: hole #{hole} yards[{tee}] current={current} reference={reference}"
    if hole is not None:
        return f"{label}: hole #{hole} {field} current={current} reference={reference}"
    return f"{label}: {field} current={current} reference={reference}"


def _summarize_pair_messages(messages: List[str]) -> List[Dict[str, Any]]:
    warnings: List[Dict[str, Any]] = []
    for message in messages:
        if message.startswith("current only variant: "):
            warnings.append({
                "type": "current_only_variant",
                "variant": message.split(": ", 1)[1],
            })
        elif message.startswith("reference only variant: "):
            warnings.append({
                "type": "reference_only_variant",
                "variant": message.split(": ", 1)[1],
            })
        else:
            warnings.append({
                "type": "pairing_warning",
                "message": message,
            })
    return warnings


def _is_official_source(source: str) -> bool:
    return source in {"pgm_official", "accordia", "akabane_official", "official", "official_pdf"}


def _detect_current_source(course_id: str, *, from_output: bool) -> str:
    if from_output:
        return "generated_js"
    cfg = sc.COURSES.get(course_id, {})
    return cfg.get("scraper", "unknown")


def _assign_rank(
    *,
    current_source: str,
    reference_source: str,
    diff_count: int,
    pairing_warning_count: int,
) -> str:
    if diff_count > 0 or pairing_warning_count > 0:
        return "R"
    if _is_official_source(current_source) or _is_official_source(reference_source):
        return "A"
    if reference_source in {"rakuten_gora", "shotnavi", "gdo", "json_reference", "html_reference"}:
        return "B"
    return "C"


def _build_report(
    *,
    course_id: str,
    current_source: str,
    reference_source: str,
    current_entries: List[Dict[str, Any]],
    reference_entries: List[Dict[str, Any]],
    pair_messages: List[str],
    diffs: List[Dict[str, Any]],
) -> Dict[str, Any]:
    warnings = _summarize_pair_messages(pair_messages)
    rank = _assign_rank(
        current_source=current_source,
        reference_source=reference_source,
        diff_count=len(diffs),
        pairing_warning_count=len(warnings),
    )
    matched_variants = len(_pair_entries(current_entries, reference_entries)[0])
    return {
        "courseId": course_id,
        "currentSource": current_source,
        "referenceSource": reference_source,
        "rank": rank,
        "summary": {
            "currentEntries": len(current_entries),
            "referenceEntries": len(reference_entries),
            "matchedVariants": matched_variants,
            "pairingWarnings": len(warnings),
            "diffCount": len(diffs),
        },
        "pairingWarnings": warnings,
        "diffs": diffs,
    }


def _dump_json(path: Path, entries: List[Dict[str, Any]]) -> None:
    payload = {"entries": entries}
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _load_reference_from_url(url: str, *, force: bool = False) -> List[Dict[str, Any]]:
    try:
        text = sc.fetch(url, force=force)
    except Exception as e:
        raise ValueError(
            f"URL取得に失敗しました: {url} ({e})\n"
            "この環境ではネットワーク制限があるため、必要なら curl でHTMLを保存して --reference-file に渡してください。"
        ) from e
    if "rakuten.co.jp" in url and "__NUXT_DATA__" in text:
        return _parse_gora_html(text)

    with tempfile.NamedTemporaryFile("w+", suffix=".html", encoding="utf-8", delete=False) as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)
    try:
        return _load_reference_entries(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)


def main() -> int:
    parser = argparse.ArgumentParser(description="Audit a scraped course against a reference file")
    parser.add_argument("course_id", help="course id in scripts/scrape_courses.py")
    parser.add_argument("--reference-file", help="reference .json / .js / .html file")
    parser.add_argument("--reference-url", help="reference page URL (currently Rakuten GORA HTML is supported)")
    parser.add_argument("--from-output", action="store_true", help="use src/data/courses/auto/<course-id>.js as current data")
    parser.add_argument("--force", action="store_true", help="bypass HTML cache when scraping current data")
    parser.add_argument("--dump-current", help="write current normalized entries to a JSON file")
    parser.add_argument("--emit-rank", action="store_true", help="print verification rank (A/B/C/R)")
    parser.add_argument("--json-report", help="write structured audit report JSON")
    args = parser.parse_args()

    if not args.reference_file and not args.reference_url:
        parser.error("one of --reference-file or --reference-url is required")

    if args.reference_url:
        reference_entries = _load_reference_from_url(args.reference_url, force=args.force)
        reference_source = _detect_reference_source(url=args.reference_url)
    else:
        reference_path = Path(args.reference_file)
        reference_entries = _load_reference_entries(reference_path)
        reference_source = _detect_reference_source(path=reference_path)

    current_entries = _load_generated_entries(args.course_id) if args.from_output else _scrape_entries(args.course_id, force=args.force)
    current_source = _detect_current_source(args.course_id, from_output=args.from_output)
    if not current_entries:
        print("current entries: 0")
        return 1

    if args.dump_current:
        _dump_json(Path(args.dump_current), current_entries)
        print(f"dumped current entries: {args.dump_current}")

    print(f"current entries: {len(current_entries)}")
    print(f"reference entries: {len(reference_entries)}")

    pairs, pair_messages = _pair_entries(current_entries, reference_entries)
    for message in pair_messages:
        print(f"WARN {message}")

    all_diffs: List[Dict[str, Any]] = []
    for current, reference in pairs:
        diffs = _compare_entry(current, reference)
        if not diffs:
            label = current.get("variant") or current.get("name") or current.get("id")
            print(f"OK {label}")
            continue
        for diff in diffs:
            print(f"DIFF {_format_diff(diff)}")
        all_diffs.extend(diffs)

    report = _build_report(
        course_id=args.course_id,
        current_source=current_source,
        reference_source=reference_source,
        current_entries=current_entries,
        reference_entries=reference_entries,
        pair_messages=pair_messages,
        diffs=all_diffs,
    )

    if args.emit_rank:
        print(f"RANK {report['rank']}")

    if args.json_report:
        Path(args.json_report).write_text(
            json.dumps(report, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"wrote report: {args.json_report}")

    if not all_diffs and not pair_messages:
        print("PASS no differences found")
        return 0

    print(f"FAIL differences={len(all_diffs)} pairing_warnings={len(pair_messages)} rank={report['rank']}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
