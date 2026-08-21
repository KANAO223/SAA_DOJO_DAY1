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
//  ⚠ 新しいCSSは書かない。用意された選択肢から選ぶこと。
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

// ═══════════════════════════════════════════════════════════

/** 空想路線1本ぶんのデータ（項目は5つまで） */
type Rosen = {
  id: string;
  title: string;     // 路線名
  stage: string;     // いまの段階
  stations: string;  // 通る駅
  date: string;      // YYYY-MM-DD（思いついた日）
  done: boolean;     // できあがったか
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
  { id: "s01", title: "そうぞう1号線",    stage: "駅えらび",   stations: "田端 → 王子 → 赤羽",           date: ago(0),  done: false },
  { id: "s02", title: "きたぐちシャトル",  stage: "駅えらび",   stations: "十条 → 板橋 → 大塚",            date: ago(1),  done: false },
  { id: "s03", title: "かもめライン",      stage: "駅えらび",   stations: "大井町 → 大森 → 蒲田",          date: ago(2),  done: false },
  { id: "s04", title: "したまち急行",      stage: "ルートぎめ", stations: "錦糸町 → 亀戸 → 平井／つなぎ方 まよい中", date: ago(4),  done: false },
  { id: "s05", title: "ぐるっと環状線",    stage: "ルートぎめ", stations: "高円寺 → 阿佐ケ谷 → 荻窪",      date: ago(6),  done: false },
  { id: "s06", title: "ゆめのかけはし線",  stage: "ルートぎめ", stations: "日暮里 → 三河島 → 南千住",      date: ago(9),  done: false },
  { id: "s07", title: "あさひ快速",        stage: "下書き",     stations: "大崎 → 五反田 → 目黒",          date: ago(11), done: false },
  { id: "s08", title: "かわぞい線",        stage: "下書き",     stations: "小岩 → 新小岩 → 亀戸",          date: ago(13), done: false },
  { id: "s09", title: "そうぞう2号線",     stage: "下書き",     stations: "巣鴨 → 駒込 → 田端／1号線とつなぐ", date: ago(16), done: false },
  { id: "s10", title: "みなとゆき",        stage: "清書ずみ",   stations: "浜松町 → 田町 → 品川",          date: ago(18), done: true },
  { id: "s11", title: "にしぐち線",        stage: "清書ずみ",   stations: "中野 → 東中野 → 大久保",        date: ago(20), done: true },
  { id: "s12", title: "はじめての1本",     stage: "清書ずみ",   stations: "池袋 → 目白 → 高田馬場",        date: ago(21), done: true },
];

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

  const [form, setForm] = useState({ title: "", stage: CATEGORIES[0], stations: "", date: today() });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      setItems(raw ? (JSON.parse(raw) as Rosen[]) : SAMPLE);
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
      .filter((i) => !k || (i.title + i.stations + i.stage).toLowerCase().includes(k))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [items, filter, q]);

  const groups = useMemo(() => grouped(shown, filter), [shown, filter]);

  function resetForm() {
    setForm({ title: "", stage: CATEGORIES[0], stations: "", date: today() });
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
                <div>できあがったら、行の「{TEXT.toTo}」を おしてください。</div>
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
                        return (
                          <div className="row" key={r.id}>
                            <div className="row-main">
                              <div className="row-title">{r.title}</div>
                              {r.stations && <div className="row-sub">{r.stations}</div>}
                            </div>
                            <div className="row-meta">
                              {b && <span className={`badge badge-${b.kind}`}>{b.text}</span>}
                              {!(LAYOUT === "stage" && filter === "open") && (
                                <span className="badge">{r.stage}</span>
                              )}
                              <span className="row-time">{r.date.slice(5).replace("-", "/")}</span>
                              <button className="btn-ghost" onClick={() => startEdit(r)}>なおす</button>
                              <button className="btn-ghost" onClick={() => toggle(r.id)}>
                                {r.done ? TEXT.toBack : TEXT.toTo}
                              </button>
                              <button className="btn-ghost danger-btn" onClick={() => remove(r.id)}>けす</button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))
                )}
              </div>
              <p className="note">データはこの端末のブラウザにだけ保存されます。外部には送信されません。</p>
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
                <label className="label" htmlFor="f-stations">通る駅</label>
                <textarea id="f-stations" className="field" value={form.stations}
                  onChange={(e) => setForm({ ...form, stations: e.target.value })}
                  placeholder="田端 → 王子 → 赤羽 → 十条" />
                <span className="hint">思いついた順に ならべて書きます。あとから なおせます</span>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
