import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { THEMES, FONT } from '../theme/tokens';
import { getAllRounds } from '../data/rounds';

const theme = THEMES.light;

// ─── Data computation ───────────────────────────────────────────────────────

function computeAnalytics(allRounds) {
  const rounds = (allRounds || []).filter(r => !r.isPractice && r.holes?.length > 0);
  if (rounds.length === 0) return null;

  const allHoles = rounds.flatMap(r => r.holes).filter(h => h.strokes != null);
  if (allHoles.length === 0) return null;

  const byPar = p => allHoles.filter(h => h.par === p);
  const holeAvg = holes =>
    holes.length ? parseFloat((holes.reduce((s, h) => s + h.strokes, 0) / holes.length).toFixed(2)) : null;

  const dist = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0 };
  allHoles.forEach(h => {
    const d = h.strokes - h.par;
    if (d <= -2)       dist.eagle++;
    else if (d === -1) dist.birdie++;
    else if (d === 0)  dist.par++;
    else if (d === 1)  dist.bogey++;
    else if (d === 2)  dist.double++;
    else               dist.triple++;
  });

  const putHoles = allHoles.filter(h => h.putts != null);
  const puttSum = putHoles.reduce((s, h) => s + h.putts, 0);
  const avgPuttPerHole = putHoles.length ? puttSum / putHoles.length : null;

  const trend = rounds.slice(0, 10).reverse().map(r => ({
    date: new Date(r.endedAt).toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' }),
    course: (r.course?.name || '不明').replace(/カントリー倶楽部|カントリークラブ|ゴルフ場|ゴルフクラブ|ゴルフ/, ''),
    total: r.total,
    diff: r.diff,
    isHalf: r.isHalf,
  }));

  return {
    roundCount: rounds.length,
    par3Avg: holeAvg(byPar(3)),
    par4Avg: holeAvg(byPar(4)),
    par5Avg: holeAvg(byPar(5)),
    dist,
    holeCount: allHoles.length,
    avgPuttsRound: avgPuttPerHole ? parseFloat((avgPuttPerHole * 18).toFixed(1)) : null,
    threePuttPct: putHoles.length ? Math.round(putHoles.filter(h => h.putts >= 3).length / putHoles.length * 100) : null,
    onePuttPct:   putHoles.length ? Math.round(putHoles.filter(h => h.putts <= 1).length / putHoles.length * 100) : null,
    obPerRound: parseFloat((allHoles.filter(h => h.ob).length / rounds.length).toFixed(1)),
    hazardPct: Math.round(allHoles.filter(h => h.hazard).length / allHoles.length * 100),
    trend,
  };
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function SectionLabel({ children }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

function Card({ children, mt = 14 }) {
  return <View style={[styles.card, { marginTop: mt }]}>{children}</View>;
}

function TrendSection({ trend }) {
  return (
    <Card mt={20}>
      <SectionLabel>ラウンド履歴</SectionLabel>
      {trend.map((r, i) => (
        <View key={i} style={[styles.trendRow, i > 0 && styles.trendBorder]}>
          <Text style={styles.trendDate}>{r.date}</Text>
          <Text style={styles.trendCourse} numberOfLines={1}>{r.course}{r.isHalf ? ' ½' : ''}</Text>
          <Text style={styles.trendScore}>{r.total}</Text>
          <Text style={[styles.trendDiff, { color: r.diff > 0 ? theme.textSec : theme.good }]}>
            {r.diff >= 0 ? '+' : ''}{r.diff}
          </Text>
        </View>
      ))}
    </Card>
  );
}

function ParScoreSection({ par3Avg, par4Avg, par5Avg }) {
  const items = [
    { label: 'PAR 3', avg: par3Avg, par: 3 },
    { label: 'PAR 4', avg: par4Avg, par: 4 },
    { label: 'PAR 5', avg: par5Avg, par: 5 },
  ];
  return (
    <Card>
      <SectionLabel>Par別平均スコア</SectionLabel>
      <View style={styles.parRow}>
        {items.map(({ label, avg, par }) => {
          if (avg == null) return null;
          const diff = parseFloat((avg - par).toFixed(2));
          return (
            <View key={label} style={styles.parCell}>
              <Text style={styles.parLabel}>{label}</Text>
              <Text style={styles.parAvg}>{avg.toFixed(2)}</Text>
              <Text style={[styles.parDiff, { color: diff <= 0 ? theme.good : theme.textSec }]}>
                {diff >= 0 ? '+' : ''}{diff.toFixed(2)}
              </Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const DIST_META = [
  { key: 'eagle',  label: 'イーグル以下', color: '#C9A33A' },
  { key: 'birdie', label: 'バーディ',     color: '#2F8C5B' },
  { key: 'par',    label: 'パー',         color: theme.text },
  { key: 'bogey',  label: 'ボギー',       color: '#D07C40' },
  { key: 'double', label: 'ダブルボギー', color: '#C05050' },
  { key: 'triple', label: 'トリプル以上', color: '#A03030' },
];

function DistSection({ dist, holeCount }) {
  const total = Object.values(dist).reduce((s, n) => s + n, 0);
  if (total === 0) return null;
  const pct = n => Math.round(n / total * 100);
  return (
    <Card>
      <SectionLabel>スコア内訳</SectionLabel>
      <View style={{ marginTop: 10, gap: 7 }}>
        {DIST_META.map(({ key, label, color }) => {
          const n = dist[key];
          const p = pct(n);
          return (
            <View key={key} style={styles.distRow}>
              <Text style={styles.distLabel}>{label}</Text>
              <View style={styles.distBarWrap}>
                <View style={[styles.distBarFill, { width: `${p}%`, backgroundColor: color }]} />
              </View>
              <Text style={styles.distPct}>{p}%</Text>
              <Text style={styles.distCount}>({n})</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

function PuttSection({ avgPuttsRound, threePuttPct, onePuttPct }) {
  if (avgPuttsRound == null) return null;
  return (
    <Card>
      <SectionLabel>パット</SectionLabel>
      <View style={styles.statGrid}>
        <StatCell label="パット数/18H" value={avgPuttsRound} unit="打" />
        {onePuttPct != null && <StatCell label="1パット率" value={onePuttPct} unit="%" />}
        {threePuttPct != null && <StatCell label="3パット率" value={threePuttPct} unit="%" />}
      </View>
    </Card>
  );
}

function HazardSection({ obPerRound, hazardPct }) {
  return (
    <Card>
      <SectionLabel>OB・ハザード</SectionLabel>
      <View style={styles.statGrid}>
        <StatCell label="OB回数/ラウンド" value={obPerRound} unit="回" decimals={1} />
        <StatCell label="ハザード率" value={hazardPct} unit="%" />
      </View>
    </Card>
  );
}

function StatCell({ label, value, unit, decimals = 0 }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValRow}>
        <Text style={styles.statVal}>{typeof value === 'number' ? value.toFixed(decimals) : value}</Text>
        <Text style={styles.statUnit}>{unit}</Text>
      </View>
    </View>
  );
}

// ─── Screen ─────────────────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const [analytics, setAnalytics] = useState(undefined); // undefined = loading

  useFocusEffect(
    useCallback(() => {
      let active = true;
      getAllRounds().then(rounds => {
        if (!active) return;
        setAnalytics(computeAnalytics(rounds));
      });
      return () => { active = false; };
    }, [])
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>分析</Text>
        {analytics === undefined ? null : analytics === null ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>準備中</Text>
            <Text style={styles.emptySub}>
              ラウンドデータを貯めると、{'\n'}ここでスコア推移や指標別の傾向を確認できます。
            </Text>
          </View>
        ) : (
          <>
            <TrendSection trend={analytics.trend} />
            <ParScoreSection
              par3Avg={analytics.par3Avg}
              par4Avg={analytics.par4Avg}
              par5Avg={analytics.par5Avg}
            />
            <DistSection dist={analytics.dist} holeCount={analytics.holeCount} />
            <PuttSection
              avgPuttsRound={analytics.avgPuttsRound}
              threePuttPct={analytics.threePuttPct}
              onePuttPct={analytics.onePuttPct}
            />
            <HazardSection obPerRound={analytics.obPerRound} hazardPct={analytics.hazardPct} />
            <Text style={styles.footnote}>{analytics.roundCount}ラウンド · {analytics.holeCount}ホールから算出</Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 20, paddingTop: 40, paddingBottom: 50 },
  title: { fontSize: 22, fontWeight: '700', color: theme.text, letterSpacing: -0.5 },

  sectionLabel: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  card: { borderWidth: 1, borderColor: theme.border, borderRadius: 8, padding: 14, backgroundColor: theme.surface },

  // Trend table
  trendRow: { flexDirection: 'row', alignItems: 'baseline', paddingVertical: 9, gap: 8 },
  trendBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  trendDate: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, width: 40 },
  trendCourse: { flex: 1, fontSize: 12, color: theme.text, letterSpacing: -0.1 },
  trendScore: { fontFamily: FONT.mono, fontSize: 16, fontWeight: '500', color: theme.text, letterSpacing: -0.5 },
  trendDiff: { fontFamily: FONT.mono, fontSize: 11, width: 36, textAlign: 'right' },

  // Par breakdown
  parRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  parCell: { flex: 1, alignItems: 'center', paddingVertical: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.bg },
  parLabel: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, letterSpacing: 0.6 },
  parAvg: { fontFamily: FONT.mono, fontSize: 22, fontWeight: '400', color: theme.text, letterSpacing: -0.8, marginTop: 4 },
  parDiff: { fontFamily: FONT.mono, fontSize: 11, marginTop: 2 },

  // Score distribution
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distLabel: { fontSize: 11, color: theme.text, width: 88 },
  distBarWrap: { flex: 1, height: 6, backgroundColor: theme.border, borderRadius: 3, overflow: 'hidden' },
  distBarFill: { height: '100%', borderRadius: 3 },
  distPct: { fontFamily: FONT.mono, fontSize: 11, color: theme.text, width: 30, textAlign: 'right' },
  distCount: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, width: 32 },

  // Stat grid (putts, hazard)
  statGrid: { flexDirection: 'row', marginTop: 12, gap: 8 },
  statCell: { flex: 1, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.bg },
  statLabel: { fontSize: 11, color: theme.textSec, letterSpacing: -0.1 },
  statValRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 6 },
  statVal: { fontFamily: FONT.mono, fontSize: 22, fontWeight: '400', color: theme.text, letterSpacing: -0.8 },
  statUnit: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec },

  // Empty state
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingBottom: 80 },
  emptyText: { fontFamily: FONT.mono, fontSize: 22, color: theme.textTer, letterSpacing: 0.5 },
  emptySub: { fontSize: 12, color: theme.textSec, textAlign: 'center', marginTop: 14, maxWidth: 260, lineHeight: 20 },

  footnote: { fontFamily: FONT.mono, fontSize: 9, color: theme.textTer, textAlign: 'center', marginTop: 24, letterSpacing: 0.4 },
});
