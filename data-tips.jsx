// data-tips.jsx — rotating tips attached to each focus metric
// Sources: PGA tour pros, Japanese pros, club champions, general wisdom
// Rotated by date so the home screen feels fresh day-to-day.

const FOCUS_TIPS = {
  'ボギーオン率': [
    { who: 'PGA / Scottie Scheffler', q: 'ティーショットはフェアウェイ、セカンドはグリーン中央。スコアの9割はこの二つで決まる。', tag: 'PGAツアー' },
    { who: '石川遼', q: 'ボギーオンは守りじゃない。攻め方を変えた「結果」。狙いはいつもピン。', tag: '日本ツアー' },
    { who: '関東アマ クラチャン 山田さん', q: '150Y残せば乗る。だからティーショットは150Y残すための番手で打つ。', tag: 'クラチャン' },
    { who: 'コーチング Tip', q: 'パー4の2打目は「乗せる」より「手前5歩」。乗らなくても寄せワン圏内。', tag: 'コーチ' },
  ],
  '3パット率': [
    { who: 'Rory McIlroy', q: 'ロングパットは「距離」が9割、ラインは1割。入れに行かず、半径1mに寄せる。', tag: 'PGAツアー' },
    { who: '松山英樹', q: '練習グリーンで1番やるのは、10mの距離感。これが崩れると全部崩れる。', tag: '日本ツアー' },
    { who: '関西クラチャン 佐藤さん', q: '3パットの8割は「最初のパットの距離ミス」。2打目を5歩以内に置けるかが全て。', tag: 'クラチャン' },
    { who: 'コーチング Tip', q: 'カップの30cm先を通す強さで打つ。ショートは絶対入らない。', tag: 'コーチ' },
  ],
  'OB率': [
    { who: 'Tiger Woods', q: 'ドライバーは「飛ばす」じゃなく「使える位置に置く」クラブ。迷ったら3Wでいい。', tag: 'PGAツアー' },
    { who: '横田真一', q: 'OBが出るホールは、ティーから絵が見えてない。まず絵を描いてから素振り。', tag: '日本プロ' },
    { who: '関東クラチャン 鈴木さん', q: '朝イチOBの9割はアドレス。ゆっくり立って、ゆっくり構える。', tag: 'クラチャン' },
    { who: 'コーチング Tip', q: '右OBが多い日は、ティーを右端に刺してフェアウェイ左半分を広く見る。', tag: 'コーチ' },
  ],
  'パーオン率': [
    { who: 'Jon Rahm', q: '150Y以内は「狙う」、150Y超は「外さない」。これだけでパーオン率は上がる。', tag: 'PGAツアー' },
    { who: '岩井ツインズ', q: 'パーオン率を上げる最短距離は、ティーショットの残り距離を10Y縮めること。', tag: '日本ツアー' },
    { who: '関東アマ クラチャン 田中さん', q: 'アイアンは「ピンまで」じゃなく「グリーンのどこで止めるか」で打つ番手が決まる。', tag: 'クラチャン' },
    { who: 'コーチング Tip', q: 'グリーンの一番広いところを狙う。ピンは無視する日を作る。', tag: 'コーチ' },
  ],
  'パット数': [
    { who: 'Brad Faxon', q: 'パットは技術半分、ルーチン半分。入れたい気持ちを抜く練習がいる。', tag: 'PGAツアー' },
    { who: '谷原秀人', q: '1mは入る前提でラインを読む。その方が振り切れる。', tag: '日本ツアー' },
    { who: '関東クラチャン 高橋さん', q: 'ラウンド前に1.5mを10本連続で入れてからスタート。これで一日もつ。', tag: 'クラチャン' },
    { who: 'コーチング Tip', q: '練習は「長い距離で距離感」→「短い距離で真っ直ぐ」の順に。', tag: 'コーチ' },
  ],
  '寄せワン率': [
    { who: 'Phil Mickelson', q: 'アプローチは「どこに落として、どう転がすか」を決めてから番手を選ぶ。', tag: 'PGAツアー' },
    { who: '宮里優作', q: '30Y以内はパターで転がせるなら転がす。空中より地面のほうが計算しやすい。', tag: '日本ツアー' },
    { who: '関西アマ クラチャン 中村さん', q: '寄せワンは「乗せる」より「下りを避ける」。上りのパットを残せば入る。', tag: 'クラチャン' },
    { who: 'コーチング Tip', q: 'ウェッジ1本でラウンドを回ってみると、状況判断が上手くなる。', tag: 'コーチ' },
  ],
};

// Pick a tip deterministically from today's date so the card changes daily
function pickTip(focusKey, seed = null) {
  const tips = FOCUS_TIPS[focusKey] || FOCUS_TIPS['ボギーオン率'];
  const day = seed ?? Math.floor((new Date()).getTime() / (1000 * 60 * 60 * 24));
  return tips[day % tips.length];
}

// Drill progress stub, keyed by focus metric
const FOCUS_DRILL_PROGRESS = {
  'ボギーオン率':  { drill: '150Y以内 グリーン乗せ',   done: 3, total: 5, accuracy: 62, streak: 2 },
  '3パット率':     { drill: 'ロングパット 距離感',      done: 2, total: 4, accuracy: 71, streak: 4 },
  'OB率':          { drill: 'ティーショット方向性',      done: 1, total: 4, accuracy: 48, streak: 1 },
  'パーオン率':    { drill: 'セカンド 140-170Y',       done: 4, total: 6, accuracy: 58, streak: 3 },
  'パット数':      { drill: '1.5m パター確実性',        done: 3, total: 5, accuracy: 82, streak: 5 },
  '寄せワン率':    { drill: 'グリーン周り 30Y 以内',    done: 2, total: 5, accuracy: 55, streak: 2 },
};

Object.assign(window, { FOCUS_TIPS, pickTip, FOCUS_DRILL_PROGRESS });
