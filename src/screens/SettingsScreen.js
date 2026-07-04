import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Switch, Alert, Modal, TextInput, KeyboardAvoidingView, Platform, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import Svg, { Path } from 'react-native-svg';
import { THEMES, FONT } from '../theme/tokens';
import {
  getRoundOptions, setRoundOptions, getLang, setLang, DEFAULT_ROUND_OPTIONS, clearSettings,
  getCustomOptions, addCustomOption, removeCustomOption, toggleCustomOption,
} from '../data/settings';
import { clearRounds, getAllRounds } from '../data/rounds';
import { clearTestResults } from '../data/testResults';
import { clearPersona } from '../data/persona';
import { clearFavorites } from '../data/favorites';
import { seedMockData } from '../data/seed';
import { exportRoundsToCsv, filterByDays, formatRoundLabel } from '../data/exportCsv';

const theme = THEMES.light;

const ROUND_OPTIONS = [
  { key: 'ob',        label: 'OB数',        sub: 'ホール毎に記録' },
  { key: 'hazard',    label: 'ハザード数',  sub: 'ホール毎に記録' },
  { key: 'threePutt', label: '3パット',     sub: '自動集計対象' },
  { key: 'fairway',   label: 'FWキープ',    sub: 'パー4以上のみ' },
  { key: 'upDown',    label: '寄せワン',    sub: 'グリーン外から1パット' },
  { key: 'bunker',    label: 'バンカー',    sub: 'サンドセーブ' },
];

const LANGUAGES = [
  { key: 'ja', label: '日本語' },
  { key: 'en', label: 'English' },
  { key: 'ko', label: '한국어' },
];

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [opts, setOpts] = useState(DEFAULT_ROUND_OPTIONS);
  const [lang, setLangState] = useState('ja');
  const [custom, setCustom] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [addInput, setAddInput] = useState('');

  // Export state
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState('all'); // 'all' | 'period' | 'rounds'
  const [periodDays, setPeriodDays] = useState(90);
  const [allRounds, setAllRounds] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    getRoundOptions().then(setOpts);
    getLang().then(setLangState);
    getCustomOptions().then(setCustom);
  }, []);

  const toggle = async (k) => {
    const next = { ...opts, [k]: !opts[k] };
    setOpts(next);
    await setRoundOptions(next);
  };

  const changeLang = async (l) => {
    setLangState(l);
    await setLang(l);
  };

  const onToggleCustom = async (key) => {
    const next = await toggleCustomOption(key);
    setCustom(next);
  };
  const onRemoveCustom = (key, label) => {
    Alert.alert('項目を削除', `「${label}」を削除しますか？`, [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除', style: 'destructive', onPress: async () => {
        const next = await removeCustomOption(key);
        setCustom(next);
      } },
    ]);
  };
  const onAddCustom = async () => {
    const label = addInput.trim();
    if (!label) return;
    const next = await addCustomOption(label);
    setCustom(next);
    setAddInput('');
    setAddOpen(false);
  };

  const openExport = useCallback(() => {
    getAllRounds().then(r => {
      setAllRounds(r);
      setSelectedIds(new Set());
      setExportMode('all');
      setExportOpen(true);
    });
  }, []);

  const toggleRound = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const exportTargets = () => {
    if (exportMode === 'all') return allRounds;
    if (exportMode === 'period') return filterByDays(allRounds, periodDays);
    return allRounds.filter(r => selectedIds.has(r.endedAt));
  };

  const doExport = async () => {
    const targets = exportTargets();
    if (targets.length === 0) {
      Alert.alert('対象なし', '選択されたラウンドがありません');
      return;
    }
    setExporting(true);
    try {
      await exportRoundsToCsv(targets);
      setExportOpen(false);
    } catch (e) {
      Alert.alert('エラー', e.message || 'エクスポートに失敗しました');
    } finally {
      setExporting(false);
    }
  };

  const confirmReset = () => {
    Alert.alert(
      'データをリセット',
      'すべてのラウンド・練習・設定・診断データが削除されます。この操作は取り消せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'リセット', style: 'destructive', onPress: async () => {
          await Promise.all([
            clearRounds(), clearTestResults(), clearPersona(), clearFavorites(), clearSettings(),
          ]);
          setOpts(DEFAULT_ROUND_OPTIONS);
          setLangState('ja');
          setCustom([]);
          Alert.alert('完了', 'すべてのデータをリセットしました');
        } },
      ]
    );
  };

  return (
    <>
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* ラウンド設定 */}
      <Text style={styles.sectionLabel}>ラウンド記録で使う項目</Text>
      <Text style={styles.sectionSub}>記録画面のボタンと集計対象が変わります</Text>
      <View style={styles.card}>
        {ROUND_OPTIONS.map((o, i) => (
          <View key={o.key} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{o.label}</Text>
              <Text style={styles.rowSub}>{o.sub}</Text>
            </View>
            <Switch
              value={opts[o.key]}
              onValueChange={() => toggle(o.key)}
              trackColor={{ false: theme.border, true: theme.text }}
              thumbColor={theme.bg}
              ios_backgroundColor={theme.border}
            />
          </View>
        ))}
      </View>

      {/* カスタム項目 */}
      <Text style={[styles.sectionLabel, { marginTop: 22 }]}>カスタム項目</Text>
      <Text style={styles.sectionSub}>独自に記録したい項目を追加できます</Text>
      <View style={styles.card}>
        {custom.map((c, i) => (
          <View key={c.key} style={[styles.row, i > 0 && styles.rowBorder]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowLabel}>{c.label}</Text>
              <Text style={styles.rowSub}>カスタム</Text>
            </View>
            <Pressable onPress={() => onRemoveCustom(c.key, c.label)} hitSlop={10} style={styles.delBtn}>
              <Svg width={16} height={16} viewBox="0 0 24 24">
                <Path d="M6 6L18 18M18 6L6 18" stroke={theme.textSec} strokeWidth={1.6} strokeLinecap="round"/>
              </Svg>
            </Pressable>
            <Switch
              value={c.enabled}
              onValueChange={() => onToggleCustom(c.key)}
              trackColor={{ false: theme.border, true: theme.text }}
              thumbColor={theme.bg}
              ios_backgroundColor={theme.border}
              style={{ marginLeft: 8 }}
            />
          </View>
        ))}
        <Pressable onPress={() => setAddOpen(true)} style={[styles.row, custom.length > 0 && styles.rowBorder, styles.addRow]}>
          <Text style={styles.addText}>＋ カスタム項目を追加</Text>
        </Pressable>
      </View>

      {/* 言語 */}
      <Text style={[styles.sectionLabel, { marginTop: 26 }]}>言語</Text>
      <View style={styles.card}>
        {LANGUAGES.map((l, i) => {
          const on = lang === l.key;
          return (
            <Pressable key={l.key} onPress={() => changeLang(l.key)} style={[styles.row, i > 0 && styles.rowBorder]}>
              <Text style={styles.rowLabel}>{l.label}</Text>
              <View style={{ flex: 1 }}/>
              {on && <Text style={styles.check}>✓</Text>}
            </Pressable>
          );
        })}
      </View>

      {/* 診断 */}
      <Text style={[styles.sectionLabel, { marginTop: 26 }]}>レベル診断</Text>
      <Pressable onPress={() => navigation.navigate('Onboarding')} style={[styles.card, styles.onboardBtn]}>
        <Text style={styles.onboardText}>診断をやり直す</Text>
        <Text style={styles.onboardArrow}>→</Text>
      </Pressable>

      {/* データ */}
      <Text style={[styles.sectionLabel, { marginTop: 26 }]}>データ</Text>
      <View style={styles.card}>
        <Pressable onPress={openExport} style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>スコアデータをエクスポート</Text>
            <Text style={styles.rowSub}>CSV形式 · ホール別明細</Text>
          </View>
          <Text style={styles.rowArrow}>→</Text>
        </Pressable>
        <Pressable onPress={confirmReset} style={[styles.row, styles.rowBorder]}>
          <Text style={styles.resetText}>すべてのデータをリセット</Text>
        </Pressable>
      </View>

      {/* DEV section */}
      <Text style={[styles.sectionLabel, { marginTop: 26 }]}>DEV</Text>
      <Pressable
        onPress={() => {
          Alert.alert(
            'モックデータ投入',
            '既存のラウンド/テスト/お気に入りを削除して、サンプルデータで上書きします。',
            [
              { text: 'キャンセル', style: 'cancel' },
              { text: '投入', onPress: async () => {
                const r = await seedMockData();
                Alert.alert('完了',
                  `投入内容:\n・スコアリングラウンド ${r.rounds}件（直近1日〜60日前）\n・練習ラウンド ${r.practiceRounds}件\n・テスト結果 ${r.testResults}件\n・ドリルセッション ${r.drillSessions}件\n・お気に入り ${r.favorites}件`
                );
              } },
            ]
          );
        }}
        style={[styles.card, styles.devBtn]}
      >
        <Text style={styles.devBtnText}>モックデータを投入</Text>
        <Text style={styles.devBtnSub}>Home / Practice の表示確認用</Text>
      </Pressable>

      <Text style={styles.ver}>v0.1.0</Text>
    </ScrollView>

    {/* Export modal */}
    <Modal visible={exportOpen} transparent animationType="slide" onRequestClose={() => setExportOpen(false)}>
      <View style={ex.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={() => setExportOpen(false)} />
        <View style={ex.sheet}>
          <View style={ex.handle} />
          <Text style={ex.title}>データをエクスポート</Text>

          {/* Mode tabs */}
          <View style={ex.tabs}>
            {[
              { k: 'all',    label: '全て' },
              { k: 'period', label: '期間指定' },
              { k: 'rounds', label: 'ラウンド選択' },
            ].map(({ k, label }) => (
              <Pressable key={k} onPress={() => setExportMode(k)}
                style={[ex.tab, exportMode === k && ex.tabOn]}>
                <Text style={[ex.tabText, exportMode === k && ex.tabTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>

          {/* Content */}
          {exportMode === 'all' && (
            <View style={ex.content}>
              <Text style={ex.countText}>
                {allRounds.length > 0
                  ? `全 ${allRounds.length} 件のラウンドをエクスポートします`
                  : 'ラウンド記録がありません'}
              </Text>
              <Text style={ex.contentSub}>ホール別CSV（Excel・Googleスプレッドシートで開けます）</Text>
            </View>
          )}

          {exportMode === 'period' && (
            <View style={ex.content}>
              <View style={ex.periodChips}>
                {[
                  { d: 30,  label: '直近1ヶ月' },
                  { d: 90,  label: '直近3ヶ月' },
                  { d: 180, label: '直近6ヶ月' },
                  { d: 365, label: '直近1年' },
                ].map(({ d, label }) => (
                  <Pressable key={d} onPress={() => setPeriodDays(d)}
                    style={[ex.chip, periodDays === d && ex.chipOn]}>
                    <Text style={[ex.chipText, periodDays === d && ex.chipTextOn]}>{label}</Text>
                  </Pressable>
                ))}
              </View>
              <Text style={ex.countText}>
                {filterByDays(allRounds, periodDays).length} 件が対象
              </Text>
            </View>
          )}

          {exportMode === 'rounds' && (
            <ScrollView style={ex.roundList} contentContainerStyle={{ paddingBottom: 8 }}>
              {allRounds.length === 0
                ? <Text style={ex.contentSub}>ラウンド記録がありません</Text>
                : allRounds.map((r, i) => {
                    const { date, name, total, diff } = formatRoundLabel(r);
                    const on = selectedIds.has(r.endedAt);
                    return (
                      <Pressable key={r.endedAt ?? i} onPress={() => toggleRound(r.endedAt)}
                        style={[ex.roundRow, i > 0 && ex.roundBorder, on && ex.roundRowOn]}>
                        <View style={[ex.roundCheck, on && ex.roundCheckOn]}>
                          {on && (
                            <Svg width={10} height={10} viewBox="0 0 12 12">
                              <Path d="M2 6 L5 9 L10 3" stroke={theme.text} strokeWidth={2}
                                fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            </Svg>
                          )}
                        </View>
                        <Text style={ex.roundDate}>{date}</Text>
                        <Text style={ex.roundName} numberOfLines={1}>{name}</Text>
                        <Text style={ex.roundScore}>{total}</Text>
                        <Text style={[ex.roundDiff, { color: diff > 0 ? theme.textSec : theme.good }]}>
                          {diff >= 0 ? '+' : ''}{diff}
                        </Text>
                      </Pressable>
                    );
                  })
              }
            </ScrollView>
          )}

          {exportMode === 'rounds' && selectedIds.size > 0 && (
            <Text style={ex.selectedCount}>{selectedIds.size} 件選択中</Text>
          )}

          {/* Actions */}
          <View style={ex.actions}>
            <Pressable onPress={() => setExportOpen(false)} style={[ex.actionBtn, ex.actionCancel]}>
              <Text style={ex.actionCancelText}>キャンセル</Text>
            </Pressable>
            <Pressable
              onPress={doExport}
              disabled={exporting || exportTargets().length === 0}
              style={[ex.actionBtn, ex.actionOk,
                (exporting || exportTargets().length === 0) && { opacity: 0.35 }]}
            >
              <Text style={ex.actionOkText}>
                {exporting ? '処理中...' : `エクスポート（${exportTargets().length}件）`}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>

    {/* Add custom modal */}
    <Modal visible={addOpen} transparent animationType="fade" onRequestClose={() => setAddOpen(false)}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.modalBg}
      >
        <Pressable onPress={() => setAddOpen(false)} style={StyleSheet.absoluteFill} />
        <View style={styles.modalCard}>
          <Text style={styles.modalLabel}>カスタム項目を追加</Text>
          <Text style={styles.modalSub}>例: ダブルボギー回避 / フェアウェイバンカー</Text>
          <TextInput
            value={addInput}
            onChangeText={setAddInput}
            placeholder="項目名（12文字まで）"
            placeholderTextColor={theme.textTer}
            maxLength={12}
            autoFocus
            style={styles.modalInput}
            returnKeyType="done"
            onSubmitEditing={onAddCustom}
          />
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => { setAddInput(''); setAddOpen(false); }} style={[styles.modalBtn, styles.modalCancel]}>
              <Text style={styles.modalCancelText}>キャンセル</Text>
            </Pressable>
            <Pressable
              onPress={onAddCustom}
              disabled={!addInput.trim()}
              style={[styles.modalBtn, styles.modalOk, !addInput.trim() && { opacity: 0.4 }]}
            >
              <Text style={styles.modalOkText}>追加</Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 40 },
  sectionLabel: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.8, fontWeight: '500' },
  sectionSub: { fontSize: 11, color: theme.textSec, marginTop: 4 },
  card: { marginTop: 8, backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.border, borderRadius: 8 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  rowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  rowLabel: { fontSize: 14, color: theme.text, letterSpacing: -0.1 },
  rowSub: { fontSize: 11, color: theme.textSec, marginTop: 2 },
  check: { fontFamily: FONT.mono, fontSize: 14, color: theme.text, fontWeight: '600' },
  delBtn: { padding: 4 },
  addRow: { justifyContent: 'center' },
  addText: { fontSize: 13, color: theme.textSec, fontWeight: '500' },
  resetBtn: { paddingVertical: 14, alignItems: 'center' },
  resetText: { color: theme.warn, fontSize: 14, fontWeight: '500' },
  onboardBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 },
  onboardText: { color: theme.text, fontSize: 14, fontWeight: '500' },
  onboardArrow: { fontFamily: FONT.mono, fontSize: 14, color: theme.textSec },
  ver: { marginTop: 40, textAlign: 'center', fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.3 },
  devBtn: { paddingHorizontal: 14, paddingVertical: 14, borderStyle: 'dashed', borderColor: theme.borderStrong },
  devBtnText: { color: theme.text, fontSize: 13, fontWeight: '600', fontFamily: FONT.mono, letterSpacing: 0.5 },
  devBtnSub: { color: theme.textTer, fontSize: 11, marginTop: 3, fontFamily: FONT.mono, letterSpacing: 0.3 },
  // Modal
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 24 },
  modalCard: { backgroundColor: theme.bg, borderRadius: 12, padding: 20 },
  modalLabel: { fontSize: 16, fontWeight: '700', color: theme.text, letterSpacing: -0.2 },
  modalSub: { fontSize: 11, color: theme.textSec, marginTop: 4, lineHeight: 16 },
  modalInput: { marginTop: 14, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: theme.borderStrong, borderRadius: 8, fontSize: 14, color: theme.text, backgroundColor: theme.surface },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  modalCancel: { backgroundColor: 'transparent', borderWidth: 1, borderColor: theme.border },
  modalCancelText: { color: theme.textSec, fontSize: 13, fontWeight: '500' },
  modalOk: { backgroundColor: theme.text },
  modalOkText: { color: theme.bg, fontSize: 13, fontWeight: '600' },
  rowArrow: { fontFamily: FONT.mono, fontSize: 14, color: theme.textSec },
});

const SCREEN_H = Dimensions.get('window').height;

const ex = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: theme.bg, borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingHorizontal: 20, paddingBottom: 36, maxHeight: SCREEN_H * 0.82 },
  handle: { width: 36, height: 4, backgroundColor: theme.border, borderRadius: 2, alignSelf: 'center', marginTop: 10, marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: theme.text, letterSpacing: -0.3, marginBottom: 16 },
  // Mode tabs
  tabs: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  tab: { flex: 1, paddingVertical: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 6, alignItems: 'center', backgroundColor: theme.surface },
  tabOn: { backgroundColor: theme.text, borderColor: theme.text },
  tabText: { fontSize: 12, color: theme.text, fontWeight: '500' },
  tabTextOn: { color: theme.bg, fontWeight: '600' },
  // Content areas
  content: { paddingVertical: 12 },
  countText: { fontSize: 14, color: theme.text, fontWeight: '500', marginTop: 12 },
  contentSub: { fontSize: 12, color: theme.textSec, marginTop: 6, lineHeight: 18 },
  // Period chips
  periodChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: theme.border, borderRadius: 20, backgroundColor: theme.surface },
  chipOn: { backgroundColor: theme.text, borderColor: theme.text },
  chipText: { fontSize: 13, color: theme.text, fontWeight: '500' },
  chipTextOn: { color: theme.bg },
  // Round picker
  roundList: { maxHeight: SCREEN_H * 0.38, borderWidth: 1, borderColor: theme.border, borderRadius: 8, backgroundColor: theme.surface },
  roundRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, gap: 8 },
  roundBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.border },
  roundRowOn: { backgroundColor: theme.surface },
  roundCheck: { width: 18, height: 18, borderRadius: 4, borderWidth: 1.5, borderColor: theme.borderStrong, alignItems: 'center', justifyContent: 'center' },
  roundCheckOn: { backgroundColor: theme.bg, borderColor: theme.text },
  roundDate: { fontFamily: FONT.mono, fontSize: 11, color: theme.textSec, width: 36 },
  roundName: { flex: 1, fontSize: 12, color: theme.text },
  roundScore: { fontFamily: FONT.mono, fontSize: 14, fontWeight: '500', color: theme.text },
  roundDiff: { fontFamily: FONT.mono, fontSize: 11, width: 34, textAlign: 'right' },
  selectedCount: { fontFamily: FONT.mono, fontSize: 10, color: theme.textTer, letterSpacing: 0.5, marginTop: 8, textAlign: 'right' },
  // Actions
  actions: { flexDirection: 'row', gap: 8, marginTop: 20 },
  actionBtn: { flex: 1, paddingVertical: 13, borderRadius: 8, alignItems: 'center' },
  actionCancel: { borderWidth: 1, borderColor: theme.border },
  actionCancelText: { color: theme.textSec, fontSize: 13, fontWeight: '500' },
  actionOk: { backgroundColor: theme.text },
  actionOkText: { color: theme.bg, fontSize: 13, fontWeight: '600' },
});
