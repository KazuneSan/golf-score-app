import React, { useState, useMemo, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import Svg, { Path, Rect, Circle, Line } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { getChallenge } from '../data/challenges';
import { getEnabledRoundOptions, getEnabledMissTypes } from '../data/settings';
import { getClubs } from '../data/clubs';

const theme = THEMES.light;

const PERSONA = { avgScore: 96.4, best: 87 };

const STANDARD_PARS =  [4,5,3,4,4,3,4,5,4, 4,3,5,4,4,3,4,5,4];
const STANDARD_HDCPS = [5,1,15,9,13,17,3,7,11, 6,2,16,10,14,18,4,8,12];

function generateHoles() {
  const yByPar = { 3: 170, 4: 380, 5: 525 };
  return STANDARD_PARS.map((par, i) => ({
    no: i + 1, par,
    yards: yByPar[par] + Math.round(Math.sin((i + 1) * 1.7) * 30),
    hdcp: STANDARD_HDCPS[i],
  }));
}

// ─── Icons ──────────────────────────────────────────────────────────────────

const OPT_LABELS = {
  ob: 'OB', hazard: 'ハザード', threePutt: '3パット',
  fairway: 'FWキープ', upDown: '寄せワン', bunker: 'バンカー',
};

const OptIcon = ({ k, color }) => {
  switch (k) {
    case 'ob':
      return <Svg width={14} height={14} viewBox="0 0 14 14"><Rect x={1.2} y={1.2} width={11.6} height={11.6} rx={1.4} stroke={color} strokeWidth={1.3} fill="none"/><Path d="M4 4l6 6M10 4l-6 6" stroke={color} strokeWidth={1.3} strokeLinecap="round"/></Svg>;
    case 'hazard':
      return <Svg width={14} height={14} viewBox="0 0 14 14"><Path d="M7 1L13 12H1z" stroke={color} strokeWidth={1.3} strokeLinejoin="round" fill="none"/><Path d="M7 5v3.2M7 10v.1" stroke={color} strokeWidth={1.3} strokeLinecap="round"/></Svg>;
    case 'threePutt':
      return <Svg width={14} height={14} viewBox="0 0 14 14"><Circle cx={4} cy={7} r={1.5} fill={color}/><Circle cx={7} cy={7} r={1.5} fill={color}/><Circle cx={10} cy={7} r={1.5} fill={color}/></Svg>;
    case 'fairway':
      return <Svg width={14} height={14} viewBox="0 0 14 14"><Path d="M2 12L7 2L12 12" stroke={color} strokeWidth={1.3} strokeLinejoin="round" fill="none"/><Line x1={2} y1={12} x2={12} y2={12} stroke={color} strokeWidth={1.3}/></Svg>;
    case 'upDown':
      return <Svg width={14} height={14} viewBox="0 0 14 14"><Path d="M2 10 Q 4 4 7 7 T 12 4" stroke={color} strokeWidth={1.3} fill="none" strokeLinecap="round"/></Svg>;
    case 'bunker':
      return <Svg width={14} height={14} viewBox="0 0 14 14"><Path d="M2 10 Q 5 6 7 9 Q 9 6 12 10" stroke={color} strokeWidth={1.3} fill="none" strokeLinecap="round"/><Line x1={1} y1={12} x2={13} y2={12} stroke={color} strokeWidth={1} strokeDasharray="1 1"/></Svg>;
    default: return null;
  }
};

// Lie slope icons (ground profile view)
const LieIcon = ({ type, color }) => {
  switch (type) {
    case 'flat': return <Svg width={22} height={14} viewBox="0 0 22 14"><Path d="M2 9L20 9" stroke={color} strokeWidth={2} strokeLinecap="round"/></Svg>;
    case 'lu':   return <Svg width={22} height={14} viewBox="0 0 22 14"><Path d="M2 12L20 4" stroke={color} strokeWidth={2} strokeLinecap="round"/></Svg>;
    case 'ld':   return <Svg width={22} height={14} viewBox="0 0 22 14"><Path d="M2 4L20 12" stroke={color} strokeWidth={2} strokeLinecap="round"/></Svg>;
    case 'tu':   return <Svg width={22} height={14} viewBox="0 0 22 14"><Path d="M2 9L20 9" stroke={color} strokeWidth={2} strokeLinecap="round"/><Path d="M11 3L11 9" stroke={color} strokeWidth={1.5} strokeLinecap="round"/><Path d="M8 5L11 3L14 5" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/></Svg>;
    case 'td':   return <Svg width={22} height={14} viewBox="0 0 22 14"><Path d="M2 9L20 9" stroke={color} strokeWidth={2} strokeLinecap="round"/><Path d="M11 9L11 13" stroke={color} strokeWidth={1.5} strokeLinecap="round"/><Path d="M8 11L11 13L14 11" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" fill="none"/></Svg>;
    default: return null;
  }
};

const LIE_OPTIONS = [
  { key: 'flat', label: 'フラット' },
  { key: 'lu',   label: '左足上り' },
  { key: 'ld',   label: '左足下り' },
  { key: 'tu',   label: '前上り' },
  { key: 'td',   label: '前下り' },
];

function scoreLabel(d) {
  if (d === null) return '—';
  if (d === -2) return 'Eagle';
  if (d === -1) return 'Birdie';
  if (d === 0) return 'Par';
  if (d === 1) return 'Bogey';
  if (d === 2) return 'Double';
  if (d > 0) return `+${d}`;
  return `${d}`;
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function RoundScreen() {
  const navigation = useNavigation();
  const route = useRoute();
  const params = route.params || {};
  const {
    course, teeColor, startSide = 'OUT', isHalf = false,
    isPractice = false, practiceChallenges = [], target,
    companions = [],
  } = params;

  const [enabledOpts, setEnabledOpts] = useState([]);
  const [enabledMissTypes, setEnabledMissTypes] = useState([]);
  const [clubs, setClubs] = useState([]);
  useEffect(() => {
    Promise.all([getEnabledRoundOptions(), getEnabledMissTypes(), getClubs()])
      .then(([opts, miss, cl]) => { setEnabledOpts(opts); setEnabledMissTypes(miss); setClubs(cl); });
  }, []);

  const coursePar = course?.par || 72;
  const userHc = Math.max(0, Math.min(36, Math.round((PERSONA.avgScore - coursePar) * 0.93)));

  const allHoles = useMemo(() => generateHoles(), []);
  const initialHoles = useMemo(() => {
    const src = isHalf ? (startSide === 'IN' ? allHoles.slice(9, 18) : allHoles.slice(0, 9)) : allHoles;
    return src.map(h => ({
      ...h, strokes: null, putts: null,
      ob: false, hazard: false, threePutt: false,
      fairway: null, upDown: null, bunker: false,
      challengeResults: {},
      club: null, remainingDistance: null, lie: null, missTypes: [],
      companionStrokes: companions.map(() => null),
    }));
  }, [allHoles, isHalf, startSide, companions]);

  const [holes, setHoles] = useState(initialHoles);
  const [holeIdx, setHoleIdx] = useState(0);
  const [strokesExtra, setStrokesExtra] = useState(false);
  const [puttsExtra, setPuttsExtra] = useState(false);

  const hole = holes[holeIdx];
  const total = holes.length;
  const done = holes.filter(h => h.strokes != null).length;

  const update = (patch) => setHoles(hs => hs.map((h, i) => i === holeIdx ? { ...h, ...patch } : h));
  const setStroke = (n) => update({ strokes: n });
  const setPutt = (n) => update({ putts: n });
  const toggleField = (k) => update({ [k]: !hole[k] });
  const toggleLie = (key) => update({ lie: hole.lie === key ? null : key });
  const toggleMissType = (key) => {
    const cur = hole.missTypes || [];
    update({ missTypes: cur.includes(key) ? cur.filter(k => k !== key) : [...cur, key] });
  };
  const updateCompanionStroke = (ci, val) => {
    const next = [...(hole.companionStrokes || companions.map(() => null))];
    next[ci] = val;
    update({ companionStrokes: next });
  };
  const setChallengeResult = (ck, v) => {
    const current = hole.challengeResults?.[ck];
    update({ challengeResults: { ...(hole.challengeResults || {}), [ck]: current === v ? null : v } });
  };

  const jumpTo = (i) => { setHoleIdx(i); setStrokesExtra(false); setPuttsExtra(false); };
  const next = () => { setHoleIdx(i => Math.min(total - 1, i + 1)); setStrokesExtra(false); setPuttsExtra(false); };
  const prev = () => { setHoleIdx(i => Math.max(0, i - 1)); setStrokesExtra(false); setPuttsExtra(false); };

  const scoreToPar = hole.strokes != null ? hole.strokes - hole.par : null;
  const strokesReceived = Math.floor(userHc / 18) + ((hole.hdcp || 18) <= (userHc % 18) ? 1 : 0);
  const holeTarget = hole.par + strokesReceived;
  const targetLabel = strokesReceived === 0 ? 'パー狙い'
    : strokesReceived === 1 ? 'ボギー狙い'
    : strokesReceived === 2 ? 'ダボ狙い' : 'トリプル以内';

  const playedAll = holes.filter(h => h.strokes != null);
  const runTotal = playedAll.reduce((a, h) => a + h.strokes, 0);
  const runPar = playedAll.reduce((a, h) => a + h.par, 0);
  const runDiff = playedAll.length ? runTotal - runPar : 0;
  const anyPlayed = playedAll.length > 0;
  const threePutt = hole.putts != null && hole.putts >= 3;

  const debugFillAll = () => {
    setHoles(hs => hs.map(h => {
      const r = Math.random();
      const delta = r < 0.10 ? -1 : r < 0.50 ? 0 : r < 0.85 ? 1 : r < 0.97 ? 2 : 3;
      const strokes = Math.max(1, h.par + delta);
      const putts = delta <= 0 ? (Math.random() < 0.25 ? 1 : 2) : delta === 1 ? 2 : (Math.random() < 0.3 ? 3 : 2);
      return { ...h, strokes, putts, ob: Math.random() < 0.06, hazard: Math.random() < 0.08 };
    }));
  };
  const debugClearAll = () => {
    setHoles(hs => hs.map(h => ({ ...h, strokes: null, putts: null, ob: false, hazard: false })));
    setStrokesExtra(false); setPuttsExtra(false);
  };

  const onClose = () => navigation.popToTop();
  const onFinish = () => {
    const unfilled = total - done;
    const go = () => navigation.navigate('RoundResult', {
      course, holes, startedAt: Date.now(),
      isPractice, practiceChallenges,
      target: params.target, teeColor, isHalf, startSide, companions,
    });
    if (unfilled > 0) {
      Alert.alert('未入力あり', `${unfilled}ホール未入力ですが、結果画面に進みますか？`, [
        { text: 'キャンセル', style: 'cancel' },
        { text: '進む', onPress: go },
      ]);
    } else { go(); }
  };

  const pickerRows = isHalf ? [[0, total]] : [[0, 9], [9, 18]];

  // Selected club's distance range hint
  const selectedClub = clubs.find(c => c.name === hole.club);
  const distHint = selectedClub && (selectedClub.minDist || selectedClub.maxDist)
    ? `${selectedClub.minDist}–${selectedClub.maxDist}Y`
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: theme.bg }}>
        <View style={styles.topBar}>
          <Pressable onPress={onClose} hitSlop={10} style={{ padding: 4 }}>
            <Svg width={18} height={18} viewBox="0 0 24 24">
              <Path d="M6 6L18 18M18 6L6 18" stroke={theme.textSec} strokeWidth={1.8} strokeLinecap="round"/>
            </Svg>
          </Pressable>
          <View style={styles.topCenter}>
            <Text style={styles.topCourse} numberOfLines={1}>{course?.name || 'コース'}</Text>
            {(teeColor || Number.isFinite(target)) && (
              <Text style={styles.topMeta} numberOfLines={1}>
                {teeColor && `${teeColor.toUpperCase()} tee`}
                {teeColor && Number.isFinite(target) && ' · '}
                {Number.isFinite(target) && `目標 ${target}`}
              </Text>
            )}
          </View>
          <Text style={styles.topCount}>{done}/{total}</Text>
        </View>
      </SafeAreaView>

      {/* DEV */}
      <View style={styles.devBar}>
        <Text style={styles.devLabel}>DEV</Text>
        <View style={{ flex: 1 }} />
        <Pressable onPress={debugFillAll} style={styles.devFillBtn}><Text style={styles.devFillText}>全ホール一括入力</Text></Pressable>
        <Pressable onPress={debugClearAll} style={styles.devClearBtn}><Text style={styles.devClearText}>クリア</Text></Pressable>
      </View>

      {/* Running total */}
      <View style={styles.runRow}>
        <Text style={[styles.runNum, { color: anyPlayed ? theme.text : theme.textTer }]}>
          {anyPlayed ? runTotal : '—'}
        </Text>
        {anyPlayed && (
          <Text style={[styles.runDiff, { color: runDiff > 0 ? theme.warn : runDiff < 0 ? theme.good : theme.textSec }]}>
            {runDiff >= 0 ? '+' : ''}{runDiff}
          </Text>
        )}
        <View style={{ flex: 1 }} />
        <Text style={styles.runCount}>{playedAll.length}/{total}</Text>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <View style={{ flex: 1 }}>
          <Text style={styles.label}>{`HOLE ${hole.no} / ${total}`}</Text>
          <Text style={styles.heroNum}>{hole.no}</Text>
          {hole.strokes != null && (
            <View style={styles.heroResult}>
              <Text style={[styles.heroResultLabel, { color: scoreToPar > 0 ? theme.warn : scoreToPar < 0 ? theme.good : theme.text }]}>
                {scoreLabel(scoreToPar)}
              </Text>
              <Text style={[styles.heroResultDiff, { color: scoreToPar > 0 ? theme.warn : scoreToPar < 0 ? theme.good : theme.textSec }]}>
                {scoreToPar >= 0 ? '+' : ''}{scoreToPar}
              </Text>
            </View>
          )}
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.heroPar}>Par {hole.par}</Text>
          <Text style={styles.heroMeta}>{hole.yards}Y · HDCP {hole.hdcp}</Text>
          <View style={styles.heroTargetRow}>
            <Text style={styles.heroTargetTag}>目標</Text>
            <Text style={styles.heroTargetNum}>{holeTarget}</Text>
            <Text style={styles.heroTargetLabel}>· {targetLabel}</Text>
          </View>
        </View>
      </View>

      {/* Scrollable inputs */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.inputsContent} keyboardShouldPersistTaps="handled">

        {/* 打数 */}
        <View style={styles.inputBlock}>
          <Text style={[styles.label, { marginBottom: 6 }]}>打数</Text>
          {(strokesExtra || (hole.strokes != null && hole.strokes > 8)) ? (
            <FreeInput value={hole.strokes} onChange={setStroke} onCancel={() => { setStrokesExtra(false); setStroke(null); }}/>
          ) : (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1,2,3,4,5,6,7,8].map(n => <NumBtn key={n} n={n} active={hole.strokes === n} onPress={() => setStroke(n)}/>)}
              <ExtraBtn onPress={() => setStrokesExtra(true)}>9+</ExtraBtn>
            </View>
          )}
        </View>

        {/* パット */}
        <View style={styles.inputBlock}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
            <Text style={styles.label}>パット</Text>
            {threePutt && <Text style={styles.threePuttFlag}>3パット</Text>}
          </View>
          {(puttsExtra || (hole.putts != null && hole.putts > 4)) ? (
            <FreeInput value={hole.putts} onChange={setPutt} onCancel={() => { setPuttsExtra(false); setPutt(null); }}/>
          ) : (
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {[1,2,3,4].map(n => <NumBtn key={n} n={n} active={hole.putts === n} onPress={() => setPutt(n)}/>)}
              <ExtraBtn onPress={() => setPuttsExtra(true)}>5+</ExtraBtn>
            </View>
          )}
        </View>

        {/* 番手・残距離（練習モードのみ） */}
        {isPractice && clubs.length > 0 && (
          <View style={styles.inputBlock}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <Text style={styles.label}>番手・残距離</Text>
              {distHint && <Text style={styles.distHint}>{distHint}</Text>}
            </View>
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
              <TextInput
                style={styles.distInput}
                value={hole.remainingDistance != null ? String(hole.remainingDistance) : ''}
                onChangeText={v => update({ remainingDistance: v ? parseInt(v, 10) || null : null })}
                placeholder="残距離Y"
                placeholderTextColor={theme.textTer}
                keyboardType="number-pad"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', gap: 4 }}>
                  {clubs.map(c => {
                    const on = hole.club === c.name;
                    return (
                      <Pressable key={c.id} onPress={() => update({ club: on ? null : c.name })}
                        style={[styles.clubBtn, on && styles.clubBtnOn]}>
                        <Text style={[styles.clubBtnText, on && styles.clubBtnTextOn]}>{c.name}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </ScrollView>
            </View>
          </View>
        )}

        {/* ライ（練習モードのみ） */}
        {isPractice && (
          <View style={styles.inputBlock}>
            <Text style={[styles.label, { marginBottom: 6 }]}>ライ</Text>
            <View style={{ flexDirection: 'row', gap: 4 }}>
              {LIE_OPTIONS.map(({ key, label }) => {
                const on = hole.lie === key;
                return (
                  <Pressable key={key} onPress={() => toggleLie(key)}
                    style={[styles.lieBtn, on && styles.lieBtnOn]}>
                    <LieIcon type={key} color={on ? theme.bg : theme.text}/>
                    <Text style={[styles.lieLabel, { color: on ? theme.bg : theme.textSec }]}>{label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 発生時のみ（既存 + ミスタイプ） */}
        {(enabledOpts.length > 0 || enabledMissTypes.length > 0) && (
          <View style={styles.inputBlock}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <Text style={styles.label}>発生時のみタップ</Text>
              <Text style={styles.evMeta}>設定で変更</Text>
            </View>
            <View style={styles.evGrid}>
              {enabledOpts.map(o => {
                const on = !!hole[o.key];
                return (
                  <Pressable key={o.key} onPress={() => toggleField(o.key)} style={[styles.evBtn, on && styles.evBtnOn]}>
                    {o.isCustom
                      ? <View style={[styles.customDot, { backgroundColor: on ? theme.bg : theme.text }]}/>
                      : <OptIcon k={o.key} color={on ? theme.bg : theme.text}/>
                    }
                    <Text style={[styles.evLabel, { color: on ? theme.bg : theme.text }]} numberOfLines={1}>{o.label}</Text>
                  </Pressable>
                );
              })}
              {enabledMissTypes.map(o => {
                const on = (hole.missTypes || []).includes(o.key);
                return (
                  <Pressable key={o.key} onPress={() => toggleMissType(o.key)} style={[styles.evBtn, on && styles.evBtnOn]}>
                    <Text style={[styles.evLabel, { color: on ? theme.bg : theme.text }]} numberOfLines={1}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        )}

        {/* 同伴者スコア */}
        {companions.length > 0 && (
          <View style={styles.inputBlock}>
            <Text style={[styles.label, { marginBottom: 8 }]}>同伴者スコア</Text>
            <View style={{ gap: 6 }}>
              {companions.map((name, ci) => {
                const cs = hole.companionStrokes?.[ci] ?? null;
                return (
                  <View key={ci} style={styles.compScoreRow}>
                    <Text style={styles.compScoreName} numberOfLines={1}>{name}</Text>
                    <Pressable onPress={() => updateCompanionStroke(ci, Math.max(1, (cs || hole.par) - 1))}
                      style={styles.compScoreBtn}>
                      <Text style={styles.compScoreBtnText}>−</Text>
                    </Pressable>
                    <Text style={styles.compScoreNum}>{cs ?? '—'}</Text>
                    <Pressable onPress={() => updateCompanionStroke(ci, (cs || hole.par) + 1)}
                      style={styles.compScoreBtn}>
                      <Text style={styles.compScoreBtnText}>＋</Text>
                    </Pressable>
                    {cs != null && (
                      <Text style={[styles.compScoreDiff, {
                        color: cs - hole.par > 0 ? theme.textSec : theme.good,
                      }]}>
                        {cs - hole.par >= 0 ? '+' : ''}{cs - hole.par}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* 練習課題 */}
        {isPractice && practiceChallenges.length > 0 && (
          <View style={styles.practiceCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
              <Text style={styles.label}>このホールでできた？</Text>
              <Text style={styles.practiceTag}>PRACTICE</Text>
            </View>
            <View style={{ gap: 6 }}>
              {practiceChallenges.map(ck => {
                const lib = getChallenge(ck);
                const current = hole.challengeResults?.[ck];
                return (
                  <View key={ck} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.chTitle}>{lib?.label || ck}</Text>
                      <Text style={styles.chSub}>{lib?.sub || ''}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 4 }}>
                      {['○', '△', '×'].map(v => {
                        const on = current === v;
                        const accent = v === '○' ? theme.good : v === '×' ? theme.warn : theme.text;
                        return (
                          <Pressable key={v} onPress={() => setChallengeResult(ck, v)}
                            style={[styles.chResultBtn, { borderColor: accent, backgroundColor: on ? accent : 'transparent' }]}>
                            <Text style={{ color: on ? '#fff' : accent, fontFamily: FONT.mono, fontSize: 15, fontWeight: '700' }}>{v}</Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Hole picker */}
      <View style={styles.pickerWrap}>
        {pickerRows.map(([from, to]) => (
          <View key={from} style={styles.pickerRow}>
            {holes.slice(from, to).map((h, k) => {
              const i = from + k;
              const on = i === holeIdx;
              const played = h.strokes != null;
              return (
                <Pressable key={h.no} onPress={() => jumpTo(i)}
                  style={[styles.pickerBtn, on && styles.pickerBtnOn, played && !on && { backgroundColor: theme.surfaceAlt }]}>
                  <Text style={[styles.pickerNum, on && { color: theme.bg }]}>{h.no}</Text>
                  {played && !on && <View style={styles.pickerDot}/>}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {/* Footer */}
      <SafeAreaView edges={['bottom']} style={{ backgroundColor: theme.bg, borderTopWidth: 1, borderTopColor: theme.border }}>
        <View style={styles.footer}>
          <Pressable onPress={prev} disabled={holeIdx === 0}
            style={[styles.prevBtn, holeIdx === 0 && { opacity: 0.3 }]}>
            <Svg width={16} height={16} viewBox="0 0 24 24">
              <Path d="M15 6L9 12L15 18" stroke={theme.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none"/>
            </Svg>
          </Pressable>
          {holeIdx === total - 1 ? (
            <Pressable onPress={onFinish} style={styles.nextBtn}>
              <Text style={styles.nextText}>ラウンドを終える</Text>
            </Pressable>
          ) : (
            <Pressable onPress={next} style={styles.nextBtn}>
              <Text style={styles.nextText}>{`次のホール  ›  ${hole.no + 1}`}</Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

// ─── Sub components ──────────────────────────────────────────────────────────

function NumBtn({ n, active, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.numBtn, active && styles.numBtnOn]}>
      <Text style={[styles.numBtnText, active && styles.numBtnTextOn]}>{n}</Text>
    </Pressable>
  );
}
function ExtraBtn({ children, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.extraBtn}>
      <Text style={styles.extraBtnText}>{children}</Text>
    </Pressable>
  );
}
function FreeInput({ value, onChange, onCancel }) {
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <TextInput
        value={value != null ? String(value) : ''}
        onChangeText={t => { if (t === '') return onChange(null); const v = parseInt(t, 10); onChange(Number.isFinite(v) ? v : null); }}
        keyboardType="number-pad" autoFocus style={styles.freeInput}
      />
      <Pressable onPress={onCancel} style={styles.freeCancel}>
        <Text style={styles.freeCancelText}>戻る</Text>
      </Pressable>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  label: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 },
  topCenter: { flex: 1, alignItems: 'center', paddingHorizontal: 10 },
  topCourse: { fontSize: 12.5, fontWeight: '600', color: theme.text },
  topMeta: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.4, marginTop: 2 },
  topCount: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec },
  devBar: { marginHorizontal: 16, marginBottom: 8, paddingVertical: 6, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: theme.surfaceAlt, borderWidth: 1, borderColor: theme.borderStrong, borderStyle: 'dashed', borderRadius: 4 },
  devLabel: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.5, fontWeight: '500' },
  devFillBtn: { paddingHorizontal: 8, paddingVertical: 4, backgroundColor: theme.text, borderRadius: 3 },
  devFillText: { color: theme.bg, fontFamily: FONT.mono, fontSize: 10, fontWeight: '500' },
  devClearBtn: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: theme.border, borderRadius: 3 },
  devClearText: { color: theme.textSec, fontFamily: FONT.mono, fontSize: 10, fontWeight: '500' },
  runRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, paddingHorizontal: 16, paddingBottom: 12 },
  runNum: { fontFamily: FONT.mono, fontSize: 26, fontWeight: '400', letterSpacing: -0.8, lineHeight: 26 },
  runDiff: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500' },
  runCount: { fontFamily: FONT.mono, fontSize: 10.5, color: theme.textTer, letterSpacing: 0.5 },
  hero: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, paddingHorizontal: 16, paddingBottom: 14 },
  heroNum: { fontFamily: FONT.mono, fontSize: 56, fontWeight: '400', letterSpacing: -2.4, lineHeight: 64, marginTop: 4, color: theme.text, includeFontPadding: false },
  heroResult: { flexDirection: 'row', alignItems: 'baseline', gap: 8, marginTop: 10 },
  heroResultLabel: { fontSize: 24, fontWeight: '700', letterSpacing: -0.4, lineHeight: 24 },
  heroResultDiff: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500' },
  heroPar: { fontFamily: FONT.mono, fontSize: 20, fontWeight: '500', letterSpacing: -0.5, color: theme.text },
  heroMeta: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, marginTop: 2 },
  heroTargetRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 8 },
  heroTargetTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.6 },
  heroTargetNum: { fontFamily: FONT.mono, fontSize: 13, fontWeight: '500', color: theme.text },
  heroTargetLabel: { fontFamily: FONT.mono, fontSize: 10.5, color: theme.textSec },
  inputsContent: { paddingHorizontal: 16, paddingBottom: 24 },
  inputBlock: { marginBottom: 14 },
  numBtn: { flex: 1, paddingVertical: 13, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface, alignItems: 'center' },
  numBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  numBtnText: { fontFamily: FONT.mono, fontSize: 15, fontWeight: '500', color: theme.text },
  numBtnTextOn: { color: theme.bg },
  extraBtn: { flex: 1, paddingVertical: 13, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface, alignItems: 'center' },
  extraBtnText: { fontSize: 12, color: theme.textSec, fontWeight: '500' },
  freeInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: theme.text, borderRadius: 6, backgroundColor: theme.surface, color: theme.text, fontFamily: FONT.mono, fontSize: 16, fontWeight: '500' },
  freeCancel: { paddingHorizontal: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  freeCancelText: { color: theme.textSec, fontSize: 12, fontWeight: '500' },
  threePuttFlag: { fontFamily: FONT.mono, fontSize: 11, color: theme.warn },
  // Club
  distInput: { width: 80, height: 38, borderWidth: 1, borderColor: theme.border, borderRadius: 6, paddingHorizontal: 10, fontSize: 13, color: theme.text, backgroundColor: theme.surface, fontFamily: FONT.mono },
  distHint: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.3 },
  clubBtn: { paddingHorizontal: 10, paddingVertical: 7, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface },
  clubBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  clubBtnText: { fontFamily: FONT.mono, fontSize: 12, fontWeight: '600', color: theme.text },
  clubBtnTextOn: { color: theme.bg },
  // Lie
  lieBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface, gap: 4 },
  lieBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  lieLabel: { fontSize: 9, fontFamily: FONT.mono, letterSpacing: 0.2 },
  // Events
  evMeta: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.4 },
  evGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  evBtn: { width: '31.8%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 4, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface },
  evBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  evLabel: { fontSize: 12, fontWeight: '500', flexShrink: 1 },
  customDot: { width: 6, height: 6, borderRadius: 3 },
  // Companion score
  compScoreRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  compScoreName: { flex: 1, fontSize: 12.5, color: theme.text, fontWeight: '500' },
  compScoreBtn: { width: 32, height: 32, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.surface },
  compScoreBtnText: { fontSize: 16, color: theme.text, lineHeight: 18 },
  compScoreNum: { fontFamily: FONT.mono, fontSize: 18, fontWeight: '500', color: theme.text, width: 30, textAlign: 'center' },
  compScoreDiff: { fontFamily: FONT.mono, fontSize: 11, width: 28 },
  // Practice
  practiceCard: { marginBottom: 16, padding: 12, borderWidth: 2, borderColor: theme.text, borderRadius: 8, backgroundColor: theme.surface },
  practiceTag: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.4, fontWeight: '600' },
  chTitle: { fontSize: 12.5, fontWeight: '600', color: theme.text, letterSpacing: -0.1 },
  chSub: { fontSize: 10, color: theme.textSec, marginTop: 1 },
  chResultBtn: { width: 34, height: 34, borderRadius: 6, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  // Picker
  pickerWrap: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, borderTopWidth: 1, borderTopColor: theme.border, backgroundColor: theme.bg },
  pickerRow: { flexDirection: 'row', gap: 3, marginBottom: 4 },
  pickerBtn: { flex: 1, paddingVertical: 7, borderWidth: 1, borderColor: theme.border, borderRadius: 4, backgroundColor: theme.surface, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  pickerBtnOn: { backgroundColor: theme.text, borderColor: theme.text },
  pickerNum: { fontFamily: FONT.mono, fontSize: 12, fontWeight: '600', color: theme.text },
  pickerDot: { position: 'absolute', top: 3, right: 3, width: 4, height: 4, borderRadius: 2, backgroundColor: theme.text },
  // Footer
  footer: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 12 },
  prevBtn: { minWidth: 52, paddingVertical: 11, paddingHorizontal: 14, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  nextBtn: { flex: 1, paddingVertical: 11, backgroundColor: theme.text, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  nextText: { color: theme.bg, fontSize: 13, fontWeight: '600', letterSpacing: -0.1 },
});
