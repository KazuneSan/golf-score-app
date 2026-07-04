import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

const HEADER = [
  '日付', 'コース', 'ティー', '練習モード',
  'ホール', 'Par', 'HDCP', 'スコア', '対Par',
  'パット', 'OB', 'ハザード', '3パット', 'FWキープ', '寄せワン', 'バンカー',
];

function esc(v) {
  const s = String(v ?? '');
  return /[,"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function roundDate(r) {
  return new Date(r.endedAt).toLocaleDateString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit',
  });
}

function toCsv(rounds) {
  const rows = [HEADER.join(',')];
  for (const r of rounds) {
    const date = roundDate(r);
    const course = r.course?.name ?? '';
    const tee = r.teeColor ?? '';
    const practice = r.isPractice ? '1' : '0';
    for (const h of (r.holes ?? [])) {
      rows.push([
        date, course, tee, practice,
        h.no, h.par, h.hdcp ?? '',
        h.strokes, h.strokes - h.par,
        h.putts ?? '',
        h.ob ? '1' : '0',
        h.hazard ? '1' : '0',
        h.threePutt ? '1' : '0',
        h.fairway != null ? (h.fairway ? '1' : '0') : '',
        h.upDown != null ? (h.upDown ? '1' : '0') : '',
        h.bunker ? '1' : '0',
      ].map(esc).join(','));
    }
  }
  // BOM for Excel UTF-8 recognition
  return '﻿' + rows.join('\n');
}

export async function exportRoundsToCsv(rounds) {
  if (!rounds || rounds.length === 0) throw new Error('エクスポートするラウンドがありません');

  const csv = toCsv(rounds);
  const date = new Date().toISOString().slice(0, 10);
  const path = FileSystem.cacheDirectory + `morupi_scores_${date}.csv`;

  await FileSystem.writeAsStringAsync(path, csv, {
    encoding: 'utf8',
  });

  const available = await Sharing.isAvailableAsync();
  if (!available) throw new Error('この端末ではファイル共有が利用できません');

  await Sharing.shareAsync(path, {
    mimeType: 'text/csv',
    dialogTitle: 'スコアデータをエクスポート',
    UTI: 'public.comma-separated-values-text',
  });
}

// Filter helpers used by the modal
export function filterByDays(rounds, days) {
  const cutoff = Date.now() - days * 86400000;
  return rounds.filter(r => (r.endedAt ?? 0) >= cutoff);
}

export function formatRoundLabel(r) {
  const date = new Date(r.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
  const name = (r.course?.name ?? '不明').replace(/カントリー倶楽部|カントリークラブ|ゴルフ場|ゴルフクラブ|ゴルフ/, '');
  return { date, name, total: r.total, diff: r.diff };
}
