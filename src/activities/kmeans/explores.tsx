import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps } from "../../core/types";
import { Owner, Tasks } from "../../components/ui";
import type { Member } from "./data";
import type { KState, Phase } from "./engine";
import { initial, makeData, step, wcss } from "./engine";
import { COLORS, Centroid, Plot, sx, sy } from "./ui";

const STEPS: { phases: Phase[]; title: string; text: string }[] = [
  { phases: ["ready"], title: "Choose k", text: "Decide how many clusters you want." },
  { phases: ["placed"], title: "Place k starting centroids", text: "k members are picked at random as the first centres." },
  { phases: ["assigned"], title: "Assign", text: "Every point joins its nearest centroid." },
  { phases: ["moved"], title: "Move", text: "Each centroid moves to the average of its points." },
  { phases: ["done"], title: "Repeat until nothing changes", text: "Assign and move again until no point switches cluster." },
];

const NEXT_LABEL: Record<Phase, string> = {
  ready: "Place starting centroids",
  placed: "Assign points",
  assigned: "Move centroids",
  moved: "Assign points again",
  done: "Converged",
};

export interface RunEvent {
  phase: Phase;
  k: number;
  n: number;
  dataSeed: number;
  startSeed: number;
  wcss: number;
  round: number;
}

function narrate(s: KState, k: number): ReactNode {
  switch (s.phase) {
    case "ready": return <>You've chosen <b>k = {k}</b> clusters for these points. Change n or k in Settings if you like, then press <b>Place starting centroids</b>.</>;
    case "placed": return <>{k} members were picked at random as the starting centroids: the numbered circles. Nothing is grouped yet.</>;
    case "assigned": return <>Round {s.round}: every point joined its <b>nearest</b> centroid and took its colour. <b>{s.changed}</b> point{s.changed === 1 ? "" : "s"} {s.round === 1 ? "got a cluster" : "changed cluster"}. The thin lines show who belongs to whom.</>;
    case "moved": return <>Each centroid moved to the <b>average</b> of its points. The dashed lines show how far. Now the nearest centroid may be different for some points, so assign again.</>;
    case "done": return <>Converged after {s.round} round{s.round === 1 ? "" : "s"}: the last assignment moved nobody, so the centroids can't move either. That's the final clustering.</>;
  }
}

/** Guided k-means: pick n and k, then step through place → assign → move until it converges. */
export function KMeansLab({ onEvent, extra }: { onEvent?: (e: RunEvent) => void; extra?: (ctx: { n: number; k: number; dataSeed: number }) => ReactNode }) {
  const [n, setN] = useState(30);
  const [k, setK] = useState(3);
  const [dataSeed, setDataSeed] = useState(7);
  // This start puts two centroids in one group, so the first run takes several rounds to sort itself out.
  const [startSeed, setStartSeed] = useState(3);
  const points = useMemo(() => makeData(n, dataSeed), [n, dataSeed]);
  const [s, setS] = useState<KState>(() => initial(points));

  const report = (ns: KState, kk = k) => onEvent?.({ phase: ns.phase, k: kk, n, dataSeed, startSeed, wcss: wcss(points, ns.labels, ns.centroids), round: ns.round });
  const reset = (pts = points) => setS(initial(pts));
  const next = () => { const ns = step(points, s, k, startSeed); setS(ns); report(ns); };
  const finish = () => {
    let ns = s;
    for (let i = 0; i < 200 && ns.phase !== "done"; i++) ns = step(points, ns, k, startSeed);
    setS(ns); report(ns);
  };
  const changeN = (v: number) => { setN(v); setS(initial(makeData(v, dataSeed))); };
  const changeK = (v: number) => { setK(v); reset(); };
  const newData = () => { const d = dataSeed + 1; setDataSeed(d); setS(initial(makeData(n, d))); };
  const newStart = () => { setStartSeed(startSeed + 1); reset(); };

  const current = STEPS.findIndex((x) => x.phases.includes(s.phase));
  const total = s.labels[0] >= 0 ? wcss(points, s.labels, s.centroids) : null;

  return (
    <div className="split">
      <div className="stack">
        <div className="kplot-wrap">
          <Plot label={`k-means on ${n} gym members with k = ${k}, ${s.phase === "done" ? "converged" : "step: " + STEPS[current].title}`}>
            {s.phase === "assigned" && points.map((p, i) => {
              const c = s.centroids[s.labels[i]];
              return <line key={"l" + i} x1={sx(p.x)} y1={sy(p.y)} x2={sx(c.x)} y2={sy(c.y)} stroke={COLORS[s.labels[i]]} className="link-line" />;
            })}
            {s.phase === "moved" && s.previous?.map((c, i) => (
              <line key={"t" + i} x1={sx(c.x)} y1={sy(c.y)} x2={sx(s.centroids[i].x)} y2={sy(s.centroids[i].y)} stroke={COLORS[i]} className="trail" />
            ))}
            {points.map((p, i) => (
              <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={n > 80 ? 3.5 : 5} className="kp" fill={s.labels[i] >= 0 ? COLORS[s.labels[i]] : "#9aa69a"} />
            ))}
            {s.centroids.map((c, i) => <Centroid key={i} c={c} k={i} />)}
          </Plot>
        </div>
        <Owner>{narrate(s, k)}</Owner>
        <div className="row">
          <button type="button" className="btn" disabled={s.phase === "done"} onClick={next}>{NEXT_LABEL[s.phase]} →</button>
          <button type="button" className="btn alt" disabled={s.phase === "done"} onClick={finish}>Run to the end</button>
          <button type="button" className="btn alt small" disabled={s.phase === "ready"} onClick={() => reset()}>Start over</button>
        </div>
        <div className="kstats">
          <span>Round <b>{s.round}</b></span>
          <span>Changed last round <b>{s.phase === "ready" || s.phase === "placed" ? "–" : s.changed}</b></span>
          <span>Total distance (WCSS) <b>{total === null ? "–" : Math.round(total)}</b></span>
        </div>
      </div>
      <div className="stack">
        <section className="card kcontrols">
          <span className="k">Settings</span>
          <label className="kfield">
            <span>Number of points <b>n = {n}</b></span>
            <input type="range" className="slider" min={10} max={150} step={5} value={n} onChange={(e) => changeN(Number(e.target.value))} />
          </label>
          <div className="kfield">
            <span>Number of clusters <b>k = {k}</b></span>
            <div className="picks" role="group" aria-label="Number of clusters">
              {[1, 2, 3, 4, 5, 6].map((v) => (
                <button key={v} type="button" className="pick num-pick" aria-pressed={v === k} onClick={() => changeK(v)}>{v}</button>
              ))}
            </div>
          </div>
          <div className="row">
            <button type="button" className="btn alt small" onClick={newStart}>New starting centroids</button>
            <button type="button" className="btn alt small" onClick={newData}>New data</button>
          </div>
        </section>
        <section className="card">
          <span className="k">How k-means works</span>
          <ol className="ksteps">
            {STEPS.map((x, i) => (
              <li key={x.title} className={i === current ? "on" : i < current ? "past" : ""}>
                <b>{x.title}</b>
                <span>{x.text}</span>
              </li>
            ))}
          </ol>
        </section>
        {extra?.({ n, k, dataSeed })}
      </div>
    </div>
  );
}

/** Tasks on top, with Coach Ana's feedback beside them when there is any. */
function Header({ tasks, say }: { tasks: { text: string; done: boolean }[]; say?: ReactNode }) {
  return (
    <div className="split" style={{ marginBottom: 16 }}>
      <Tasks items={tasks} />
      {say && <Owner>{say}</Owner>}
    </div>
  );
}

/* Mission 1: step through the algorithm. */
export function ExploreSteps({ onDone, done }: ExploreProps<Member>) {
  const [t, setT] = useState({ placed: false, round: false, converged: false, changed: false });
  const [first, setFirst] = useState<{ n: number; k: number } | null>(null);
  const onEvent = (e: RunEvent) => {
    const nt = { ...t };
    if (e.phase !== "ready") nt.placed = true;
    if (e.phase === "moved" || (e.phase === "done" && e.round >= 1)) nt.round = true;
    if (e.phase === "done") {
      nt.converged = true;
      if (!first) setFirst({ n: e.n, k: e.k });
      else if (first.n !== e.n || first.k !== e.k) nt.changed = true;
    }
    setT(nt);
    if (!done && nt.placed && nt.round && nt.converged && nt.changed) onDone();
  };
  return (
    <>
      <Header tasks={[
        { text: "Place the starting centroids", done: t.placed },
        { text: "Step through one full round: assign, then move", done: t.round },
        { text: "Keep stepping until it converges", done: t.converged },
        { text: "Change n or k, then run it again to the end", done: t.changed },
      ]} />
      <KMeansLab onEvent={onEvent} />
    </>
  );
}

/** Lowest total distance reached for each k on the current data, as a small bar chart. */
function ElbowChart({ best, onPick, picked }: { best: Record<number, number>; onPick: (k: number) => void; picked: number | null }) {
  const ks = [1, 2, 3, 4, 5, 6];
  const max = Math.max(1, ...Object.values(best));
  return (
    <section className="card">
      <span className="k">Total distance by k (this data)</span>
      <div className="elbow" role="group" aria-label="Total within-cluster distance for each k. Tap the elbow.">
        {ks.map((k) => (
          <button key={k} type="button" className={"ebar" + (picked === k ? " on" : "")} disabled={best[k] === undefined} onClick={() => onPick(k)} aria-label={best[k] === undefined ? `k = ${k}: not run yet` : `k = ${k}: ${Math.round(best[k])}`}>
            <span className="val">{best[k] === undefined ? "" : Math.round(best[k])}</span>
            <span className="bar"><i style={{ height: `${best[k] === undefined ? 0 : Math.max(3, (best[k] / max) * 100)}%` }} /></span>
            <span className="kk">k={k}</span>
          </button>
        ))}
      </div>
      <p className="worth" style={{ marginTop: 6 }}>Run to the end with different k to fill in the bars. Then tap the elbow.</p>
    </section>
  );
}

/* Mission 2: compare k values and starting points. */
export function ExploreElbow({ onDone, done }: ExploreProps<Member>) {
  const [dataSeed, setDataSeed] = useState(7);
  const [n, setN] = useState(30);
  const [best, setBest] = useState<Record<number, number>>({});
  const [starts, setStarts] = useState<Record<number, Set<number>>>({});
  const [elbow, setElbow] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [say, setSay] = useState<ReactNode>("Run k-means to the end with several values of k. I'll keep the lowest total distance for each k in the chart.");
  const tried = Object.keys(best).length;
  const restarted = Object.values(starts).some((x) => x.size >= 2);

  const check = (b: Record<number, number>, st: Record<number, Set<number>>, e: boolean) => {
    if (!done && Object.keys(b).length >= 4 && Object.values(st).some((x) => x.size >= 2) && e) onDone();
  };
  const onEvent = (ev: RunEvent) => {
    if (ev.phase !== "done") return;
    let b = best, st = starts;
    if (ev.dataSeed !== dataSeed || ev.n !== n) { b = {}; st = {}; setDataSeed(ev.dataSeed); setN(ev.n); setPicked(null); }
    b = { ...b, [ev.k]: Math.min(b[ev.k] ?? Infinity, ev.wcss) };
    const set = new Set(st[ev.k] ?? []).add(ev.startSeed);
    st = { ...st, [ev.k]: set };
    setBest(b); setStarts(st);
    const prev = best[ev.k];
    setSay(set.size >= 2 && prev !== undefined && Math.round(prev) !== Math.round(ev.wcss)
      ? <>Same k, different start, different answer: {Math.round(ev.wcss)} this time against a best of {Math.round(Math.min(prev, ev.wcss))}. Starting centroids matter, so it's worth running k-means a few times.</>
      : <>k = {ev.k} finished with a total distance of {Math.round(ev.wcss)}. Smaller means tighter clusters.</>);
    check(b, st, elbow);
  };
  const pick = (k: number) => {
    setPicked(k);
    const ok = k === 3;
    if (ok) { setElbow(true); check(best, starts, true); }
    setSay(ok
      ? "That's the elbow. Going from 2 to 3 clusters cuts the distance a lot; going past 3 barely helps. Three segments it is."
      : k < 3 ? "The distance still drops a lot after this k. Look for where the bars stop shrinking much." : "Adding clusters always shrinks the distance a little. The elbow is where the big drops stop.");
  };

  return (
    <>
      <Header say={say} tasks={[
        { text: "Run to the end with at least 4 different values of k", done: tried >= 4 },
        { text: "Run the same k again with new starting centroids", done: restarted },
        { text: "Tap the elbow in the chart", done: elbow },
      ]} />
      <KMeansLab onEvent={onEvent} extra={() => <ElbowChart best={best} onPick={pick} picked={picked} />} />
    </>
  );
}
