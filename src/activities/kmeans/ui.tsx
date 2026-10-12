import type { ReactNode } from "react";
import type { GridProps } from "../../core/types";
import { slipState } from "../../components/ui";
import type { Member } from "./data";
import type { Pt } from "./engine";
import { AXIS_MAX } from "./engine";

export const COLORS = ["#d94d25", "#2f74cc", "#23774a", "#8458c2", "#b8860b", "#167f86"];
const GREY = "#9aa69a";

const W = 350, H = 300, L = 48, R = 10, T = 10, B = 34;
export const sx = (x: number) => L + (x / AXIS_MAX) * (W - L - R);
export const sy = (y: number) => T + ((AXIS_MAX - y) / AXIS_MAX) * (H - T - B);

/** Axes, grid and labels for visits per month (x) against spend per visit (y). */
export function Axes() {
  const ticks = [0, 10, 20, 30];
  return (
    <g className="axes" aria-hidden="true">
      {ticks.map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={sy(0)} y2={sy(AXIS_MAX)} className="gridline" />
          <line x1={sx(0)} x2={sx(AXIS_MAX)} y1={sy(t)} y2={sy(t)} className="gridline" />
          <text x={sx(t)} y={sy(0) + 14} textAnchor="middle">{t}</text>
          <text x={sx(0) - 6} y={sy(t) + 4} textAnchor="end">{`$${t}`}</text>
        </g>
      ))}
      <text x={(sx(0) + sx(AXIS_MAX)) / 2} y={H - 2} textAnchor="middle" className="axis-title">Visits per month →</text>
      <text x={10} y={(sy(0) + sy(AXIS_MAX)) / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 10 ${(sy(0) + sy(AXIS_MAX)) / 2})`}>Spend per visit →</text>
    </g>
  );
}

/** A centroid: a ringed cross in its cluster's colour, labelled with the cluster number. */
export function Centroid({ c, k, faded }: { c: Pt; k: number; faded?: boolean }) {
  return (
    <g className={"centroid" + (faded ? " faded" : "")} style={{ transform: `translate(${sx(c.x)}px, ${sy(c.y)}px)` }}>
      <circle r="11" fill="#fff" stroke={COLORS[k % COLORS.length]} strokeWidth="3" />
      <text y="4" textAnchor="middle" fill={COLORS[k % COLORS.length]}>{k + 1}</text>
    </g>
  );
}

export function Plot({ children, label }: { children: ReactNode; label: string }) {
  return (
    <svg className="kplot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <Axes />
      {children}
    </svg>
  );
}

/** Tags the lesson charts understand: "c=0" (in cluster 0), "all" (every member), "centroids" (draw them). */
export function hasTag(m: Member, tag: string) {
  if (tag === "all" || tag === "centroids") return true;
  const c = /^c=(\d)$/.exec(tag);
  return c ? m.cluster === Number(c[1]) : false;
}

const centroidOf = (ms: readonly Member[], k: number): Pt | null => {
  const mine = ms.filter((m) => m.cluster === k);
  return mine.length ? { x: mine.reduce((s, m) => s + m.x, 0) / mine.length, y: mine.reduce((s, m) => s + m.y, 0) / mine.length } : null;
};

/** The 12 members as a scatter plot. Lit members show their cluster colour; tap mode makes them buttons. */
export function MemberPlot({ data, highlight, selected, onToggle, marks, label }: GridProps<Member>) {
  const tags = [...(highlight?.lit ?? []), ...(highlight?.both ?? [])];
  const showCentroids = tags.includes("centroids");
  return (
    <div className="kplot-wrap">
      <Plot label={label ?? `Scatter plot of ${data.length} members: visits per month against spend per visit`}>
        {showCentroids && [0, 1, 2].map((k) => {
          const c = centroidOf(data, k);
          return c && <Centroid key={k} c={c} k={k} />;
        })}
        {data.map((m, i) => {
          const st = slipState(m, highlight, hasTag);
          const lit = st === "lit" || st === "both";
          const fill = lit ? COLORS[m.cluster] : GREY;
          const sel = selected?.has(i);
          const mark = marks?.get(i);
          const dot = (
            <g className={"mpt" + (st === "dim" ? " dim" : "") + (sel ? " sel" : "") + (mark ? " " + mark : "")}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={onToggle ? 11 : 9} fill={fill} />
              <text x={sx(m.x)} y={sy(m.y) + 3.5} textAnchor="middle">{m.id}</text>
            </g>
          );
          const desc = `Member ${m.id}: ${m.x} visits a month, $${m.y} a visit`;
          return onToggle ? (
            <g key={i} role="button" tabIndex={0} aria-pressed={!!sel} aria-label={desc} className="tap"
              onClick={() => onToggle(i)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(i); } }}>
              {dot}
            </g>
          ) : (
            <g key={i} aria-label={desc}>{dot}</g>
          );
        })}
      </Plot>
    </div>
  );
}

/** A fixed bar chart of total distance by k, for reading the elbow. */
export function ElbowFigure({ values }: { values: Record<number, number> }) {
  const max = Math.max(...Object.values(values));
  return (
    <div className="elbow static" role="img" aria-label={Object.entries(values).map(([k, v]) => `k = ${k}: ${v}`).join(", ")}>
      {Object.entries(values).map(([k, v]) => (
        <div key={k} className="ebar">
          <span className="val">{v}</span>
          <span className="bar"><i style={{ height: `${Math.max(3, (v / max) * 100)}%` }} /></span>
          <span className="kk">k={k}</span>
        </div>
      ))}
    </div>
  );
}
