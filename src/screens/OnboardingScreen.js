import React, { useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import { savePersona, scoreToPersonaKey } from '../data/persona';

const theme = THEMES.light;

const scoreToPersona = scoreToPersonaKey;

const QUESTIONS = [
  {
    id: 'best', title: 'ベストスコアは？', sub: 'だいたいで OK',
    type: 'options',
    options: [
      { v: 110, label: '110 以上' },
      { v: 100, label: '100 前後' },
      { v: 90,  label: '90 前後' },
      { v: 80,  label: '80 台' },
      { v: 75,  label: '70 台' },
    ],
  },
  {
    id: 'avg', title: '平均スコア帯は？', sub: '直近 10 ラウンドくらいで',
    type: 'options',
    options: [
      { v: 110, label: '110 以上' },
      { v: 100, label: '100 前後' },
      { v: 90,  label: '90 前後' },
      { v: 85,  label: '80 台後半' },
      { v: 80,  label: '80 台前半' },
    ],
  },
  {
    id: 'goal', title: '目指したいスコアは？',
    sub: 'スクロールして選ぶ · 指標の優先度はこれに合わせて変わります',
    type: 'wheel',
  },
  {
    id: 'years', title: 'ゴルフ歴は？',
    type: 'options',
    options: [
      { v: 1, label: '〜1 年' },
      { v: 3, label: '1-3 年' },
      { v: 5, label: '3-5 年' },
      { v: 10, label: '5-10 年' },
      { v: 15, label: '10 年以上' },
    ],
  },
];

export default function OnboardingScreen() {
  const navigation = useNavigation();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ best: null, avg: null, goal: 99, years: null });

  const q = QUESTIONS[step];
  const last = step === QUESTIONS.length - 1;
  const canNext = q.type === 'wheel' ? answers[q.id] != null : answers[q.id] != null;

  const pick = (v) => setAnswers(a => ({ ...a, [q.id]: v }));

  const doNext = async () => {
    if (last) {
      const personaKey = scoreToPersonaKey(answers.goal);
      await savePersona({
        ...answers,
        personaKey,
        completedAt: Date.now(),
      });
      navigation.reset({ index: 0, routes: [{ name: 'Main' }] });
    } else {
      setStep(s => s + 1);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.bg }} edges={['top', 'bottom']}>
      {/* Progress bar */}
      <View style={styles.topBar}>
        <Pressable onPress={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0} style={{ opacity: step === 0 ? 0.2 : 1 }}>
          <Svg width={18} height={18} viewBox="0 0 24 24">
            <Path d="M15 6L9 12L15 18" stroke={theme.text} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </Svg>
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', gap: 3 }}>
          {QUESTIONS.map((_, i) => (
            <View key={i} style={[styles.progBar, { backgroundColor: i <= step ? theme.text : theme.border }]} />
          ))}
        </View>
        <Text style={styles.counter}>{step + 1}/{QUESTIONS.length}</Text>
      </View>

      {/* Question */}
      <View style={{ paddingHorizontal: 20, paddingTop: 8 }}>
        <Text style={styles.label}>レベル診断</Text>
        <Text style={styles.title}>{q.title}</Text>
        {q.sub && <Text style={styles.sub}>{q.sub}</Text>}
      </View>

      {/* Body */}
      {q.type === 'wheel' ? (
        <View style={{ paddingVertical: 22 }}>
          <ScoreWheel min={70} max={120} value={answers.goal ?? 99} onChange={v => pick(v)} />
          <Text style={styles.personaLabel}>{scoreToPersona(answers.goal ?? 99)}レベル</Text>
        </View>
      ) : (
        <View style={styles.optionsWrap}>
          {q.options.map(o => {
            const on = answers[q.id] === o.v;
            return (
              <Pressable key={o.v} onPress={() => pick(o.v)} style={[styles.option, on && styles.optionOn]}>
                <Text style={[styles.optionText, on && { color: theme.bg, fontWeight: '600' }]}>{o.label}</Text>
                {on && (
                  <Svg width={14} height={14} viewBox="0 0 24 24">
                    <Path d="M5 13l4 4L19 7" stroke={theme.bg} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </Svg>
                )}
              </Pressable>
            );
          })}
        </View>
      )}

      <View style={{ flex: 1 }} />

      {/* Footer */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 14 }}>
        <Pressable onPress={doNext} disabled={!canNext} style={[styles.nextBtn, !canNext && { opacity: 0.35 }]}>
          <Text style={styles.nextText}>{last ? '診断結果を見る' : '次へ'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─── ScoreWheel: iOS-style vertical scroll picker ───
const ITEM_H = 44;
const VISIBLE = 5;
const CONTAINER_H = ITEM_H * VISIBLE;

function ScoreWheel({ min, max, value, onChange }) {
  const scrollRef = useRef(null);
  const scores = [];
  for (let v = min; v <= max; v++) scores.push(v);

  const [scrollValue, setScrollValue] = useState(value);

  useEffect(() => {
    const idx = Math.max(0, scores.indexOf(value));
    setTimeout(() => {
      scrollRef.current?.scrollTo({ y: idx * ITEM_H, animated: false });
    }, 50);
  }, []);

  const onScroll = (e) => {
    const y = e.nativeEvent.contentOffset.y;
    const idx = Math.round(y / ITEM_H);
    const clamped = Math.max(0, Math.min(scores.length - 1, idx));
    const v = scores[clamped];
    if (v !== scrollValue) {
      setScrollValue(v);
      onChange(v);
    }
  };

  return (
    <View style={styles.wheelWrap}>
      {/* Center selection band */}
      <View style={styles.wheelBand} />
      {/* Side ticks */}
      <View style={styles.wheelTickL} />
      <View style={styles.wheelTickR} />

      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: CONTAINER_H / 2 - ITEM_H / 2 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ height: CONTAINER_H }}
      >
        {scores.map(s => {
          const selected = s === scrollValue;
          const distance = Math.abs(s - scrollValue);
          const opacity = selected ? 1
            : distance === 1 ? 0.55
            : distance === 2 ? 0.3
            : 0.15;
          return (
            <View key={s} style={{ height: ITEM_H, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{
                fontFamily: FONT.mono,
                fontSize: selected ? 34 : 22,
                fontWeight: selected ? '500' : '400',
                color: theme.text,
                opacity,
                letterSpacing: -1.2,
                lineHeight: selected ? 38 : 24,
              }}>{s}</Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Progress
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 22 },
  progBar: { flex: 1, height: 2, borderRadius: 1 },
  counter: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, minWidth: 28, textAlign: 'right' },
  // Label + title
  label: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: '700', color: theme.text, marginTop: 10, letterSpacing: -0.6, lineHeight: 32 },
  sub: { fontSize: 12.5, color: theme.textSec, marginTop: 6 },
  // Options
  optionsWrap: { paddingHorizontal: 20, paddingTop: 22, gap: 6 },
  option: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 15, paddingVertical: 13,
    borderWidth: 1, borderColor: theme.border, borderRadius: 6, backgroundColor: theme.surface,
  },
  optionOn: { backgroundColor: theme.text, borderColor: theme.text },
  optionText: { fontSize: 14, fontWeight: '500', color: theme.text },
  // Persona label
  personaLabel: { marginTop: 12, textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.4 },
  // Wheel
  wheelWrap: { position: 'relative', width: 240, alignSelf: 'center' },
  wheelBand: {
    position: 'absolute', left: 0, right: 0,
    top: CONTAINER_H / 2 - ITEM_H / 2,
    height: ITEM_H,
    borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border,
    pointerEvents: 'none', zIndex: 1,
  },
  wheelTickL: {
    position: 'absolute', left: 8,
    top: CONTAINER_H / 2 - 6,
    width: 10, height: 12, borderLeftWidth: 2, borderLeftColor: theme.text,
    pointerEvents: 'none', zIndex: 3,
  },
  wheelTickR: {
    position: 'absolute', right: 8,
    top: CONTAINER_H / 2 - 6,
    width: 10, height: 12, borderRightWidth: 2, borderRightColor: theme.text,
    pointerEvents: 'none', zIndex: 3,
  },
  // Next button
  nextBtn: { paddingVertical: 14, borderRadius: 8, backgroundColor: theme.text, alignItems: 'center' },
  nextText: { color: theme.bg, fontSize: 14, fontWeight: '600' },
});
