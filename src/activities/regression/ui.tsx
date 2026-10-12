import type { ReactNode } from "react";
import type { GridProps } from "../../core/types";
import { slipState } from "../../components/ui";
import type { Listing } from "./data";
import { LISTINGS } from "./data";
import type { Flat, Line } from "./engine";
import { AREA, PRICE, fit, predict } from "./engine";

const W = 356, H = 300, L = 52, R = 12, T = 10, B = 34;
export const sx = (x: number) => L + ((x - AREA.min) / (AREA.max - AREA.min)) * (W - L - R);
export const sy = (y: number) => T + (1 - (y - PRICE.min) / (PRICE.max - PRICE.min)) * (H - T - B);
/** The least-squares line for the 12 lesson flats. */
export const LESSON_FIT = fit(LISTINGS);
const clampX = (x: number) => Math.min(AREA.max, Math.max(AREA.min, x));

/** Axes for floor area (x) against price (y). */
export function Plot({ label, children }: { label: string; children: ReactNode }) {
  const xt = [40, 60, 80, 100, 120, 140], yt = [200, 400, 600, 800];
  return (
    <svg className="kplot" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <g className="axes" aria-hidden="true">
        {xt.map((t) => (
          <g key={"x" + t}>
            <line x1={sx(t)} x2={sx(t)} y1={sy(PRICE.min)} y2={sy(PRICE.max)} className="gridline" />
            <text x={sx(t)} y={sy(PRICE.min) + 14} textAnchor="middle">{t}</text>
          </g>
        ))}
        {yt.map((t) => (
          <g key={"y" + t}>
            <line x1={sx(AREA.min)} x2={sx(AREA.max)} y1={sy(t)} y2={sy(t)} className="gridline" />
            <text x={sx(AREA.min) - 6} y={sy(t) + 4} textAnchor="end">{`$${t}k`}</text>
          </g>
        ))}
        <text x={(sx(AREA.min) + sx(AREA.max)) / 2} y={H - 2} textAnchor="middle" className="axis-title">Floor area (sqm) →</text>
        <text x={10} y={(sy(PRICE.min) + sy(PRICE.max)) / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 10 ${(sy(PRICE.min) + sy(PRICE.max)) / 2})`}>Price →</text>
      </g>
      {children}
    </svg>
  );
}

/** A straight line across the chart. */
export function LineMark({ l, className }: { l: Line; className: string }) {
  return <line x1={sx(AREA.min)} y1={sy(predict(l, AREA.min))} x2={sx(AREA.max)} y2={sy(predict(l, AREA.max))} className={className} />;
}

/** Vertical gaps from each flat to the line: green when it sold above the line, red when below. */
export function Residuals({ l, points }: { l: Line; points: readonly Flat[] }) {
  return (
    <g>
      {points.map((p, i) => {
        const yh = predict(l, p.x);
        return <line key={i} x1={sx(p.x)} x2={sx(p.x)} y1={sy(p.y)} y2={sy(yh)} className={"resid " + (p.y >= yh ? "up" : "down")} />;
      })}
    </g>
  );
}

/** Dashed guides from a floor area up to the line and across to the price axis. */
export function PredictionGuide({ l, x }: { l: Line; x: number }) {
  const y = predict(l, x), cx = clampX(x);
  return (
    <g className="guide">
      <line x1={sx(cx)} x2={sx(cx)} y1={sy(PRICE.min)} y2={sy(y)} />
      <line x1={sx(AREA.min)} x2={sx(cx)} y1={sy(y)} y2={sy(y)} />
      <circle cx={sx(cx)} cy={sy(y)} r={6} />
    </g>
  );
}

/**
 * Lesson chart tags: "line" draws the least-squares line, "resid" its residuals, "pred=90" a prediction guide;
 * "above" / "below" pick flats that sold above or below the line; "all" lights every flat.
 */
export function hasListingTag(m: Listing, tag: string) {
  if (tag === "above" || tag === "below") {
    const r = m.y - predict(LESSON_FIT, m.x);
    return tag === "above" ? r > 0 : r < 0;
  }
  return tag === "all" || tag === "line" || tag === "resid" || tag.startsWith("pred=");
}

/** The 12 lesson flats, with the line, residuals and prediction the highlight asks for. */
export function FlatPlot({ data, highlight, selected, onToggle, marks, label }: GridProps<Listing>) {
  const tags = [...(highlight?.lit ?? []), ...(highlight?.both ?? [])];
  const l = fit(data);
  const pred = tags.find((t) => t.startsWith("pred="));
  return (
    <div className="kplot-wrap">
      <Plot label={label ?? `Scatter plot of ${data.length} flats: floor area against price`}>
        {tags.includes("resid") && <Residuals l={l} points={data} />}
        {tags.includes("line") && <LineMark l={l} className="fitline" />}
        {pred && <PredictionGuide l={l} x={Number(pred.slice(5))} />}
        {data.map((m, i) => {
          const st = slipState(m, highlight, hasListingTag);
          const sel = selected?.has(i), mark = marks?.get(i);
          const dot = (
            <g className={"mpt" + (st === "dim" ? " dim" : "") + (sel ? " sel" : "") + (mark ? " " + mark : "")}>
              <circle cx={sx(m.x)} cy={sy(m.y)} r={onToggle ? 10 : 8.5} fill={st === "lit" || st === "both" ? "#2f74cc" : "#7d8a80"} />
              <text x={sx(m.x)} y={sy(m.y) + 3.5} textAnchor="middle">{m.id}</text>
            </g>
          );
          const desc = `Flat ${m.id}: ${m.x} sqm, $${m.y}k`;
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
