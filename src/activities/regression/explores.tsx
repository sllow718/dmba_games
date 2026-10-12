import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ExploreProps } from "../../core/types";
import { Owner, Tasks } from "../../components/ui";
import type { Listing } from "./data";
import type { Line } from "./engine";
import { AREA, fit, makeFlats, predict, r2, sse } from "./engine";
import { LineMark, Plot, PredictionGuide, Residuals, sx, sy } from "./ui";

const fmtLine = (l: Line) => `price ≈ $${Math.round(l.intercept)}k + $${(Math.round(l.slope * 10) / 10).toFixed(1)}k × area`;

/* Mission 1: fit a line by eye, see the residuals, then compare with least squares. */
export function ExploreFit({ onDone, done }: ExploreProps<Listing>) {
  const [n, setN] = useState(20);
  const [seed, setSeed] = useState(4);
  const points = useMemo(() => makeFlats(n, seed, 22), [n, seed]);
  const best = useMemo(() => fit(points), [points]);
  const [mine, setMine] = useState<Line>({ intercept: 450, slope: 1 });
  const [showGaps, setShowGaps] = useState(false);
  const [showBest, setShowBest] = useState(false);
  const [t, setT] = useState({ close: false, gaps: false, best: false });

  const ratio = sse(mine, points) / Math.max(1, sse(best, points));
  const tick = (nt: typeof t) => { setT(nt); if (!done && nt.close && nt.gaps && nt.best) onDone(); };
  const move = (l: Line) => {
    setMine(l);
    const r = sse(l, points) / Math.max(1, sse(best, points));
    if (r <= 1.5 && !t.close) tick({ ...t, close: true });
  };
  const newData = (f: () => void) => { f(); setShowBest(false); };

  const say: ReactNode = showBest
    ? ratio < 1.05
      ? "Your line is practically the least-squares line. Nicely done."
      : <>The dashed line is the least-squares line. No other straight line has a smaller total of squared gaps. Yours is {ratio.toFixed(1)}× bigger.</>
    : ratio > 3
      ? "Your line misses most flats by a lot. Move the slope and intercept so the line runs through the middle of the dots."
      : ratio > 1.5
        ? "Getting closer. Try to have about as many flats above the line as below it."
        : "That's a good fit by eye. Now show the gaps, then reveal the least-squares line.";

  return (
    <div className="split">
      <div className="stack">
        <Tasks items={[
          { text: "Move the slope and intercept until your line follows the flats", done: t.close },
          { text: "Turn on “Show the gaps” to see each flat's residual", done: t.gaps },
          { text: "Reveal the least-squares line and compare it with yours", done: t.best },
        ]} />
        <div className="kplot-wrap">
          <Plot label={`${n} flats with your line${showBest ? " and the least-squares line" : ""}`}>
            {showGaps && <Residuals l={mine} points={points} />}
            {showBest && <LineMark l={best} className="fitline best" />}
            <LineMark l={mine} className="fitline mine" />
            {points.map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={4.5} className="kp" fill="#2f74cc" />)}
          </Plot>
          <p className="worth" style={{ margin: "6px 4px 0" }}>
            <span className="key-line mine" /> your line{showBest && <> · <span className="key-line best" /> least-squares line</>}
            {showGaps && <> · gaps: <span className="up-txt">above</span> / <span className="down-txt">below</span> the line</>}
          </p>
        </div>
      </div>
      <div className="stack">
        <Owner>{say}</Owner>
        <section className="card kcontrols">
          <span className="k">Your line</span>
          <div className="formula" style={{ margin: 0 }}>{fmtLine(mine)}</div>
          <label className="kfield">
            <span>Slope <b>${mine.slope.toFixed(1)}k per sqm</b> (how steep)</span>
            <input type="range" className="slider" min={0} max={10} step={0.1} value={mine.slope} onChange={(e) => move({ ...mine, slope: Number(e.target.value) })} />
          </label>
          <label className="kfield">
            <span>Intercept <b>${mine.intercept}k</b> (moves the line up or down)</span>
            <input type="range" className="slider" min={-300} max={600} step={10} value={mine.intercept} onChange={(e) => move({ ...mine, intercept: Number(e.target.value) })} />
          </label>
          <div className="row">
            <button type="button" className="btn alt small" aria-pressed={showGaps} onClick={() => { setShowGaps(!showGaps); if (!showGaps) tick({ ...t, gaps: true }); }}>{showGaps ? "Hide the gaps" : "Show the gaps"}</button>
            <button type="button" className="btn small" onClick={() => { setShowBest(true); tick({ ...t, best: true }); }} disabled={showBest}>Reveal the least-squares line</button>
          </div>
        </section>
        <section className="card">
          <span className="k">How good is your line?</span>
          <div className="meter-row">
            <span>Your total squared gap</span>
            <span className="bar"><i style={{ width: `${Math.min(100, (1 / ratio) * 100)}%` }} /></span>
            <b>{ratio < 1.005 ? "best" : `${ratio.toFixed(1)}× best`}</b>
          </div>
          <p className="worth" style={{ marginTop: 6 }}>Least squares finds the line with the smallest total of squared gaps. The fuller the bar, the closer you are.</p>
          {showBest && <p style={{ margin: "6px 0 0" }}><b>Least squares:</b> {fmtLine(best)}</p>}
        </section>
        <section className="card kcontrols">
          <span className="k">Data</span>
          <label className="kfield">
            <span>Number of flats <b>n = {n}</b></span>
            <input type="range" className="slider" min={8} max={80} step={4} value={n} onChange={(e) => newData(() => setN(Number(e.target.value)))} />
          </label>
          <button type="button" className="btn alt small" onClick={() => newData(() => setSeed(seed + 1))}>New data</button>
        </section>
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
