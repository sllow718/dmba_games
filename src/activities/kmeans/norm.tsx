import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps, GridProps } from "../../core/types";
import { Owner, Tasks, slipState } from "../../components/ui";
import type { Pt } from "./engine";
import { SPEND_MAX, bestRun, makeShoppers, normalise } from "./engine";
import type { Shopper } from "./data";
import { COLORS } from "./ui";

/**
 * Three ways to draw the same members:
 * chart — visits and spend on their own axes, the way people usually plot them;
 * seen  — 1 visit drawn the same length as $1, which is how raw distances treat them;
 * norm  — both rescaled to 0–1.
 */
export type View = "chart" | "seen" | "norm";

const W = 356, H = 300, L = 58, R = 12, T = 10, B = 34;

interface Axis { max: number; ticks: number[]; fmt: (v: number) => string; title: string }
const AXES: Record<View, [Axis, Axis]> = {
  chart: [
    { max: 30, ticks: [0, 10, 20, 30], fmt: String, title: "Visits per month →" },
    { max: SPEND_MAX, ticks: [0, 500, 1000, 1500, 2000], fmt: (v) => `$${v}`, title: "Yearly spend →" },
  ],
  seen: [
    { max: SPEND_MAX, ticks: [0, 500, 1000, 1500, 2000], fmt: String, title: "Visits per month (same scale as $) →" },
    { max: SPEND_MAX, ticks: [0, 500, 1000, 1500, 2000], fmt: (v) => `$${v}`, title: "Yearly spend →" },
  ],
  norm: [
    { max: 1, ticks: [0, 0.5, 1], fmt: String, title: "Visits, normalised 0–1 →" },
    { max: 1, ticks: [0, 0.5, 1], fmt: String, title: "Spend, normalised 0–1 →" },
  ],
};

export interface Note {
  title: string;
  lines: string[];
  /** Point (in raw visits/spend) for an arrow from the note, e.g. the squashed strip. */
  arrowTo?: Pt;
}

/** A scatter plot frame for one view; `place` maps a member's raw (visits, spend) to the screen. */
function Frame({ view, label, note, children }: { view: View; label: string; note?: Note; children: (place: (p: Pt, normed?: Pt) => [number, number]) => ReactNode }) {
  const [ax, ay] = AXES[view];
  // Room for the title, the lines and a gap before the plot starts.
  const noteH = note ? 48 + note.lines.length * 15 : 0;
  const top = T + noteH, height = H + noteH;
  const sx = (v: number) => L + (v / ax.max) * (W - L - R);
  const sy = (v: number) => top + (1 - v / ay.max) * (height - top - B);
  const place = (p: Pt, normed?: Pt): [number, number] => (view === "norm" && normed ? [sx(normed.x), sy(normed.y)] : [sx(p.x), sy(p.y)]);
  return (
    <svg className="kplot" viewBox={`0 0 ${W} ${height}`} role="img" aria-label={label}>
      <g className="axes" aria-hidden="true">
        {ax.ticks.map((t) => (
          <g key={"x" + t}>
            <line x1={sx(t)} x2={sx(t)} y1={sy(0)} y2={sy(ay.max)} className="gridline" />
            <text x={sx(t)} y={sy(0) + 14} textAnchor="middle">{ax.fmt(t)}</text>
          </g>
        ))}
        {ay.ticks.map((t) => (
          <g key={"y" + t}>
            <line x1={sx(0)} x2={sx(ax.max)} y1={sy(t)} y2={sy(t)} className="gridline" />
            <text x={sx(0) - 12} y={sy(t) + 4} textAnchor="end">{ay.fmt(t)}</text>
          </g>
        ))}
        <text x={(sx(0) + sx(ax.max)) / 2} y={height - 2} textAnchor="middle" className="axis-title">{ax.title}</text>
        <text x={10} y={(sy(0) + sy(ay.max)) / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 10 ${(sy(0) + sy(ay.max)) / 2})`}>{ay.title}</text>
      </g>
      {children(place)}
      {note && <NotePanel note={note} height={noteH} target={note.arrowTo && place(note.arrowTo)} />}
    </svg>
  );
}

/** The walkthrough note at the top of the chart. */
function NotePanel({ note, height, target }: { note: Note; height: number; target?: [number, number] }) {
  const x0 = 6, y0 = 4, w = W - 12, h = height - 18;
  return (
    <g className="seen-note" role="note" aria-label={`${note.title}. ${note.lines.join(" ")}`}>
      <rect x={x0} y={y0} width={w} height={h} rx={8} />
      <text x={x0 + 10} y={y0 + 18} className="hd">{note.title}</text>
      {note.lines.map((l, i) => <text key={i} x={x0 + 10} y={y0 + 36 + i * 15}>{l}</text>)}
      {target && (
        <>
          <path d={`M ${x0 + 70} ${y0 + h} Q ${target[0] + 40} ${y0 + h + 10} ${target[0] + 7} ${target[1]}`} className="arrow" markerEnd="url(#seen-arrow)" />
          <defs>
            <marker id="seen-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>
        </>
      )}
    </g>
  );
}

const VIEW_NOTE: Record<View, string> = {
  chart: "Visits and spend each on their own scale.",
  seen: "How raw distances see it: 1 visit counts the same as $1, so every member's visits squash into a thin strip.",
  norm: "Both variables rescaled to run from 0 to 1, so each counts fairly.",
};

/* Lesson chart */

/**
 * Lesson chart tags. View: "seen" (raw distances) or "scaled" (normalised); otherwise the normal chart.
 * Colour: "raw", "norm" or "type" colours every member by that grouping. Select: "raw=1", "norm=0", "type=Casual".
 */
export function hasShopperTag(m: Shopper, tag: string) {
  const g = /^(raw|norm|type)=(\w+)$/.exec(tag);
  if (!g) return ["seen", "scaled", "raw", "norm", "type"].includes(tag);
  return String(m[g[1] as "raw" | "norm" | "type"]) === g[2];
}

/** The 12 lesson members in the view and colouring the highlight asks for. */
export function ShopperPlot({ data, highlight, label }: GridProps<Shopper>) {
  const tags = [...(highlight?.lit ?? []), ...(highlight?.both ?? [])];
  const view: View = tags.includes("seen") ? "seen" : tags.includes("scaled") ? "norm" : "chart";
  const by: "raw" | "norm" | "type" | null = tags.includes("raw") ? "raw" : tags.includes("norm") ? "norm" : tags.includes("type") ? "type" : null;
  const normed = useMemo(() => normalise(data.map((m) => ({ x: m.visits, y: m.spend }))), [data]);
  return (
    <div className="kplot-wrap">
      <Frame view={view} label={label ?? `Scatter plot of ${data.length} members: visits per month and yearly spend`}>
        {(place) => data.map((m, i) => {
          const [x, y] = place({ x: m.visits, y: m.spend }, normed[i]);
          const st = slipState(m, highlight, hasShopperTag);
          // Member types get their own colours (purple, teal) so they never look like a cluster result.
          const colour = by === "type" ? COLORS[m.type === "Casual" ? 3 : 5] : by ? COLORS[m[by]] : "#9aa69a";
          return (
            <g key={m.id} className={"mpt" + (st === "dim" ? " dim" : "")} aria-label={`Member ${m.id}: ${m.visits} visits a month, $${m.spend} a year, ${m.type.toLowerCase()}`}>
              <circle cx={x} cy={y} r={9} fill={colour} />
              <text x={x} y={y + 3.5} textAnchor="middle">{m.id}</text>
            </g>
          );
        })}
      </Frame>
      <p className="worth" style={{ margin: "6px 4px 0" }}>{VIEW_NOTE[view]}</p>
    </div>
  );
}

/* Hands-on lab */

/** Average visits and spend of each cluster, in the members' real units. */
function profiles(points: readonly Pt[], labels: readonly number[]) {
  return [0, 1].map((k) => {
    const mine = points.filter((_, i) => labels[i] === k);
    const avg = (f: (p: Pt) => number) => (mine.length ? mine.reduce((s, p) => s + f(p), 0) / mine.length : 0);
    return { k, size: mine.length, visits: avg((p) => p.x), spend: avg((p) => p.y) };
  });
}

/** The guided walkthrough in the distance view: raw → raw clusters → normalised → normalised clusters. */
const WALK: { scaled: boolean; run: boolean; note: Note }[] = [
  { scaled: false, run: false, note: { title: "Step 1 of 4 · How k-means reads the raw data", arrowTo: { x: 0, y: 1100 }, lines: [
    "1 visit counts the same as $1, so visits (0 to 30)",
    "shrink into this thin strip. K-means can't tell",
    "3 visits from 25 visits: only spend makes a difference.",
  ] } },
  { scaled: false, run: true, note: { title: "Step 2 of 4 · K-means on the raw numbers", arrowTo: { x: 0, y: 1100 }, lines: [
    "The clusters split by spend alone: higher spenders",
    "in one, lower spenders in the other. Casual and",
    "regular members end up mixed in both clusters.",
  ] } },
  { scaled: true, run: false, note: { title: "Step 3 of 4 · Normalise", lines: [
    "Both variables are rescaled to run from 0 to 1.",
    "Now a gap of 25 visits counts as much as a gap",
    "of $1,700 in spend, so the two groups pull apart.",
  ] } },
  { scaled: true, run: true, note: { title: "Step 4 of 4 · K-means on the normalised data", lines: [
    "With both variables counting, k-means separates",
    "casual members (left) from regulars (right).",
    "Press Next to see these clusters on the normal chart.",
  ] } },
];

/* Mission 2: run k-means on the raw numbers, then walk through what normalising changes. */
export function ExploreNormalise({ onDone, done }: ExploreProps<Shopper>) {
  const [n, setN] = useState(40);
  const [seed, setSeed] = useState(3);
  const [scaled, setScaled] = useState(false);
  const [view, setView] = useState<View>("chart");
  const [step, setStep] = useState(0);
  const [labels, setLabels] = useState<number[] | null>(null);
  const [t, setT] = useState({ raw: false, walked: false, compared: false });
  const points = useMemo(() => makeShoppers(n, seed), [n, seed]);
  const normed = useMemo(() => normalise(points), [points]);

  const tick = (nt: typeof t) => { setT(nt); if (!done && nt.raw && nt.walked && nt.compared) onDone(); };
  const cluster = (useScaled: boolean) => {
    const ls = bestRun(useScaled ? normed : points, 2, 8).labels;
    // Number clusters so cluster 1 is always the lower-visit one: colours stay put between runs.
    const lowVisit = profiles(points, ls).sort((a, b) => a.visits - b.visits)[0].k;
    return ls.map((l) => (l === lowVisit ? 0 : 1));
  };
  const goTo = (i: number) => {
    const w = WALK[i];
    setStep(i); setScaled(w.scaled); setLabels(w.run ? cluster(w.scaled) : null);
    if (i === WALK.length - 1) tick({ ...t, walked: true, raw: true });
  };
  const openWalk = () => { setView("seen"); goTo(0); };
  const next = () => {
    if (step < WALK.length - 1) goTo(step + 1);
    else { setView("chart"); tick({ ...t, walked: true, compared: true }); }
  };
  const reset = (f: () => void) => { f(); setLabels(null); };

  const walking = view !== "chart";
  const prof = labels ? profiles(points, labels) : null;
  const visitsGap = prof ? Math.abs(prof[0].visits - prof[1].visits) : 0;
  const say = walking
    ? "Follow the note in the chart, and press Next when you're ready for the next step."
    : !labels
      ? "These members are casual or regular visitors, and spend varies a lot either way. Run k-means with k = 2 and see what it finds."
      : visitsGap > 10
        ? "These are the clusters from the normalised data. They split casual visitors from regulars: both variables counted, and visits turned out to be what separates the groups."
        : <>Look at the averages: both clusters visit about the same number of times. K-means split them by <b>spend</b> only. Open “How k-means measures distance” to see why.</>;

  const effView: View = !walking ? "chart" : scaled ? "norm" : "seen";

  return (
    <>
      <div className="split">
        <div className="stack">
          <Tasks items={[
            { text: "Run k-means on the raw numbers", done: t.raw },
            { text: "Open “How k-means measures distance” and press Next through all 4 steps", done: t.walked },
            { text: "Back on the normal chart, compare the new clusters", done: t.compared },
          ]} />
          <div className="kplot-wrap">
            <Frame view={effView} note={walking ? WALK[step].note : undefined}
              label={`${n} members, ${scaled ? "normalised" : "raw numbers"}, ${labels ? "clustered" : "not clustered yet"}`}>
              {(place) => points.map((p, i) => {
                const [x, y] = place(p, normed[i]);
                return <circle key={i} cx={x} cy={y} r={4.5} className="kp" fill={labels ? COLORS[labels[i]] : "#9aa69a"} />;
              })}
            </Frame>
            {!walking && <p className="worth" style={{ margin: "6px 4px 0" }}>{VIEW_NOTE[effView]}</p>}
          </div>
          {walking && (
            <div className="row">
              <button type="button" className="btn" onClick={next}>{step < WALK.length - 1 ? "Next →" : "Back to the normal chart →"}</button>
              {step > 0 && <button type="button" className="btn alt small" onClick={() => goTo(step - 1)}>← Back a step</button>}
            </div>
          )}
          <div className="seg-row" role="group" aria-label="Chart view">
            <button type="button" className="pick" aria-pressed={!walking} onClick={() => setView("chart")}>Normal chart</button>
            <button type="button" className="pick" aria-pressed={walking} onClick={openWalk}>How k-means measures distance</button>
          </div>
        </div>
        <div className="stack">
          <Owner>{say}</Owner>
          {!walking && (
            <section className="card kcontrols">
              <span className="k">Settings</span>
              <p className="worth" style={{ margin: 0 }}>Normalising is <b>{scaled ? "on" : "off"}</b>.{scaled ? " These clusters come from the walkthrough." : ""}</p>
              <label className="kfield">
                <span>Number of members <b>n = {n}</b></span>
                <input type="range" className="slider" min={10} max={150} step={10} value={n} onChange={(e) => reset(() => { setN(Number(e.target.value)); setScaled(false); })} />
              </label>
              <div className="row">
                <button type="button" className="btn" onClick={() => { setScaled(false); setLabels(cluster(false)); tick({ ...t, raw: true }); }}>Run k-means (k = 2)</button>
                <button type="button" className="btn alt small" onClick={() => reset(() => { setSeed(seed + 1); setScaled(false); })}>New data</button>
              </div>
            </section>
          )}
          {prof && (
            <table className="mini">
              <thead><tr><th scope="col">Cluster</th><th scope="col">Members</th><th scope="col">Avg visits / month</th><th scope="col">Avg yearly spend</th></tr></thead>
              <tbody>
                {prof.map((c) => (
                  <tr key={c.k}><th scope="row"><span className="dot" style={{ background: COLORS[c.k] }} /> {c.k + 1}</th><td>{c.size}</td><td>{c.visits.toFixed(1)}</td><td>${Math.round(c.spend)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
          <section className="card">
            <span className="k">Why normalise?</span>
            <p style={{ margin: 0 }}>K-means groups points by distance. When one variable is measured in much bigger numbers, its differences swamp the others. Normalising puts every variable on the same 0–1 scale first.</p>
          </section>
        </div>
      </div>
    </>
  );
}
