// src/data/tips.js — subset of HTML FOCUS_TIPS, rotating daily
export const FOCUS_TIPS = {
  'ボギーオン率': [
    { who: 'PGA / Scottie Scheffler', q: 'ティーショットはフェアウェイ、セカンドはグリーン中央。スコアの9割はこの二つで決まる。', tag: 'PGAツアー' },
    { who: '石川遼', q: 'ボギーオンは守りじゃない。攻め方を変えた「結果」。狙いはいつもピン。', tag: '日本ツアー' },
    { who: 'コーチング Tip', q: 'パー4の2打目は「乗せる」より「手前5歩」。乗らなくても寄せワン圏内。', tag: 'コーチ' },
  ],
  '3パット率': [
    { who: 'Rory McIlroy', q: 'ロングパットは「距離」が9割、ラインは1割。入れに行かず、半径1mに寄せる。', tag: 'PGAツアー' },
    { who: '松山英樹', q: '練習グリーンで1番やるのは、10mの距離感。これが崩れると全部崩れる。', tag: '日本ツアー' },
    { who: 'コーチング Tip', q: 'カップの30cm先を通す強さで打つ。ショートは絶対入らない。', tag: 'コーチ' },
  ],
  'OB率': [
    { who: 'Tiger Woods', q: 'ドライバーは「飛ばす」じゃなく「使える位置に置く」クラブ。迷ったら3Wでいい。', tag: 'PGAツアー' },
    { who: '横田真一', q: 'OBが出るホールは、ティーから絵が見えてない。まず絵を描いてから素振り。', tag: '日本プロ' },
    { who: 'コーチング Tip', q: '右OBが多い日は、ティーを右端に刺してフェアウェイ左半分を広く見る。', tag: 'コーチ' },
  ],
  'パーオン率': [
    { who: 'Jon Rahm', q: '150Y以内は「狙う」、150Y超は「外さない」。これだけでパーオン率は上がる。', tag: 'PGAツアー' },
    { who: '岩井ツインズ', q: 'パーオン率を上げる最短距離は、ティーショットの残り距離を10Y縮めること。', tag: '日本ツアー' },
    { who: 'コーチング Tip', q: 'グリーンの一番広いところを狙う。ピンは無視する日を作る。', tag: 'コーチ' },
  ],
  'パット数': [
    { who: 'Brad Faxon', q: 'パットは技術半分、ルーチン半分。入れたい気持ちを抜く練習がいる。', tag: 'PGAツアー' },
    { who: '谷原秀人', q: '1mは入る前提でラインを読む。その方が振り切れる。', tag: '日本ツアー' },
    { who: 'コーチング Tip', q: '練習は「長い距離で距離感」→「短い距離で真っ直ぐ」の順に。', tag: 'コーチ' },
  ],
  '寄せワン率': [
    { who: 'Phil Mickelson', q: 'アプローチは「どこに落として、どう転がすか」を決めてから番手を選ぶ。', tag: 'PGAツアー' },
    { who: '宮里優作', q: '30Y以内はパターで転がせるなら転がす。空中より地面のほうが計算しやすい。', tag: '日本ツアー' },
    { who: 'コーチング Tip', q: 'ウェッジ1本でラウンドを回ってみると、状況判断が上手くなる。', tag: 'コーチ' },
  ],
};

export function pickTip(focusKey) {
  const list = FOCUS_TIPS[focusKey] || FOCUS_TIPS['パーオン率'];
  // Rotate daily by day-of-year
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  const day = Math.floor(diff / oneDay);
  return list[day % list.length];
}
