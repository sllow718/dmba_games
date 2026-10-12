import { createContext, useContext, useId } from "react";
import type { ReactNode } from "react";
import type { GridProps } from "../../core/types";
import { slipState } from "../../components/ui";
import type { Listing } from "./data";
import { LISTINGS } from "./data";
import type { Flat, Line } from "./engine";
import { AREA, PRICE, fit, predict } from "./engine";

const W = 356, H = 300, L = 52, R = 12, T = 10, B = 34;

interface Scale { sx: (x: number) => number; sy: (y: number) => number; yMin: number; yMax: number; yTicks: number[] }
const makeScale = (yMin: number, yMax: number, yTicks: number[]): Scale => ({
  sx: (x) => L + ((x - AREA.min) / (AREA.max - AREA.min)) * (W - L - R),
  sy: (y) => T + (1 - (y - yMin) / (yMax - yMin)) * (H - T - B),
  yMin, yMax, yTicks,
});
/** The full price range, used by the labs. */
const FULL = makeScale(PRICE.min, PRICE.max, [200, 400, 600, 800]);
/** Zoomed in on the lesson flats ($415k–$745k), so each flat's gap from the line is easy to see. */
const ZOOM = makeScale(350, 800, [400, 500, 600, 700, 800]);
const ScaleContext = createContext<Scale>(FULL);

export const sx = FULL.sx;
export const sy = FULL.sy;
/** The least-squares line for the 12 lesson flats. */
export const LESSON_FIT = fit(LISTINGS);
const clampX = (x: number) => Math.min(AREA.max, Math.max(AREA.min, x));

/** Axes for floor area (x) against price (y). Lines and points inside are clipped to the plot area. */
export interface Note {
  title: string;
  lines: string[];
}

/** Axes for floor area (x) against price (y). Lines and points inside are clipped to the plot area. A `note` sits above the plot, inside the chart. */
export function Plot({ label, children, zoom, note }: { label: string; children: ReactNode; zoom?: boolean; note?: Note }) {
  const noteH = note ? 36 + note.lines.length * 15 : 0;
  const scale = zoom ? ZOOM : FULL;
  const { sx, sy, yTicks: yt } = scale;
  const y = { min: scale.yMin, max: scale.yMax };
  const xt = [40, 60, 80, 100, 120, 140];
  const clip = useId().replace(/:/g, "");
  return (
    <ScaleContext.Provider value={scale}>
    <svg className={"kplot" + (note ? " with-note" : "")} viewBox={`0 0 ${W} ${H + noteH}`} role="img" aria-label={label}>
      {note && (
        <g className="seen-note" role="note" aria-label={`${note.title}. ${note.lines.join(" ")}`}>
          <rect x={6} y={4} width={W - 12} height={noteH - 10} rx={8} />
          <text x={16} y={22} className="hd">{note.title}</text>
          {note.lines.map((l, i) => <text key={i} x={16} y={40 + i * 15}>{l}</text>)}
        </g>
      )}
      <g transform={`translate(0 ${noteH})`}>
      <defs><clipPath id={clip}><rect x={sx(AREA.min)} y={sy(y.max) - 12} width={sx(AREA.max) - sx(AREA.min)} height={sy(y.min) - sy(y.max) + 12} /></clipPath></defs>
      <g className="axes" aria-hidden="true">
        {xt.map((t) => (
          <g key={"x" + t}>
            <line x1={sx(t)} x2={sx(t)} y1={sy(y.min)} y2={sy(y.max)} className="gridline" />
            <text x={sx(t)} y={sy(y.min) + 14} textAnchor="middle">{t}</text>
          </g>
        ))}
        {yt.map((t) => (
          <g key={"y" + t}>
            <line x1={sx(AREA.min)} x2={sx(AREA.max)} y1={sy(t)} y2={sy(t)} className="gridline" />
            <text x={sx(AREA.min) - 6} y={sy(t) + 4} textAnchor="end">{`$${t}k`}</text>
          </g>
        ))}
        <text x={(sx(AREA.min) + sx(AREA.max)) / 2} y={H - 2} textAnchor="middle" className="axis-title">Floor area (sqm) →</text>
        <text x={10} y={(sy(y.min) + sy(y.max)) / 2} textAnchor="middle" className="axis-title" transform={`rotate(-90 10 ${(sy(y.min) + sy(y.max)) / 2})`}>Price →</text>
      </g>
      <g clipPath={`url(#${clip})`}>{children}</g>
      </g>
    </svg>
    </ScaleContext.Provider>
  );
}

/** A straight line across the chart. */
export function LineMark({ l, className }: { l: Line; className: string }) {
  const { sx, sy } = useContext(ScaleContext);
  return <line x1={sx(AREA.min)} y1={sy(predict(l, AREA.min))} x2={sx(AREA.max)} y2={sy(predict(l, AREA.max))} className={className} />;
}

/** Plain dots for flats, on the surrounding Plot's scale. */
export function Dots({ points }: { points: readonly Flat[] }) {
  const { sx, sy } = useContext(ScaleContext);
  return <g>{points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={5} className="kp" fill="#2f74cc" />)}</g>;
}

/** Vertical gaps from each flat to the line: green when it sold above the line, red when below. */
export function Residuals({ l, points }: { l: Line; points: readonly Flat[] }) {
  const { sx, sy } = useContext(ScaleContext);
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
  const { sx, sy, yMin } = useContext(ScaleContext);
  const y = predict(l, x), cx = clampX(x);
  return (
    <g className="guide">
      <line x1={sx(cx)} x2={sx(cx)} y1={sy(yMin)} y2={sy(y)} />
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
  const { sx: zx, sy: zy } = ZOOM;
  return (
    <div className="kplot-wrap">
      <Plot zoom label={label ?? `Scatter plot of ${data.length} flats: floor area against price`}>
        {tags.includes("resid") && <Residuals l={l} points={data} />}
        {tags.includes("line") && <LineMark l={l} className="fitline" />}
        {pred && <PredictionGuide l={l} x={Number(pred.slice(5))} />}
        {data.map((m, i) => {
          const st = slipState(m, highlight, hasListingTag);
          const sel = selected?.has(i), mark = marks?.get(i);
          const dot = (
            // Small dots with the number beside them, so the line stays visible next to each flat.
            <g className={"fpt" + (st === "dim" ? " dim" : "") + (sel ? " sel" : "") + (mark ? " " + mark : "")}>
              {onToggle && <circle cx={zx(m.x)} cy={zy(m.y)} r={13} className="hit" />}
              <circle cx={zx(m.x)} cy={zy(m.y)} r={5} fill={st === "lit" || st === "both" ? "#2f74cc" : "#7d8a80"} className="dotm" />
              <text x={zx(m.x)} y={zy(m.y) - 9} textAnchor="middle">{m.id}</text>
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
