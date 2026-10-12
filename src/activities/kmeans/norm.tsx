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

/** A scatter plot frame for one view; `place` maps a member's raw (visits, spend) to the screen. */
function Frame({ view, label, children }: { view: View; label: string; children: (place: (p: Pt, normed?: Pt) => [number, number]) => ReactNode }) {
  const [ax, ay] = AXES[view];
  const sx = (v: number) => L + (v / ax.max) * (W - L - R);
  const sy = (v: number) => T + (1 - v / ay.max) * (H - T - B);
  const place = (p: Pt, normed?: Pt): [number, number] => (view === "norm" && normed ? [sx(normed.x), sy(normed.y)] : [sx(p.x), sy(p.y)]);
  return (
    <svg className="kplot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
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
        <text x={(sx(0) + sx(ax.max)) / 2} y={H - 2} textAnchor="middle" className="axis-title">{ax.title}</text>
        <text x={10} y={(sy(0) + sy(ay.max)) / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 10 ${(sy(0) + sy(ay.max)) / 2})`}>{ay.title}</text>
      </g>
      {children(place)}
    </svg>
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

/* Mission 2: run k-means with and without normalising. */
export function ExploreNormalise({ onDone, done }: ExploreProps<Shopper>) {
  const [n, setN] = useState(40);
  const [seed, setSeed] = useState(3);
  const [scaled, setScaled] = useState(false);
  const [view, setView] = useState<View>("chart");
  const [labels, setLabels] = useState<number[] | null>(null);
  const [t, setT] = useState({ raw: false, seen: false, norm: false });
  const points = useMemo(() => makeShoppers(n, seed), [n, seed]);
  const normed = useMemo(() => normalise(points), [points]);

  const tick = (nt: typeof t) => { setT(nt); if (!done && nt.raw && nt.seen && nt.norm) onDone(); };
  const runIt = () => {
    const ls = bestRun(scaled ? normed : points, 2, 8).labels;
    // Number clusters so cluster 1 is always the lower-visit one: colours stay put between runs.
    const lowVisit = profiles(points, ls).sort((a, b) => a.visits - b.visits)[0].k;
    setLabels(ls.map((l) => (l === lowVisit ? 0 : 1)));
    tick({ ...t, raw: t.raw || !scaled, norm: t.norm || scaled });
  };
  const changeView = (v: View) => { setView(v); if (v !== "chart" && !scaled) tick({ ...t, seen: true }); };
  const toggleScale = (v: boolean) => { setScaled(v); setLabels(null); if (view !== "chart") setView(v ? "norm" : "seen"); };
  const reset = (f: () => void) => { f(); setLabels(null); };

  const prof = labels ? profiles(points, labels) : null;
  const visitsGap = prof ? Math.abs(prof[0].visits - prof[1].visits) : 0;
  const say = !labels
    ? scaled ? "Normalising is on: both variables now run from 0 to 1. Run k-means again and compare." : "These members are casual or regular visitors, and spend varies a lot either way. Run k-means with k = 2 and see what it finds."
    : visitsGap > 10
      ? "Now the clusters split casual visitors from regulars. Both variables counted, and visits turned out to be what separates the groups."
      : <>Look at the averages: both clusters visit about the same number of times. K-means split them by <b>spend</b> only, because dollar differences are hundreds of times bigger than visit differences. Try the other view.</>;

  const effView: View = view === "chart" ? "chart" : scaled ? "norm" : "seen";

  return (
    <>
      <div className="split">
        <div className="stack">
          <Tasks items={[
            { text: "Run k-means on the raw numbers", done: t.raw },
            { text: "Switch to “How k-means measures distance” to see why", done: t.seen },
            { text: "Turn on normalising and run k-means again", done: t.norm },
          ]} />
          <div className="kplot-wrap">
            <Frame view={effView} label={`${n} members, ${scaled ? "normalised" : "raw numbers"}, ${labels ? "clustered" : "not clustered yet"}`}>
              {(place) => points.map((p, i) => {
                const [x, y] = place(p, normed[i]);
                return <circle key={i} cx={x} cy={y} r={4.5} className="kp" fill={labels ? COLORS[labels[i]] : "#9aa69a"} />;
              })}
            </Frame>
            <p className="worth" style={{ margin: "6px 4px 0" }}>{VIEW_NOTE[effView]}</p>
          </div>
          <div className="seg-row" role="group" aria-label="Chart view">
            <button type="button" className="pick" aria-pressed={view === "chart"} onClick={() => changeView("chart")}>Normal chart</button>
            <button type="button" className="pick" aria-pressed={view !== "chart"} onClick={() => changeView("seen")}>How k-means measures distance</button>
          </div>
        </div>
        <div className="stack">
          <Owner>{say}</Owner>
          <section className="card kcontrols">
            <span className="k">Settings</span>
            <label className="toggle">
              <input type="checkbox" checked={scaled} onChange={(e) => toggleScale(e.target.checked)} />
              <span><b>Normalise first</b> (rescale visits and spend to 0–1)</span>
            </label>
            <label className="kfield">
              <span>Number of members <b>n = {n}</b></span>
              <input type="range" className="slider" min={10} max={150} step={10} value={n} onChange={(e) => reset(() => setN(Number(e.target.value)))} />
            </label>
            <div className="row">
              <button type="button" className="btn" onClick={runIt}>Run k-means (k = 2)</button>
              <button type="button" className="btn alt small" onClick={() => reset(() => setSeed(seed + 1))}>New data</button>
            </div>
          </section>
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
