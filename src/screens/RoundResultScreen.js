import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Modal, Alert, Dimensions, KeyboardAvoidingView, Platform, Keyboard } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { getChallenge } from '../data/challenges';
import { saveRound } from '../data/rounds';

const theme = THEMES.light;

// ─────── Score symbol helpers ───────
function symbolFor(h) {
  if (h?.strokes == null) return '—';
  const d = h.strokes - h.par;
  if (d <= -2) return '◎';
  if (d === -1) return '○';
  if (d === 0)  return '−';
  if (d === 1)  return '△';
  if (d === 2)  return '□';
  return `+${d}`;
}
function symbolColor(h) {
  if (h?.strokes == null) return theme.textTer;
  const d = h.strokes - h.par;
  if (d < 0) return theme.good;
  if (d >= 2) return theme.warn;
  return theme.text;
}

// ─────── Main screen ───────
export default function RoundResultScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const {
    course, holes = [], startedAt = Date.now(),
    isPractice = false, practiceChallenges = [],
    target, teeColor, isHalf = false, startSide = 'OUT',
  } = params;

  const [memoText, setMemoText] = useState('');
  const [showScorecard, setShowScorecard] = useState(false);
  const scrollRef = useRef(null);

  // Derived totals
  const played = holes.filter(h => h.strokes != null);
  const coursePar = course?.par || holes.reduce((a, h) => a + (h.par || 0), 0);
  const total = played.reduce((a, h) => a + h.strokes, 0);
  const playedPar = played.reduce((a, h) => a + h.par, 0);
  const diff = played.length ? total - playedPar : 0;

  // 9+9 split (or 9 if half)
  const front = isHalf ? (startSide === 'IN' ? [] : holes) : holes.slice(0, 9);
  const back  = isHalf ? (startSide === 'IN' ? holes : []) : holes.slice(9, 18);
  const halfTotal = (hs) => hs.filter(h => h.strokes != null).reduce((a, h) => a + h.strokes, 0);
  const halfPar   = (hs) => hs.filter(h => h.strokes != null).reduce((a, h) => a + h.par, 0);
  const frontTot = halfTotal(front), frontPar = halfPar(front);
  const backTot  = halfTotal(back),  backPar  = halfPar(back);

  // Count types
  const counts = played.reduce((acc, h) => {
    const d = h.strokes - h.par;
    if (d <= -2) acc.eagle++;
    else if (d === -1) acc.birdie++;
    else if (d === 0) acc.par++;
    else if (d === 1) acc.bogey++;
    else if (d === 2) acc.double++;
    else acc.more++;
    return acc;
  }, { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, more: 0 });

  const totalPutts = played.reduce((a, h) => a + (h.putts || 0), 0);
  const threePuttCount = played.filter(h => (h.putts || 0) >= 3).length;
  const obCount = played.filter(h => h.ob).length;
  const hazardCount = played.filter(h => h.hazard).length;

  const dateStr = new Date(startedAt).toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'numeric', day: 'numeric',
  });

  const finish = async () => {
    const endedAt = Date.now();
    const round = {
      course: course ? { id: course.id, name: course.name, par: course.par, rating: course.rating, slope: course.slope } : null,
      holes,
      total, diff,
      target, teeColor, isHalf, startSide,
      isPractice, practiceChallenges,
      startedAt, endedAt,
      memo: memoText,
    };
    try { await saveRound(round); } catch {}
    navigation.navigate('RoundComplete', {
      course, holes, target, startedAt, endedAt, isPractice, isHalf,
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.bg }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[styles.content, { paddingBottom: 80 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTag}>
            {isPractice ? 'PRACTICE ROUND · RESULT' : 'ROUND · RESULT'}
          </Text>
          <Text style={styles.headerCourse} numberOfLines={1}>{course?.name || 'コース'}</Text>
          <Text style={styles.headerMeta}>
            {dateStr}
            {teeColor && ` · ${teeColor.toUpperCase()} tee`}
            {target && ` · 目標 ${target}`}
          </Text>
        </View>

        {/* Total hero */}
        <View style={styles.totalRow}>
          <View>
            <Text style={styles.totalNum}>{total || '—'}</Text>
            {played.length > 0 && (
              <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 4 }}>
                <Text style={[styles.totalDiff, { color: diff > 0 ? theme.warn : diff < 0 ? theme.good : theme.textSec }]}>
                  {diff >= 0 ? '+' : ''}{diff}
                </Text>
                <Text style={styles.totalPar}>  / Par {playedPar || coursePar}</Text>
              </View>
            )}
          </View>
          <View style={{ flex: 1 }} />
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.totalComplete}>{played.length}/{holes.length} 完了</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
              <Text style={styles.totalSide}>OUT {frontTot || '—'}</Text>
              <Text style={styles.totalSide}>IN {backTot || '—'}</Text>
            </View>
          </View>
        </View>

        {/* Counts chips */}
        <View style={styles.chipRow}>
          {[
            ['Eagle',    counts.eagle,  theme.good],
            ['Birdie',   counts.birdie, theme.good],
            ['Par',      counts.par,    theme.text],
            ['Bogey',    counts.bogey,  theme.text],
            ['Double+',  counts.double + counts.more, theme.warn],
          ].map(([k, v, c]) => (
            <View key={k} style={styles.chip}>
              <Text style={[styles.chipLabel, { color: v > 0 ? c : theme.textTer, fontWeight: v > 0 ? '500' : '400' }]}>
                {k} <Text style={[styles.chipNum, { color: v > 0 ? c : theme.textTer }]}>{v}</Text>
              </Text>
            </View>
          ))}
        </View>

        {/* 9+9 matrix */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.label}>スコア</Text>
          <Text style={styles.legend}>◎ Eagle   ○ Birdie   − Par   △ Bogey   □ Double</Text>
          {front.length > 0 && <HalfCard hs={front} title="OUT" tot={frontTot} par={frontPar} anyPlayed={played.length > 0} />}
          {back.length > 0 && <HalfCard hs={back} title="IN" tot={backTot} par={backPar} anyPlayed={played.length > 0} />}
        </View>

        {/* Practice summary */}
        {isPractice && practiceChallenges.length > 0 && (
          <View style={styles.practiceCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <Text style={styles.label}>課題別 サマリー</Text>
              <Text style={styles.practiceTag}>PRACTICE</Text>
            </View>
            <View style={{ gap: 12 }}>
              {practiceChallenges.map(ck => {
                const lib = getChallenge(ck);
                const marks = holes.map(h => h.challengeResults?.[ck]).filter(Boolean);
                const c = { '○': 0, '△': 0, '×': 0 };
                marks.forEach(m => { if (c[m] != null) c[m]++; });
                const tot = marks.length;
                const okRate = tot ? Math.round((c['○'] / tot) * 100) : 0;
                return (
                  <View key={ck}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Text style={styles.prCh}>{lib?.label || ck}</Text>
                      <Text style={styles.prMeta}>{tot ? `${tot}ホール記録 · ${okRate}% OK` : '未記録'}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 10, marginTop: 6 }}>
                      <Text style={[styles.prMark, { color: theme.good }]}>○ {c['○']}</Text>
                      <Text style={[styles.prMark, { color: theme.text }]}>△ {c['△']}</Text>
                      <Text style={[styles.prMark, { color: theme.warn }]}>× {c['×']}</Text>
                    </View>
                    {tot > 0 && (
                      <View style={styles.prBar}>
                        <View style={{ width: `${(c['○'] / tot) * 100}%`, backgroundColor: theme.good }} />
                        <View style={{ width: `${(c['△'] / tot) * 100}%`, backgroundColor: theme.borderStrong }} />
                        <View style={{ width: `${(c['×'] / tot) * 100}%`, backgroundColor: theme.warn }} />
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
            <Text style={styles.prNote}>※ 練習ラウンドのため、スコアは平均には反映されません</Text>
          </View>
        )}

        {/* Stats strip */}
        <View style={styles.strip}>
          <StatSpan k="パット計" v={totalPutts} />
          <StatSpan k="3パット" v={threePuttCount} warn={threePuttCount > 0} />
          <StatSpan k="OB" v={obCount} warn={obCount > 0} />
          <StatSpan k="ハザード" v={hazardCount} warn={hazardCount > 0} />
        </View>

        {/* Memo */}
        <View style={{ marginTop: 22 }}>
          <Text style={styles.label}>ラウンドメモ</Text>
          <TextInput
            value={memoText}
            onChangeText={setMemoText}
            placeholder="今日のラウンドで気づいたこと、感触、次に活かしたいことなど"
            placeholderTextColor={theme.textTer}
            multiline
            numberOfLines={5}
            style={styles.memo}
            returnKeyType="default"
            onFocus={() => {
              setTimeout(() => {
                scrollRef.current?.scrollToEnd({ animated: true });
              }, 300);
            }}
          />
          <Text style={styles.memoHint}>下にスクロールするとキーボードが閉じます</Text>
        </View>

        {/* Actions */}
        <View style={{ marginTop: 22, gap: 8 }}>
          <Pressable onPress={() => setShowScorecard(true)} style={styles.scBtn}>
            <Svg width={15} height={15} viewBox="0 0 16 16" fill="none">
              <Path d="M2 3 h12 v10 h-12 z" stroke={theme.text} strokeWidth={1.4} fill="none"/>
              <Path d="M6 7 a1.2 1.2 0 1 0 2.4 0 a1.2 1.2 0 1 0 -2.4 0" fill={theme.text}/>
              <Path d="M2 11l3-3 3 3 2-2 4 4" stroke={theme.text} strokeWidth={1.4} strokeLinejoin="round" fill="none"/>
            </Svg>
            <Text style={styles.scBtnText}>スコアカードを作成 · シェア</Text>
          </Pressable>
          <Pressable onPress={finish} style={styles.finishBtn}>
            <Text style={styles.finishText}>完了して保存</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Scorecard modal */}
      <Modal visible={showScorecard} transparent animationType="fade" onRequestClose={() => setShowScorecard(false)}>
        <ScorecardModal
          course={course} holes={holes} total={total} diff={diff}
          dateStr={dateStr} onClose={() => setShowScorecard(false)}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

// ─────── HalfCard ───────
function HalfCard({ hs, title, tot, par, anyPlayed }) {
  const d = tot - par;
  const diffText = !anyPlayed || !hs.some(h => h.strokes != null) ? '—' : d === 0 ? 'E' : `${d >= 0 ? '+' : ''}${d}`;
  const diffColor = d > 0 ? theme.warn : d < 0 ? theme.good : theme.textSec;
  return (
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
        <Text style={styles.halfTitle}>{title}</Text>
        <View style={{ flex: 1, height: 1, backgroundColor: theme.border }} />
        <Text style={styles.halfTot}>{tot || '—'}</Text>
        <Text style={[styles.halfDiff, { color: diffColor }]}>{diffText}</Text>
      </View>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        {hs.map((h) => (
          <View key={h.no} style={styles.cell}>
            <Text style={styles.cellNo}>{h.no}</Text>
            <Text style={[styles.cellSym, { color: symbolColor(h) }]}>{symbolFor(h)}</Text>
            <Text style={[styles.cellStrokes, { color: h.strokes == null ? theme.textTer : theme.text }]}>
              {h.strokes ?? '—'}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─────── StatSpan ───────
function StatSpan({ k, v, warn }) {
  return (
    <Text style={styles.stripText}>
      {k} <Text style={{ color: warn ? theme.warn : theme.text, fontWeight: '500' }}>{v}</Text>
    </Text>
  );
}

// ─────── ScorecardModal ───────
function ScorecardModal({ course, holes, total, diff, dateStr, onClose }) {
  const [template, setTemplate] = useState('strip');

  const templates = [
    { k: 'stamp',    label: 'ミニマル' },
    { k: 'strip',    label: '詳細・下段' },
    { k: 'cinema',   label: 'シネマ' },
    { k: 'polaroid', label: 'ポラロイド' },
  ];

  const onSave = () => {
    Alert.alert('次回実装', '画像生成 + 共有機能は次回追加します（expo-image-picker + react-native-view-shot + expo-sharing が必要）');
  };

  return (
    <Pressable onPress={onClose} style={styles.modalBg}>
      <Pressable onPress={(e) => e.stopPropagation()} style={styles.modalCard}>
        {/* Header */}
        <View style={styles.modalHead}>
          <View>
            <Text style={styles.modalTag}>SHARE</Text>
            <Text style={styles.modalTitle}>スコアカード</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M6 6L18 18M18 6L6 18" stroke={theme.textSec} strokeWidth={1.8} strokeLinecap="round"/>
            </Svg>
          </Pressable>
        </View>

        {/* Template picker */}
        <View style={{ flexDirection: 'row', gap: 4, marginBottom: 12 }}>
          {templates.map(t => {
            const on = template === t.k;
            return (
              <Pressable key={t.k} onPress={() => setTemplate(t.k)} style={[
                styles.tplBtn, on && styles.tplBtnOn,
              ]}>
                <Text style={[styles.tplText, on && { color: theme.bg, fontWeight: '600' }]}>{t.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          {template === 'stamp' && <StampCard total={total} diff={diff} course={course} dateStr={dateStr} />}
          {template === 'strip' && <StripCard total={total} diff={diff} course={course} dateStr={dateStr} holes={holes} />}
          {template === 'cinema' && <CinemaCard total={total} diff={diff} course={course} dateStr={dateStr} holes={holes} />}
          {template === 'polaroid' && <PolaroidCard total={total} diff={diff} course={course} dateStr={dateStr} />}
        </View>

        <Pressable onPress={onSave} style={styles.saveBtn}>
          <Text style={styles.saveText}>画像を保存 / シェア</Text>
        </Pressable>
        <Text style={styles.saveHint}>写真取り込み・画像生成は次回実装（まずはプレビュー確認用）</Text>
      </Pressable>
    </Pressable>
  );
}

// ─────── Card templates (preview-only, gradient backgrounds) ───────
const CARD_GRADIENT = '#1A2B22'; // fallback dark green

function ScoreStrip({ hs }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
        {hs.map(h => <Text key={h.no} style={{ fontFamily: FONT.mono, fontSize: 7.5, color: 'rgba(255,255,255,0.5)', width: 14, textAlign: 'center' }}>{h.no}</Text>)}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {hs.map(h => <Text key={h.no} style={{ fontFamily: FONT.mono, fontSize: 13, fontWeight: '500', color: '#fff', width: 14, textAlign: 'center' }}>{symbolFor(h)}</Text>)}
      </View>
    </View>
  );
}

function StampCard({ total, diff, course, dateStr }) {
  const diffColor = diff > 0 ? '#FFB88A' : diff < 0 ? '#88E8B5' : '#FFFFFF';
  return (
    <View style={[styles.cardBase, { backgroundColor: CARD_GRADIENT }]}>
      <View style={styles.stampChip}>
        <Text style={styles.stampTotal}>{total}</Text>
        <Text style={[styles.stampDiff, { color: diffColor }]}>{diff >= 0 ? '+' : ''}{diff}</Text>
      </View>
      <View style={styles.stampMetaBL}>
        <Text style={styles.stampCourse}>{course?.name}</Text>
        <Text style={styles.stampDate}>{dateStr}</Text>
      </View>
      <View style={styles.stampBrand}><Text style={styles.stampBrandText}>MORUPI</Text></View>
    </View>
  );
}

function StripCard({ total, diff, course, dateStr, holes }) {
  const diffColor = diff > 0 ? '#FFB88A' : diff < 0 ? '#88E8B5' : '#FFFFFF';
  const front = holes.slice(0, 9);
  const back = holes.slice(9, 18);
  return (
    <View style={[styles.cardBase, { backgroundColor: CARD_GRADIENT }]}>
      <View style={styles.stripBand}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
          <View>
            <Text style={styles.stripTotal}>{total}</Text>
            <Text style={[styles.stripDiff, { color: diffColor }]}>{diff >= 0 ? '+' : ''}{diff}</Text>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <View style={{ marginBottom: 6 }}><ScoreStrip hs={front} /></View>
            <ScoreStrip hs={back} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
          <Text style={styles.stripCourse}>{course?.name}</Text>
          <Text style={styles.stripDate}>{dateStr}</Text>
        </View>
      </View>
    </View>
  );
}

function CinemaCard({ total, diff, course, dateStr, holes }) {
  const diffColor = diff > 0 ? '#FFB88A' : diff < 0 ? '#88E8B5' : '#FFFFFF';
  return (
    <View style={[styles.cardBase, { backgroundColor: '#000' }]}>
      <View style={styles.cinemaTop}>
        <Text style={styles.cinemaCourse}>{course?.name}</Text>
        <Text style={styles.cinemaDate}>{dateStr}</Text>
      </View>
      <View style={[styles.cinemaPhoto, { backgroundColor: CARD_GRADIENT }]} />
      <View style={styles.cinemaBottom}>
        <View>
          <Text style={styles.cinemaBrand}>MORUPI</Text>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 3 }}>
            <Text style={styles.cinemaTotal}>{total}</Text>
            <Text style={[styles.cinemaDiff, { color: diffColor }]}>{diff >= 0 ? '+' : ''}{diff}</Text>
          </View>
        </View>
        <View style={{ flex: 1, minWidth: 0, marginLeft: 16 }}>
          <View style={{ marginBottom: 4 }}><ScoreStrip hs={holes.slice(0, 9)} /></View>
          <ScoreStrip hs={holes.slice(9, 18)} />
        </View>
      </View>
    </View>
  );
}

function PolaroidCard({ total, diff, course, dateStr }) {
  const diffColor = diff > 0 ? '#C2410C' : diff < 0 ? '#2A8D5C' : '#111';
  return (
    <View style={[styles.cardBase, { backgroundColor: '#F6F4EF', padding: 18 }]}>
      <View style={[styles.polaroidPhoto, { backgroundColor: CARD_GRADIENT, flex: 2.6 }]} />
      <View style={{ marginTop: 12, flex: 1, justifyContent: 'space-between' }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10 }}>
          <Text style={styles.polaTotal}>{total}</Text>
          <Text style={[styles.polaDiff, { color: diffColor }]}>{diff >= 0 ? '+' : ''}{diff}</Text>
          <View style={{ flex: 1 }} />
          <Text style={styles.polaBrand}>MORUPI</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <Text style={styles.polaCourse}>{course?.name}</Text>
          <Text style={styles.polaDate}>{dateStr}</Text>
        </View>
      </View>
    </View>
  );
}

// ─────── Styles ───────
const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 40, paddingTop: 8 },
  label: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  // Header
  header: { paddingTop: 4 },
  headerTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  headerCourse: { fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 2, letterSpacing: -0.2 },
  headerMeta: { fontFamily: FONT.mono, fontSize: 10.5, color: theme.textSec, marginTop: 2, letterSpacing: 0.3 },
  // Total
  totalRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 14, marginTop: 18 },
  totalNum: { fontFamily: FONT.mono, fontSize: 56, fontWeight: '400', letterSpacing: -2.2, lineHeight: 64, color: theme.text, includeFontPadding: false },
  totalDiff: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500' },
  totalPar: { fontFamily: FONT.mono, fontSize: 11, color: theme.textTer },
  totalComplete: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.6 },
  totalSide: { fontFamily: FONT.mono, fontSize: 10, color: theme.textSec },
  // Chips
  chipRow: { flexDirection: 'row', gap: 6, marginTop: 14, flexWrap: 'wrap' },
  chip: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 4 },
  chipLabel: { fontSize: 11 },
  chipNum: { fontFamily: FONT.mono, marginLeft: 2 },
  // Legend
  legend: { fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 4, marginBottom: 10 },
  // Matrix
  halfTitle: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  halfTot: { fontFamily: FONT.mono, fontSize: 12, fontWeight: '500', color: theme.text },
  halfDiff: { fontFamily: FONT.mono, fontSize: 11 },
  cell: {
    flex: 1, paddingVertical: 6, paddingHorizontal: 0,
    alignItems: 'center', gap: 2,
    backgroundColor: theme.surface,
    borderWidth: 1, borderColor: theme.border, borderRadius: 4,
  },
  cellNo: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, lineHeight: 9 },
  cellSym: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500', lineHeight: 16 },
  cellStrokes: { fontFamily: FONT.mono, fontSize: 12, lineHeight: 12, marginTop: 1 },
  // Practice card
  practiceCard: { marginTop: 16, padding: 14, borderWidth: 2, borderColor: theme.text, borderRadius: 8, backgroundColor: theme.surface },
  practiceTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.4, fontWeight: '600' },
  prCh: { fontSize: 12.5, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  prMeta: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec },
  prMark: { fontFamily: FONT.mono, fontSize: 11 },
  prBar: { flexDirection: 'row', height: 4, marginTop: 6, borderRadius: 2, overflow: 'hidden', backgroundColor: theme.border },
  prNote: { fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 10, letterSpacing: 0.3 },
  // Strip
  strip: { marginTop: 14, paddingVertical: 10, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, flexDirection: 'row', justifyContent: 'space-between' },
  stripText: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec },
  // Memo
  memo: {
    marginTop: 8, paddingHorizontal: 14, paddingVertical: 12,
    backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8,
    fontSize: 13, color: theme.text, minHeight: 100, textAlignVertical: 'top',
  },
  memoHint: { fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 6 },
  memoDone: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, fontWeight: '600', letterSpacing: 0.3 },
  // Buttons
  scBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 13, borderRadius: 8, backgroundColor: theme.surfaceAlt,
    borderWidth: 1.5, borderColor: theme.text,
  },
  scBtnText: { fontSize: 13.5, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  finishBtn: { paddingVertical: 14, borderRadius: 8, backgroundColor: theme.text, alignItems: 'center' },
  finishText: { color: theme.bg, fontSize: 14, fontWeight: '600' },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', paddingHorizontal: 16 },
  modalCard: { backgroundColor: theme.bg, borderRadius: 10, padding: 14 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  modalTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  modalTitle: { fontSize: 14, fontWeight: '600', color: theme.text, marginTop: 2 },
  tplBtn: { flex: 1, paddingVertical: 9, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center' },
  tplBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  tplText: { fontSize: 11.5, color: theme.text, fontWeight: '500' },
  preview: { alignItems: 'center', marginBottom: 12 },
  saveBtn: { backgroundColor: theme.text, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
  saveText: { color: theme.bg, fontSize: 14, fontWeight: '600' },
  saveHint: { fontFamily: FONT.mono, fontSize: 9.5, color: theme.textTer, marginTop: 8, textAlign: 'center' },
  // Card base
  cardBase: { width: Math.min(360, Dimensions.get('window').width - 60), aspectRatio: 1, overflow: 'hidden', borderRadius: 4 },
  // Stamp
  stampChip: { position: 'absolute', top: 16, right: 16, padding: 10, paddingVertical: 8, backgroundColor: 'rgba(10,10,10,0.55)', borderRadius: 4, flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  stampTotal: { fontFamily: FONT.mono, fontSize: 24, fontWeight: '400', color: '#fff', letterSpacing: -0.5, lineHeight: 24 },
  stampDiff: { fontFamily: FONT.mono, fontSize: 13, fontWeight: '500' },
  stampMetaBL: { position: 'absolute', bottom: 16, left: 16, padding: 10, paddingVertical: 7, backgroundColor: 'rgba(10,10,10,0.5)', borderRadius: 4 },
  stampCourse: { fontSize: 11, fontWeight: '500', color: '#fff' },
  stampDate: { fontFamily: FONT.mono, fontSize: 9.5, color: 'rgba(255,255,255,0.75)', marginTop: 2, letterSpacing: 0.3 },
  stampBrand: { position: 'absolute', bottom: 16, right: 16, padding: 8, paddingVertical: 5, backgroundColor: 'rgba(10,10,10,0.4)', borderRadius: 3 },
  stampBrandText: { fontFamily: FONT.mono, fontSize: 8.5, color: '#fff', letterSpacing: 1.8, fontWeight: '500' },
  // Strip
  stripBand: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 18, backgroundColor: 'rgba(6,6,6,0.94)' },
  stripTotal: { fontFamily: FONT.mono, fontSize: 52, fontWeight: '300', color: '#fff', letterSpacing: -2, lineHeight: 54 },
  stripDiff: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500', marginTop: 4 },
  stripCourse: { fontSize: 11.5, fontWeight: '500', color: '#fff' },
  stripDate: { fontFamily: FONT.mono, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 0.3 },
  // Cinema
  cinemaTop: { height: 52, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cinemaCourse: { fontFamily: FONT.mono, fontSize: 10, color: '#fff', letterSpacing: 2.2, fontWeight: '500' },
  cinemaDate: { fontFamily: FONT.mono, fontSize: 10, color: 'rgba(255,255,255,0.7)', letterSpacing: 1.4 },
  cinemaPhoto: { flex: 1 },
  cinemaBottom: { height: 108, paddingHorizontal: 20, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-end' },
  cinemaBrand: { fontFamily: FONT.mono, fontSize: 10, color: 'rgba(255,255,255,0.55)', letterSpacing: 2, fontWeight: '500' },
  cinemaTotal: { fontFamily: FONT.mono, fontSize: 46, fontWeight: '300', color: '#fff', letterSpacing: -2, lineHeight: 46 },
  cinemaDiff: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500' },
  // Polaroid
  polaroidPhoto: { width: '100%' },
  polaTotal: { fontFamily: FONT.mono, fontSize: 40, fontWeight: '300', color: '#111', letterSpacing: -1.6, lineHeight: 44 },
  polaDiff: { fontFamily: FONT.mono, fontSize: 17, fontWeight: '500' },
  polaBrand: { fontFamily: FONT.mono, fontSize: 9, color: '#8a8a8a', letterSpacing: 1.6 },
  polaCourse: { fontSize: 11.5, fontWeight: '500', color: '#111', fontStyle: 'italic' },
  polaDate: { fontFamily: FONT.mono, fontSize: 10.5, color: '#6B6B6B', letterSpacing: 0.3 },
});
