import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps } from "../../core/types";
import { Owner, Tasks } from "../../components/ui";
import type { Listing } from "./data";
import type { Line } from "./engine";
import { AREA, fit, makeFlats, predict, r2, sse } from "./engine";
import type { Note } from "./ui";
import { Dots, LESSON_FIT, LineMark, Plot, PredictionGuide, Residuals, sx, sy } from "./ui";
import { LISTINGS } from "./data";

const fmtLine = (l: Line) => `price ≈ $${Math.round(l.intercept)}k + $${(Math.round(l.slope * 10) / 10).toFixed(1)}k × area`;

/* Mission 1: a guided walk from a flat guess to the least-squares line, on the 12 lesson flats. */
const MEAN_X = LISTINGS.reduce((t, m) => t + m.x, 0) / LISTINGS.length;
const MEAN_Y = LISTINGS.reduce((t, m) => t + m.y, 0) / LISTINGS.length;
/** First guess: the average price for every flat. */
const GUESS: Line = { slope: 0, intercept: MEAN_Y };
/** A tilted line through the middle of the data, but not as steep as the best line. */
const TILT: Line = { slope: 3, intercept: MEAN_Y - 3 * MEAN_X };
const k = (v: number) => `$${Math.round(v)}k`;

const FIT_STEPS: { line: Line | null; gaps: boolean; say: string; note: Note }[] = [
  { line: null, gaps: false, say: "Let's find the line that fits my sales best. Read the note in the chart, then press Next.", note: { title: "Step 1 of 5 · The data", lines: [
    "Each dot is one of the 12 flats that sold recently.",
    "Bigger flats sell for more: the dots rise to the right.",
  ] } },
  { line: GUESS, gaps: false, say: "A lazy first guess: quote everyone the average price.", note: { title: "Step 2 of 5 · A first guess", lines: [
    `A flat line at the average price, ${k(MEAN_Y)}.`,
    "It predicts the same price for every flat,",
    "whatever its size.",
  ] } },
  { line: GUESS, gaps: true, say: "Those gaps are the guess's mistakes. Long gaps mean bad predictions.", note: { title: "Step 3 of 5 · Look at the gaps", lines: [
    "Each coloured line is a residual: the gap between a",
    "flat's real price and the line's prediction.",
    "Small flats sit far below, big flats far above.",
  ] } },
  { line: TILT, gaps: true, say: "Better. Watch the total squared gap on the right drop.", note: { title: "Step 4 of 5 · Tilt the line", lines: [
    "Tilting the line so it rises with floor area",
    "makes most of the gaps shorter.",
  ] } },
  { line: LESSON_FIT, gaps: true, say: "That's the line least squares picks. No other straight line has a smaller total of squared gaps.", note: { title: "Step 5 of 5 · The least-squares line", lines: [
    "Least squares finds the one line with the",
    "smallest total of squared gaps:",
    `price ≈ ${k(LESSON_FIT.intercept)} + $${(Math.round(LESSON_FIT.slope * 10) / 10).toFixed(1)}k × floor area`,
  ] } },
];

export function ExploreFit({ onDone, done }: ExploreProps<Listing>) {
  const [step, setStep] = useState(0);
  const cur = FIT_STEPS[step];
  const last = step === FIT_STEPS.length - 1;
  const go = (i: number) => { setStep(i); if (!done && i === FIT_STEPS.length - 1) onDone(); };
  const guessErr = sse(GUESS, LISTINGS);
  const err = cur.line ? sse(cur.line, LISTINGS) : null;

  return (
    <div className="split">
      <div className="stack">
        <Tasks items={[
          { text: "See a first guess and its gaps", done: step >= 2 },
          { text: "Tilt the line and watch the total gap shrink", done: step >= 3 },
          { text: "Meet the least-squares line", done: last },
        ]} />
        <div className="kplot-wrap">
          <Plot zoom note={cur.note} label={`12 flats, ${cur.note.title}`}>
            {cur.gaps && cur.line && <Residuals l={cur.line} points={LISTINGS} />}
            {cur.line && <LineMark l={cur.line} className={"fitline" + (cur.line === LESSON_FIT ? "" : " mine")} />}
            <Dots points={LISTINGS} />
          </Plot>
          {cur.gaps && <p className="worth" style={{ margin: "6px 4px 0" }}>Gaps: <span className="up-txt">above</span> / <span className="down-txt">below</span> the line</p>}
        </div>
        <div className="row">
          <button type="button" className="btn" disabled={last} onClick={() => go(step + 1)}>{last ? "Done" : "Next →"}</button>
          {step > 0 && <button type="button" className="btn alt small" onClick={() => go(step - 1)}>← Back a step</button>}
        </div>
      </div>
      <div className="stack">
        <Owner>{cur.say}</Owner>
        <section className="card">
          <span className="k">Total squared gap</span>
          {err === null ? (
            <p className="worth" style={{ margin: 0 }}>No line yet. Press Next.</p>
          ) : (
            <>
              <div className="meter-row">
                <span>{cur.line === GUESS ? "First guess" : cur.line === TILT ? "Tilted line" : "Least squares"}</span>
                <span className="bar"><i style={{ width: `${(err / guessErr) * 100}%`, background: "var(--brand)" }} /></span>
                <b>{Math.round((err / guessErr) * 100)}%</b>
              </div>
              <p className="worth" style={{ marginTop: 6 }}>Shown as a share of the first guess's total. Square each gap and add them up: the smaller the total, the better the line fits.</p>
            </>
          )}
        </section>
        {cur.line && (
          <section className="card">
            <span className="k">This line</span>
            <div className="formula" style={{ margin: 0 }}>{fmtLine(cur.line)}</div>
            <p className="worth" style={{ marginTop: 6 }}>Slope: price added per extra sqm. Intercept: where the line starts, at 0 sqm.</p>
          </section>
        )}
      </div>
    </div>
  );
}

const MARKETS = {
  tidy: { label: "Tidy market", noise: 20, seed: 3 },
  noisy: { label: "Noisy market", noise: 130, seed: 5 },
} as const;
type Market = keyof typeof MARKETS;

/* Mission 2: predict prices, and see how R² and the data range change how much to trust them. */
export function ExplorePredict({ onDone, done }: ExploreProps<Listing>) {
  const [market, setMarket] = useState<Market>("tidy");
  const [x, setX] = useState(70);
  const [t, setT] = useState({ ninety: false, outside: false, noisy: false });
  const points = useMemo(() => makeFlats(40, MARKETS[market].seed, MARKETS[market].noise), [market]);
  const l = useMemo(() => fit(points), [points]);
  const fitR2 = r2(l, points);
  const lo = Math.min(...points.map((p) => p.x)), hi = Math.max(...points.map((p) => p.x));
  const outside = x < lo || x > hi;
  const price = predict(l, x);

  const tick = (nt: typeof t) => { setT(nt); if (!done && nt.ninety && nt.outside && nt.noisy) onDone(); };
  const slide = (v: number) => {
    setX(v);
    const nt = { ...t, ninety: t.ninety || (market === "tidy" && v === 90), outside: t.outside || v < lo || v > hi };
    if (nt.ninety !== t.ninety || nt.outside !== t.outside) tick(nt);
  };
  const pick = (m: Market) => { setMarket(m); if (m === "noisy" && !t.noisy) tick({ ...t, noisy: true }); };

  const say: ReactNode = outside
    ? <>Careful: no flat in this data is {x < lo ? "that small" : "that big"}. The data runs from {lo} to {hi} sqm, so the line is only a guess out here. Predicting outside the data is called <b>extrapolation</b>.</>
    : market === "noisy"
      ? <>Same kind of line, but the flats are scattered far from it. R² is only {fitR2.toFixed(2)}: floor area explains about {Math.round(fitR2 * 100)}% of the price differences, so single predictions could be well off.</>
      : <>Read up from {x} sqm to the line, then across: about <b>${Math.round(price)}k</b>. Each extra square metre adds about ${(Math.round(l.slope * 10) / 10).toFixed(1)}k.</>;

  return (
    <div className="split">
      <div className="stack">
        <Tasks items={[
          { text: "Predict the price of a 90 sqm flat in the tidy market", done: t.ninety },
          { text: "Try a floor area outside the range of the data", done: t.outside },
          { text: "Switch to the noisy market and compare R²", done: t.noisy },
        ]} />
        <div className="kplot-wrap">
          <Plot label={`${MARKETS[market].label}: 40 flats, least-squares line, prediction for ${x} sqm`}>
            <rect x={sx(lo)} y={sy(900)} width={sx(hi) - sx(lo)} height={sy(200) - sy(900)} className="range-band" />
            <LineMark l={l} className="fitline" />
            {points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4.5} className="kp" fill="#2f74cc" />)}
            <PredictionGuide l={l} x={x} />
          </Plot>
          <p className="worth" style={{ margin: "6px 4px 0" }}>Shaded: the range of floor areas in the data ({lo}–{hi} sqm).</p>
        </div>
        <div className="seg-row" role="group" aria-label="Market">
          {(Object.keys(MARKETS) as Market[]).map((m) => (
            <button key={m} type="button" className="pick" aria-pressed={market === m} onClick={() => pick(m)}>{MARKETS[m].label}</button>
          ))}
        </div>
      </div>
      <div className="stack">
        <Owner>{say}</Owner>
        <section className="card kcontrols">
          <span className="k">Predict a price</span>
          <label className="kfield">
            <span>Floor area <b>{x} sqm</b></span>
            <input type="range" className="slider" min={AREA.min} max={AREA.max} step={1} value={x} onChange={(e) => slide(Number(e.target.value))} />
          </label>
          <div className="formula" style={{ margin: 0 }}>Predicted price ≈ ${Math.round(price).toLocaleString("en-US")}k{outside ? " (outside the data)" : ""}</div>
        </section>
        <section className="card">
          <span className="k">The model</span>
          <p style={{ margin: "0 0 6px" }}>{fmtLine(l)}</p>
          <div className="meter-row">
            <span>R² = {fitR2.toFixed(2)}</span>
            <span className="bar"><i style={{ width: `${Math.max(0, fitR2) * 100}%` }} /></span>
            <b>{Math.round(fitR2 * 100)}%</b>
          </div>
          <p className="worth" style={{ marginTop: 6 }}>R² is the share of the differences in price that floor area explains. Closer to 1 means the flats sit closer to the line.</p>
        </section>
      </div>
    </div>
  );
}
