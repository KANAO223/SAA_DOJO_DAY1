// ─────────────────────────────────────────────────────────
// 空想路線ノート ── 考えた路線を1本ずつ登録して、
// どの段階で止まっているかを一覧で見る画面です。
//
// 画面の骨格（この形は崩さない）:
//   左メニュー（.side）＋ 上部バー（.topbar）＋ 本体（.content）
//   一覧 / 新規登録 / 設定 の3画面を view で切り替える
// ─────────────────────────────────────────────────────────
"use client";

import { useEffect, useMemo, useState } from "react";

// ═══════════════════════════════════════════════════════════
//  画面の型 ── docs/03_spec.md「0. 画面の型」のとおりに設定
//  ⚠ 新しい色は書かない。用意された選択肢から選ぶこと。
// ═══════════════════════════════════════════════════════════

/** 色み。小学生の遊び・学びの道具なので pine（教育・サービス・その他） */
const TONE = "pine";

/** 密度。1本に40〜60分かかり、1日1本以下。1件が重いので roomy */
const DENSITY = "roomy";

/** 画面の型。「どの段階で止まっているか」が主役なので stage */
const LAYOUT: "queue" | "stage" | "due" = "stage";

/** 数え方。路線は「1本、2本」と数える */
const UNIT = "本";

/** LAYOUT が "stage" なので、これがそのまま「段階」になる（左から順に進む） */
const CATEGORIES = ["駅えらび", "ルートぎめ", "下書き", "清書ずみ"];

/** ルーレットで一度に選ぶ駅の数 */
const SPIN_COUNT = 10;

// ═══════════════════════════════════════════════════════════
//  駅データ ── 東京23区内の「地下鉄以外」の鉄道の駅
//
//  ⚠ 2つ、正直に断っておくこと:
//   1. 23区の全駅ではなく、主な路線からの抜粋です
//   2. 緯度経度はおおよその位置です（数百メートルの誤差があります）。
//      空想の路線をだいたいの位置関係で描くための値で、
//      実際の測量値ではありません
// ═══════════════════════════════════════════════════════════

type Station = { n: string; lat: number; lon: number; line: string };

const STATION_SRC: { line: string; list: [string, number, number][] }[] = [
  {
    line: "JR山手線",
    list: [
      ["東京", 35.681, 139.767], ["有楽町", 35.675, 139.763], ["新橋", 35.666, 139.758],
      ["浜松町", 35.655, 139.757], ["田町", 35.646, 139.748], ["高輪ゲートウェイ", 35.636, 139.740],
      ["品川", 35.628, 139.739], ["大崎", 35.620, 139.728], ["五反田", 35.626, 139.723],
      ["目黒", 35.634, 139.716], ["恵比寿", 35.647, 139.710], ["渋谷", 35.659, 139.701],
      ["原宿", 35.670, 139.703], ["代々木", 35.683, 139.702], ["新宿", 35.690, 139.700],
      ["新大久保", 35.701, 139.700], ["高田馬場", 35.713, 139.704], ["目白", 35.721, 139.706],
      ["池袋", 35.729, 139.711], ["大塚", 35.731, 139.728], ["巣鴨", 35.733, 139.739],
      ["駒込", 35.736, 139.747], ["田端", 35.738, 139.761], ["西日暮里", 35.732, 139.767],
      ["日暮里", 35.728, 139.771], ["鶯谷", 35.721, 139.778], ["上野", 35.714, 139.777],
      ["御徒町", 35.707, 139.774], ["秋葉原", 35.698, 139.773], ["神田", 35.692, 139.771],
    ],
  },
  {
    line: "JR中央線",
    list: [
      ["御茶ノ水", 35.700, 139.765], ["水道橋", 35.702, 139.754], ["飯田橋", 35.702, 139.745],
      ["市ケ谷", 35.692, 139.735], ["四ツ谷", 35.686, 139.730], ["信濃町", 35.680, 139.720],
      ["千駄ケ谷", 35.681, 139.712], ["大久保", 35.701, 139.697], ["東中野", 35.706, 139.684],
      ["中野", 35.706, 139.666], ["高円寺", 35.705, 139.650], ["阿佐ケ谷", 35.705, 139.636],
      ["荻窪", 35.704, 139.620], ["西荻窪", 35.704, 139.599],
    ],
  },
  {
    line: "JR京浜東北線",
    list: [
      ["赤羽", 35.778, 139.721], ["東十条", 35.766, 139.722], ["王子", 35.752, 139.738],
      ["上中里", 35.746, 139.746], ["大井町", 35.606, 139.734], ["大森", 35.588, 139.728],
      ["蒲田", 35.562, 139.716],
    ],
  },
  {
    line: "JR埼京線",
    list: [
      ["十条", 35.762, 139.718], ["板橋", 35.746, 139.719], ["浮間舟渡", 35.792, 139.700],
    ],
  },
  {
    line: "JR総武線",
    list: [
      ["浅草橋", 35.699, 139.786], ["両国", 35.696, 139.793], ["錦糸町", 35.697, 139.814],
      ["亀戸", 35.697, 139.827], ["平井", 35.706, 139.840], ["新小岩", 35.716, 139.858],
      ["小岩", 35.732, 139.881],
    ],
  },
  {
    line: "JR常磐線",
    list: [
      ["三河島", 35.732, 139.780], ["南千住", 35.733, 139.799], ["北千住", 35.749, 139.805],
      ["綾瀬", 35.762, 139.825], ["亀有", 35.764, 139.847], ["金町", 35.767, 139.870],
    ],
  },
  {
    line: "JR京葉線",
    list: [
      ["八丁堀", 35.675, 139.777], ["越中島", 35.667, 139.797], ["潮見", 35.657, 139.815],
      ["新木場", 35.646, 139.827], ["葛西臨海公園", 35.645, 139.860],
    ],
  },
  {
    line: "京成本線",
    list: [
      ["京成上野", 35.711, 139.774], ["新三河島", 35.735, 139.777], ["町屋", 35.744, 139.782],
      ["千住大橋", 35.741, 139.799], ["京成関屋", 35.750, 139.807], ["堀切菖蒲園", 35.750, 139.828],
      ["お花茶屋", 35.748, 139.840], ["青砥", 35.749, 139.856], ["京成高砂", 35.750, 139.866],
    ],
  },
  {
    line: "東武スカイツリーライン",
    list: [
      ["とうきょうスカイツリー", 35.710, 139.813], ["曳舟", 35.716, 139.818], ["東向島", 35.724, 139.818],
      ["鐘ケ淵", 35.731, 139.816], ["堀切", 35.740, 139.812], ["牛田", 35.746, 139.806],
      ["小菅", 35.756, 139.813], ["五反野", 35.766, 139.808], ["梅島", 35.772, 139.799],
      ["西新井", 35.777, 139.792], ["竹ノ塚", 35.792, 139.792],
    ],
  },
  {
    line: "東武東上線",
    list: [
      ["北池袋", 35.738, 139.714], ["下板橋", 35.744, 139.713], ["大山", 35.749, 139.700],
      ["中板橋", 35.754, 139.694], ["ときわ台", 35.759, 139.689], ["上板橋", 35.762, 139.681],
    ],
  },
  {
    line: "西武池袋線",
    list: [
      ["椎名町", 35.727, 139.695], ["東長崎", 35.727, 139.685], ["江古田", 35.735, 139.673],
      ["桜台", 35.738, 139.667], ["練馬", 35.737, 139.654],
    ],
  },
  {
    line: "西武新宿線",
    list: [
      ["西武新宿", 35.694, 139.700], ["下落合", 35.716, 139.700], ["中井", 35.716, 139.690],
      ["新井薬師前", 35.714, 139.673], ["沼袋", 35.719, 139.665], ["野方", 35.722, 139.657],
    ],
  },
  {
    line: "京王線",
    list: [
      ["笹塚", 35.674, 139.667], ["代田橋", 35.673, 139.660], ["明大前", 35.669, 139.652],
      ["下高井戸", 35.667, 139.641], ["桜上水", 35.667, 139.633],
    ],
  },
  {
    line: "京王井の頭線",
    list: [
      ["神泉", 35.657, 139.694], ["駒場東大前", 35.658, 139.685], ["池ノ上", 35.661, 139.678],
      ["下北沢", 35.661, 139.668], ["新代田", 35.661, 139.661], ["東松原", 35.661, 139.654],
    ],
  },
  {
    line: "小田急線",
    list: [
      ["南新宿", 35.685, 139.699], ["参宮橋", 35.678, 139.694], ["代々木八幡", 35.670, 139.692],
      ["代々木上原", 35.669, 139.680], ["東北沢", 35.664, 139.674], ["世田谷代田", 35.657, 139.661],
      ["梅ヶ丘", 35.654, 139.655], ["豪徳寺", 35.652, 139.648], ["経堂", 35.650, 139.638],
    ],
  },
  {
    line: "東急東横線",
    list: [
      ["代官山", 35.648, 139.703], ["中目黒", 35.644, 139.699], ["祐天寺", 35.638, 139.692],
      ["学芸大学", 35.628, 139.685], ["都立大学", 35.620, 139.684], ["自由が丘", 35.607, 139.669],
      ["田園調布", 35.599, 139.668], ["多摩川", 35.591, 139.668],
    ],
  },
  {
    line: "東急目黒線",
    list: [
      ["不動前", 35.627, 139.708], ["武蔵小山", 35.620, 139.703], ["西小山", 35.616, 139.697],
      ["洗足", 35.611, 139.690], ["大岡山", 35.606, 139.685], ["奥沢", 35.603, 139.673],
    ],
  },
  {
    line: "東急大井町線",
    list: [
      ["下神明", 35.605, 139.729], ["戸越公園", 35.607, 139.719], ["中延", 35.606, 139.713],
      ["荏原町", 35.603, 139.709], ["旗の台", 35.601, 139.702], ["北千束", 35.604, 139.690],
      ["緑が丘", 35.602, 139.681], ["九品仏", 35.604, 139.665], ["尾山台", 35.604, 139.660],
      ["等々力", 35.605, 139.652],
    ],
  },
  {
    line: "東急池上線",
    list: [
      ["大崎広小路", 35.622, 139.723], ["戸越銀座", 35.616, 139.717], ["荏原中延", 35.612, 139.712],
      ["長原", 35.598, 139.688], ["洗足池", 35.597, 139.684], ["石川台", 35.594, 139.681],
      ["雪が谷大塚", 35.592, 139.678], ["御嶽山", 35.586, 139.679], ["久が原", 35.581, 139.681],
      ["千鳥町", 35.577, 139.684], ["池上", 35.578, 139.703], ["蓮沼", 35.568, 139.711],
    ],
  },
  {
    line: "京急本線",
    list: [
      ["北品川", 35.622, 139.739], ["新馬場", 35.618, 139.740], ["青物横丁", 35.609, 139.742],
      ["鮫洲", 35.605, 139.742], ["立会川", 35.598, 139.740], ["大森海岸", 35.587, 139.737],
      ["平和島", 35.578, 139.735], ["大森町", 35.573, 139.732], ["梅屋敷", 35.567, 139.730],
      ["京急蒲田", 35.561, 139.723], ["雑色", 35.552, 139.717], ["六郷土手", 35.545, 139.712],
    ],
  },
  {
    line: "りんかい線",
    list: [
      ["品川シーサイド", 35.609, 139.746], ["天王洲アイル", 35.622, 139.750],
      ["東京テレポート", 35.627, 139.779], ["国際展示場", 35.635, 139.793],
    ],
  },
  {
    line: "ゆりかもめ",
    list: [
      ["汐留", 35.663, 139.760], ["竹芝", 35.656, 139.762], ["日の出", 35.650, 139.762],
      ["芝浦ふ頭", 35.643, 139.757], ["お台場海浜公園", 35.629, 139.774], ["台場", 35.627, 139.777],
      ["青海", 35.620, 139.780], ["有明", 35.636, 139.792], ["豊洲", 35.655, 139.796],
    ],
  },
  {
    line: "東京モノレール",
    list: [
      ["大井競馬場前", 35.594, 139.746], ["流通センター", 35.581, 139.752],
      ["昭和島", 35.573, 139.752], ["天空橋", 35.549, 139.750],
    ],
  },
  {
    line: "日暮里・舎人ライナー",
    list: [
      ["赤土小学校前", 35.740, 139.774], ["熊野前", 35.746, 139.772], ["足立小台", 35.755, 139.769],
      ["扇大橋", 35.762, 139.770], ["高野", 35.766, 139.769], ["江北", 35.771, 139.766],
      ["西新井大師西", 35.777, 139.762], ["谷在家", 35.782, 139.765], ["舎人公園", 35.789, 139.767],
      ["舎人", 35.795, 139.770], ["見沼代親水公園", 35.799, 139.770],
    ],
  },
  {
    line: "つくばエクスプレス",
    list: [
      ["新御徒町", 35.706, 139.782], ["浅草", 35.714, 139.792],
      ["青井", 35.775, 139.808], ["六町", 35.788, 139.810],
    ],
  },
];

/** 駅の一覧と、名前から引くための表（同じ名前は最初の1つだけ） */
const STATIONS: Station[] = [];
const STATION_MAP = new Map<string, Station>();
for (const g of STATION_SRC) {
  for (const [n, lat, lon] of g.list) {
    if (STATION_MAP.has(n)) continue;
    const s: Station = { n, lat, lon, line: g.line };
    STATIONS.push(s);
    STATION_MAP.set(n, s);
  }
}

// ═══════════════════════════════════════════════════════════
//  地図（SVG）── ライブラリは使わず、緯度経度から自分で描く
// ═══════════════════════════════════════════════════════════

const COS = Math.cos((35.67 * Math.PI) / 180);
const LAT_MIN = Math.min(...STATIONS.map((s) => s.lat));
const LAT_MAX = Math.max(...STATIONS.map((s) => s.lat));
const LON_MIN = Math.min(...STATIONS.map((s) => s.lon));
const LON_MAX = Math.max(...STATIONS.map((s) => s.lon));

const PAD = 18;
const VW = 640;
const VH = Math.round(
  (VW - 2 * PAD) * ((LAT_MAX - LAT_MIN) / ((LON_MAX - LON_MIN) * COS)) + 2 * PAD
);

const px = (s: Station) => PAD + ((s.lon - LON_MIN) / (LON_MAX - LON_MIN)) * (VW - 2 * PAD);
const py = (s: Station) => PAD + ((LAT_MAX - s.lat) / (LAT_MAX - LAT_MIN)) * (VH - 2 * PAD);

/** 2駅のあいだのだいたいの距離（km） */
function kmBetween(a: Station, b: Station) {
  const x = (b.lon - a.lon) * COS;
  const y = b.lat - a.lat;
  return Math.sqrt(x * x + y * y) * 111.32;
}

/** 路線ぜんたいのだいたいの長さ（km） */
function totalKm(names: string[]) {
  const pts = names.map((n) => STATION_MAP.get(n)).filter((s): s is Station => !!s);
  let sum = 0;
  for (let i = 1; i < pts.length; i++) sum += kmBetween(pts[i - 1], pts[i]);
  return sum;
}

/** 路線図。全駅をうすい点で、選んだ駅を線でつないで描く */
function RouteMap({ names }: { names: string[] }) {
  const pts = names.map((n) => STATION_MAP.get(n)).filter((s): s is Station => !!s);
  return (
    <svg
      className="map-figure"
      viewBox={`0 0 ${VW} ${VH}`}
      role="img"
      aria-label={pts.length ? `${pts.map((p) => p.n).join("、")} をつなぐ路線図` : "路線図"}
    >
      {STATIONS.map((s) => (
        <circle key={s.n} cx={px(s)} cy={py(s)} r={1.6} fill="var(--border-strong)" />
      ))}
      {pts.length > 1 && (
        <polyline
          points={pts.map((s) => `${px(s)},${py(s)}`).join(" ")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={3}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      {pts.map((s, i) => (
        <g key={`${s.n}-${i}`}>
          <circle cx={px(s)} cy={py(s)} r={8} fill="var(--surface)" stroke="var(--accent)" strokeWidth={2.2} />
          <text
            x={px(s)}
            y={py(s) + 3.2}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            fill="var(--accent)"
          >
            {i + 1}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
//  ルーレットと、最短経路の計算
// ═══════════════════════════════════════════════════════════

/** ルーレット。駅をかぶらないように n 駅えらぶ */
function spin(n: number): string[] {
  const pool = STATIONS.map((s) => s.n);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(n, pool.length));
}

/**
 * 選んだ駅を「いちばん短くつなげる順番」に並べ替える。
 * 11駅までは総当たり（Held-Karp）で厳密に、それより多いときは
 * 近い駅から順につないでから 2-opt で直す。
 */
function shortestOrder(names: string[]): string[] {
  const pts = names.map((n) => STATION_MAP.get(n)).filter((s): s is Station => !!s);
  const unknown = names.filter((n) => !STATION_MAP.has(n));
  const n = pts.length;
  if (n <= 2) return [...pts.map((s) => s.n), ...unknown];

  const d: number[][] = pts.map((a) => pts.map((b) => kmBetween(a, b)));
  let order: number[];

  if (n <= 11) {
    // Held-Karp。dp[集合][最後にいる駅] = そこまでの最短の長さ
    const full = 1 << n;
    const dp = new Float64Array(full * n).fill(Infinity);
    const prev = new Int8Array(full * n).fill(-1);
    for (let i = 0; i < n; i++) dp[(1 << i) * n + i] = 0;
    for (let m = 1; m < full; m++) {
      for (let last = 0; last < n; last++) {
        if (!(m & (1 << last))) continue;
        const cur = dp[m * n + last];
        if (!isFinite(cur)) continue;
        for (let next = 0; next < n; next++) {
          if (m & (1 << next)) continue;
          const nm = m | (1 << next);
          const v = cur + d[last][next];
          if (v < dp[nm * n + next]) {
            dp[nm * n + next] = v;
            prev[nm * n + next] = last;
          }
        }
      }
    }
    let best = Infinity;
    let end = 0;
    for (let i = 0; i < n; i++) {
      if (dp[(full - 1) * n + i] < best) {
        best = dp[(full - 1) * n + i];
        end = i;
      }
    }
    order = [];
    let mask = full - 1;
    let cur = end;
    while (cur >= 0) {
      order.push(cur);
      const p = prev[mask * n + cur];
      mask ^= 1 << cur;
      cur = p;
    }
    order.reverse();
  } else {
    // 近い駅から順につなぐ（いちばん短くなる出発駅をえらぶ）
    let bestLen = Infinity;
    order = [];
    for (let start = 0; start < n; start++) {
      const used = new Array<boolean>(n).fill(false);
      const path = [start];
      used[start] = true;
      let len = 0;
      for (let k = 1; k < n; k++) {
        let nx = -1;
        let nd = Infinity;
        for (let i = 0; i < n; i++) {
          if (!used[i] && d[path[k - 1]][i] < nd) {
            nd = d[path[k - 1]][i];
            nx = i;
          }
        }
        used[nx] = true;
        path.push(nx);
        len += nd;
      }
      if (len < bestLen) {
        bestLen = len;
        order = path;
      }
    }
    // 2-opt。交差しているところをほどく
    for (let pass = 0; pass < 40; pass++) {
      let improved = false;
      for (let i = 0; i < order.length - 2; i++) {
        for (let j = i + 2; j < order.length; j++) {
          const before =
            d[order[i]][order[i + 1]] + (j + 1 < order.length ? d[order[j]][order[j + 1]] : 0);
          const after =
            d[order[i]][order[j]] + (j + 1 < order.length ? d[order[i + 1]][order[j + 1]] : 0);
          if (after < before - 1e-9) {
            const seg = order.slice(i + 1, j + 1).reverse();
            order.splice(i + 1, seg.length, ...seg);
            improved = true;
          }
        }
      }
      if (!improved) break;
    }
  }

  return [...order.map((i) => pts[i].n), ...unknown];
}

// ═══════════════════════════════════════════════════════════

/** 空想路線1本ぶんのデータ（項目は5つまで） */
type Rosen = {
  id: string;
  title: string;      // 路線名
  stage: string;      // いまの段階
  stations: string[]; // 通る駅（順番どおり）
  date: string;       // YYYY-MM-DD（思いついた日）
  done: boolean;      // できあがったか
};

type View = "list" | "new" | "settings";
type Filter = "open" | "done" | "all";

const KEY = "rosen-data";
const NAME_KEY = "rosen-appname";

/** 画面の型ごとの言葉。ここを直せば画面じゅうの文言が揃って変わる */
const TEXT = {
  queue: {
    sub: "まだ手をつけていないものが、ふるい順に ならびます",
    open: "つくりかけ", done: "できあがり",
    toTo: "できあがりにする", toBack: "つくりかけに もどす",
    dateLabel: "思いついた日", catLabel: "いまの段階",
    stat2: "3日いじょう ほったらかし",
    headOpen: "つくりかけ（ふるい順）",
  },
  stage: {
    sub: "どの段階で とまっているかが わかります",
    open: "つくりかけ", done: "できあがり",
    toTo: "できあがりにする", toBack: "つくりかけに もどす",
    dateLabel: "思いついた日", catLabel: "いまの段階",
    stat2: "7日いじょう ほったらかし",
    headOpen: "つくりかけ",
  },
  due: {
    sub: "しめきりが ちかい順に ならびます",
    open: "まだ", done: "できあがり",
    toTo: "できあがりにする", toBack: "つくりかけに もどす",
    dateLabel: "しめきり", catLabel: "しゅるい",
    stat2: "しめきり ぎれ",
    headOpen: "まだ（しめきりが ちかい順）",
  },
}[LAYOUT];

/** n日前の日付。マイナスを渡すとn日後 */
const ago = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
const today = () => ago(0);

/** 今日との差。0=今日、-3=3日過ぎている、+2=あと2日 */
const diff = (d: string) =>
  Math.round(
    (new Date(d + "T00:00:00").getTime() - new Date(today() + "T00:00:00").getTime()) / 86400000
  );

/** 何日そのままか */
const waiting = (d: string) => Math.max(0, -diff(d));

/**
 * 見本データ。12本（つくりかけ9・できあがり3）。
 * 駅名は実在のものを使い、人名・連絡先は使わない。
 */
const SAMPLE: Rosen[] = [
  { id: "s01", title: "そうぞう1号線",   stage: "駅えらび",   stations: ["田端", "王子", "赤羽"],           date: ago(0),  done: false },
  { id: "s02", title: "きたぐちシャトル", stage: "駅えらび",   stations: ["十条", "板橋", "大塚"],            date: ago(1),  done: false },
  { id: "s03", title: "かもめライン",     stage: "駅えらび",   stations: ["大井町", "大森", "蒲田"],          date: ago(2),  done: false },
  { id: "s04", title: "したまち急行",     stage: "ルートぎめ", stations: ["錦糸町", "亀戸", "平井"],          date: ago(4),  done: false },
  { id: "s05", title: "ぐるっと環状線",   stage: "ルートぎめ", stations: ["高円寺", "阿佐ケ谷", "荻窪"],      date: ago(6),  done: false },
  { id: "s06", title: "ゆめのかけはし線", stage: "ルートぎめ", stations: ["日暮里", "三河島", "南千住"],      date: ago(9),  done: false },
  { id: "s07", title: "あさひ快速",       stage: "下書き",     stations: ["大崎", "五反田", "目黒"],          date: ago(11), done: false },
  { id: "s08", title: "かわぞい線",       stage: "下書き",     stations: ["小岩", "新小岩", "亀戸"],          date: ago(13), done: false },
  { id: "s09", title: "そうぞう2号線",    stage: "下書き",     stations: ["巣鴨", "駒込", "田端"],            date: ago(16), done: false },
  { id: "s10", title: "みなとゆき",       stage: "清書ずみ",   stations: ["浜松町", "田町", "品川"],          date: ago(18), done: true },
  { id: "s11", title: "にしぐち線",       stage: "清書ずみ",   stations: ["中野", "東中野", "大久保"],        date: ago(20), done: true },
  { id: "s12", title: "はじめての1本",    stage: "清書ずみ",   stations: ["池袋", "目白", "高田馬場"],        date: ago(21), done: true },
];

/**
 * 保存してあったデータを読める形に整える。
 * 前のバージョンは「通る駅」を1本の文字列で持っていたので、区切って配列に直す。
 */
function normalize(raw: unknown): Rosen[] {
  if (!Array.isArray(raw)) return SAMPLE;
  return raw.map((r, i) => {
    const o = r as Partial<Rosen> & { stations?: unknown; name?: string; note?: string };
    const src = o.stations ?? o.note;
    const stations = Array.isArray(src)
      ? src.filter((s): s is string => typeof s === "string")
      : typeof src === "string"
        ? src.split(/[→,、\/／\s]+/).map((s) => s.trim()).filter((s) => STATION_MAP.has(s))
        : [];
    return {
      id: typeof o.id === "string" ? o.id : `r${i}`,
      title: o.title ?? o.name ?? "なまえのない路線",
      stage: CATEGORIES.includes(o.stage ?? "") ? (o.stage as string) : CATEGORIES[0],
      stations,
      date: typeof o.date === "string" ? o.date : today(),
      done: !!o.done,
    };
  });
}

/** 一覧をどう束ねるか。LAYOUT ごとに変わる */
type Group = { key: string; label: string; mark?: "late" | "now"; items: Rosen[] };

function grouped(list: Rosen[], filter: Filter): Group[] {
  const head = filter === "open" ? TEXT.headOpen : filter === "done" ? TEXT.done : "ぜんぶ";

  if (LAYOUT === "stage" && filter === "open") {
    // 段階ごとに束ねる。CATEGORIES の順に並べ、中身が無い段階は出さない
    return CATEGORIES.map((c) => ({
      key: c,
      label: c,
      mark: undefined,
      items: list.filter((i) => i.stage === c),
    })).filter((g) => g.items.length > 0);
  }

  if (LAYOUT === "due" && filter === "open") {
    const buckets: Group[] = [
      { key: "late",  label: "しめきりが すぎている", mark: "late", items: [] },
      { key: "now",   label: "今日・あした",          mark: "now",  items: [] },
      { key: "week",  label: "今週のうち",                          items: [] },
      { key: "later", label: "それいこう",                          items: [] },
    ];
    list.forEach((i) => {
      const d = diff(i.date);
      if (d < 0) buckets[0].items.push(i);
      else if (d <= 1) buckets[1].items.push(i);
      else if (d <= 7) buckets[2].items.push(i);
      else buckets[3].items.push(i);
    });
    return buckets.filter((b) => b.items.length > 0);
  }

  return [{ key: "all", label: head, items: list }];
}

/** 行の右に出す小さなバッジ。何日そのままかを出す */
function rowBadge(r: Rosen): { text: string; kind: "warn" | "danger" } | null {
  if (r.done) return null;
  if (LAYOUT === "due") {
    const d = diff(r.date);
    if (d < 0) return { text: `${-d}日 すぎた`, kind: "danger" };
    if (d === 0) return { text: "今日", kind: "warn" };
    return null;
  }
  const w = waiting(r.date);
  const limit = LAYOUT === "stage" ? 7 : 3;
  return w >= limit ? { text: `${w}日`, kind: "warn" } : null;
}

export default function Home() {
  const [items, setItems] = useState<Rosen[]>([]);
  const [appName, setAppName] = useState("空想路線ノート");
  const [loaded, setLoaded] = useState(false);

  const [view, setView] = useState<View>("list");
  const [filter, setFilter] = useState<Filter>("open");
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<Rosen | null>(null);
  const [openMap, setOpenMap] = useState<string | null>(null);

  const [form, setForm] = useState<{ title: string; stage: string; stations: string[]; date: string }>({
    title: "", stage: CATEGORIES[0], stations: [], date: today(),
  });
  const [pick, setPick] = useState(STATIONS[0].n);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setItems(raw ? normalize(JSON.parse(raw)) : SAMPLE);
      const n = localStorage.getItem(NAME_KEY);
      if (n) setAppName(n);
    } catch {
      setItems(SAMPLE);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(KEY, JSON.stringify(items));
    localStorage.setItem(NAME_KEY, appName);
  }, [items, appName, loaded]);

  // 見本データのまま触っていない状態か（1本でも足す・消すと false になる）
  const isSample = items.length === SAMPLE.length && items.every((i) => i.id.startsWith("s"));

  const counts = useMemo(
    () => ({
      open: items.filter((i) => !i.done).length,
      done: items.filter((i) => i.done).length,
      all: items.length,
    }),
    [items]
  );

  /** 2つ目の数字。何日も動いていない路線の本数 */
  const attention = useMemo(() => {
    const open = items.filter((i) => !i.done);
    if (LAYOUT === "due") return open.filter((i) => diff(i.date) < 0).length;
    const limit = LAYOUT === "stage" ? 7 : 3;
    return open.filter((i) => waiting(i.date) >= limit).length;
  }, [items]);

  const shown = useMemo(() => {
    const k = q.trim().toLowerCase();
    return items
      .filter((i) => (filter === "all" ? true : filter === "open" ? !i.done : i.done))
      .filter((i) => !k || (i.title + i.stations.join(" ") + i.stage).toLowerCase().includes(k))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items, filter, q]);

  const groups = useMemo(() => grouped(shown, filter), [shown, filter]);

  const formKm = useMemo(() => totalKm(form.stations), [form.stations]);

  function resetForm() {
    setForm({ title: "", stage: CATEGORIES[0], stations: [], date: today() });
    setEditing(null);
  }

  function save() {
    const title = form.title.trim();
    if (!title) return;
    if (editing) {
      setItems(items.map((i) => (i.id === editing.id ? { ...i, ...form, title } : i)));
    } else {
      setItems([...items, { id: String(Date.now()), ...form, title, done: false }]);
    }
    resetForm();
    setView("list");
  }

  function startEdit(r: Rosen) {
    setEditing(r);
    setForm({ title: r.title, stage: r.stage, stations: r.stations, date: r.date });
    setView("new");
  }

  const addStation = (n: string) =>
    setForm((f) => (f.stations.includes(n) ? f : { ...f, stations: [...f.stations, n] }));
  const dropStation = (i: number) =>
    setForm((f) => ({ ...f, stations: f.stations.filter((_, k) => k !== i) }));

  const toggle = (id: string) => setItems(items.map((i) => (i.id === id ? { ...i, done: !i.done } : i)));
  const remove = (id: string) => setItems(items.filter((i) => i.id !== id));

  const NAV: { k: View; label: string; count?: number }[] = [
    { k: "list", label: "一覧", count: counts.open },
    { k: "new", label: "新しい路線" },
    { k: "settings", label: "設定" },
  ];

  const titles: { [K in View]: [string, string] } = {
    list: ["一覧", TEXT.sub],
    new: [editing ? "路線をなおす" : "新しい路線", "入れて ほぞんすると、一覧に ふえます"],
    settings: ["設定", "画面の名前を かえる／データを 入れなおす"],
  };

  return (
    <div className="shell" data-tone={TONE} data-density={DENSITY}>
      {/* ───────── 左メニュー ───────── */}
      <nav className="side">
        <div className="side-brand">
          <div className="n">{appName}</div>
          <div className="s">この端末に保存</div>
        </div>
        <div className="side-label">メニュー</div>
        <div className="side-nav">
          {NAV.map((n) => (
            <button
              key={n.k}
              className="side-item"
              aria-current={view === n.k ? "page" : undefined}
              onClick={() => { if (n.k !== "new") resetForm(); setView(n.k); }}
            >
              {n.label}
              {typeof n.count === "number" && <span className="c">{n.count}</span>}
            </button>
          ))}
        </div>
        <div className="side-foot">思いついたら、まず1{UNIT} ふやす</div>
      </nav>

      {/* ───────── 本体 ───────── */}
      <div className="main">
        <header className="topbar">
          <div className="topbar-main">
            <span className="t">{titles[view][0]}</span>
            {view === "list" ? (
              <div className="d topbar-desc">
                <div>{TEXT.sub}</div>
                <div>ずっと とまっている路線には、日数のしるしが つきます。</div>
                <div>行の「ちず」を おすと、その路線を 地図の上で 見られます。</div>
              </div>
            ) : (
              <span className="d">{titles[view][1]}</span>
            )}
          </div>
          {view === "list" && (
            <span className="right">
              <button className="btn" onClick={() => { resetForm(); setView("new"); }}>新しい路線</button>
            </span>
          )}
        </header>

        <div className="content">
          {/* ── 一覧 ── */}
          {view === "list" && (
            <>
              {isSample && (
                <div className="notice">
                  いま出ているのは<b>見本</b>です。そのまま さわって ためせます。
                  けしたいときは、左メニューの<b>設定</b>から。
                </div>
              )}

              <div className="stats">
                <div className="stat"><div className="n accent">{counts.open}</div><div className="l">{TEXT.open}</div></div>
                <div className="stat"><div className="n">{attention}</div><div className="l">{TEXT.stat2}</div></div>
                <div className="stat"><div className="n">{counts.all}</div><div className="l">ぜんぶで</div></div>
              </div>

              <div className="filters">
                <div className="search">
                  <input className="field" value={q} onChange={(e) => setQ(e.target.value)}
                    placeholder="路線の名前・駅の名前で さがす" />
                </div>
                <div className="seg">
                  {(["open", "done", "all"] as Filter[]).map((f) => (
                    <button key={f} aria-pressed={filter === f} onClick={() => setFilter(f)}>
                      {f === "open" ? `${TEXT.open} ${counts.open}`
                        : f === "done" ? `${TEXT.done} ${counts.done}`
                        : `ぜんぶ ${counts.all}`}
                    </button>
                  ))}
                </div>
              </div>

              <div className="list">
                {shown.length === 0 ? (
                  <>
                    <div className="list-head">
                      {filter === "open" ? TEXT.headOpen : filter === "done" ? TEXT.done : "ぜんぶ"}
                      <span className="count">0 {UNIT}</span>
                    </div>
                    <div className="empty">
                      <div className="t">{q ? "見つかりませんでした" : "まだ路線が ありません"}</div>
                      <div className="d">
                        {q
                          ? "さがす言葉を かえてみてください。"
                          : "右上の「新しい路線」から、1本つくれます。"}
                      </div>
                    </div>
                  </>
                ) : (
                  groups.map((g) => (
                    <div key={g.key}>
                      <div className={"group-head" + (g.mark ? ` is-${g.mark}` : "")}>
                        {g.mark && <span className="dot" />}
                        {g.label}
                        <span className="count">{g.items.length} {UNIT}</span>
                      </div>
                      {g.items.map((r) => {
                        const b = rowBadge(r);
                        const len = totalKm(r.stations);
                        return (
                          <div key={r.id}>
                            <div className="row">
                              <div className="row-main">
                                <div className="row-title">{r.title}</div>
                                {r.stations.length > 0 && (
                                  <div className="row-sub">{r.stations.join(" → ")}</div>
                                )}
                              </div>
                              <div className="row-meta">
                                {b && <span className={`badge badge-${b.kind}`}>{b.text}</span>}
                                {!(LAYOUT === "stage" && filter === "open") && (
                                  <span className="badge">{r.stage}</span>
                                )}
                                <span className="badge">
                                  {r.stations.length}駅{len > 0 ? ` やく${len.toFixed(1)}km` : ""}
                                </span>
                                <span className="row-time">{r.date.slice(5).replace("-", "/")}</span>
                                <button className="btn-ghost"
                                  aria-pressed={openMap === r.id}
                                  onClick={() => setOpenMap(openMap === r.id ? null : r.id)}>
                                  ちず
                                </button>
                                <button className="btn-ghost" onClick={() => startEdit(r)}>なおす</button>
                                <button className="btn-ghost" onClick={() => toggle(r.id)}>
                                  {r.done ? TEXT.toBack : TEXT.toTo}
                                </button>
                                <button className="btn-ghost danger-btn" onClick={() => remove(r.id)}>けす</button>
                              </div>
                            </div>
                            {openMap === r.id && (
                              <div className="map-panel">
                                {r.stations.length === 0 ? (
                                  <p className="note">通る駅が まだ入っていません。「なおす」から えらべます。</p>
                                ) : (
                                  <RouteMap names={r.stations} />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              <p className="note">
                データはこの端末のブラウザにだけ保存されます。外部には送信されません。
                地図の駅の位置は おおよそ（数百メートルの ずれが あります）。
              </p>
            </>
          )}

          {/* ── 新規登録・編集 ── */}
          {view === "new" && (
            <div className="panel">
              <div className="form-row">
                <label className="label" htmlFor="f-title">路線の名前<span className="req">ひつよう</span></label>
                <input id="f-title" className="field" value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  onKeyDown={(e) => { if (e.key === "Enter") save(); }}
                  placeholder="れい：そうぞう1号線" />
                <span className="hint">あとで見て どれか わかる名前にします</span>
              </div>

              <div className="form-row">
                <div className="inline">
                  <div>
                    <label className="label" htmlFor="f-stage">{TEXT.catLabel}</label>
                    <select id="f-stage" className="select" value={form.stage}
                      onChange={(e) => setForm({ ...form, stage: e.target.value })}>
                      {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label" htmlFor="f-date">{TEXT.dateLabel}</label>
                    <input id="f-date" className="field" type="date" value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="form-row">
                <label className="label">通る駅</label>
                <div className="inline">
                  <button className="btn-ghost"
                    onClick={() => setForm({ ...form, stations: spin(SPIN_COUNT) })}>
                    ルーレットを まわす（{SPIN_COUNT}駅）
                  </button>
                  <button className="btn-ghost"
                    disabled={form.stations.length < 3}
                    onClick={() => setForm({ ...form, stations: shortestOrder(form.stations) })}>
                    いちばん短い順に ならべる
                  </button>
                </div>

                {form.stations.length === 0 ? (
                  <span className="hint">
                    「ルーレットを まわす」を おすか、下から1駅ずつ えらびます
                  </span>
                ) : (
                  <>
                    <div className="chips">
                      {form.stations.map((n, i) => (
                        <span className="chip" key={`${n}-${i}`}>
                          <span className="i">{i + 1}</span>
                          {n}
                          <button className="x" aria-label={`${n} を はずす`}
                            onClick={() => dropStation(i)}>×</button>
                        </span>
                      ))}
                    </div>
                    <span className="hint">
                      {form.stations.length}駅・ぜんちょう やく {formKm.toFixed(1)}km
                    </span>
                    <RouteMap names={form.stations} />
                  </>
                )}
              </div>

              <div className="form-row">
                <label className="label" htmlFor="f-pick">駅を1つ ふやす</label>
                <div className="inline">
                  <select id="f-pick" className="select" value={pick}
                    onChange={(e) => setPick(e.target.value)}>
                    {STATION_SRC.map((g) => (
                      <optgroup key={g.line} label={g.line}>
                        {g.list
                          .filter(([n]) => STATION_MAP.get(n)?.line === g.line)
                          .map(([n]) => <option key={n} value={n}>{n}</option>)}
                      </optgroup>
                    ))}
                  </select>
                  <button className="btn-ghost" onClick={() => addStation(pick)}>ふやす</button>
                </div>
                <span className="hint">東京23区の、地下鉄いがいの駅から えらべます</span>
              </div>

              <div className="form-actions">
                <button className="btn" onClick={save} disabled={!form.title.trim()}>
                  {editing ? "ほぞんする" : "一覧に ふやす"}
                </button>
                <button className="btn-ghost" onClick={() => { resetForm(); setView("list"); }}>やめる</button>
                <span className="spacer" />
                {editing && (
                  <button className="btn-ghost danger-btn"
                    onClick={() => { remove(editing.id); resetForm(); setView("list"); }}>
                    この1{UNIT}を けす
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── 設定 ── */}
          {view === "settings" && (
            <div className="panel">
              <div className="form-row">
                <label className="label" htmlFor="f-app">画面の名前</label>
                <input id="f-app" className="field" value={appName}
                  onChange={(e) => setAppName(e.target.value)} />
                <span className="hint">左上に出ます。かえると すぐ かわります</span>
              </div>

              <div className="form-row">
                <label className="label">データ</label>
                <div className="inline">
                  <button className="btn-ghost" onClick={() => setItems(SAMPLE)}>見本を入れなおす</button>
                  <button className="btn-ghost danger-btn"
                    onClick={() => { if (confirm("ぜんぶ けします。いいですか？")) setItems([]); }}>
                    ぜんぶ けす
                  </button>
                </div>
                <span className="hint">
                  いま {counts.all} {UNIT}（{TEXT.open} {counts.open} / {TEXT.done} {counts.done}）
                </span>
              </div>

              <p className="note">
                データはこの端末のブラウザにだけ保存されます。
                ほかの端末や 友だちとは 共有されません。
              </p>
              <p className="note">
                えらべる駅は {STATIONS.length}駅（東京23区の 主な路線からの ぬきだし）。
                地図にえがく位置は おおよそで、実際の 測量の 数字では ありません。
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
