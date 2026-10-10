import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { Question } from "../core/types";
import type { CheckpointState } from "../core/progress";
import { pointsFor } from "../core/progress";
import { parseAnswer } from "../activities/association-rules/engine";
import { useActivity } from "../core/activity";
import { Owner } from "./ui";

interface Props {
  questions: Question[];
  data: readonly unknown[];
  dataLabel: string;
  compact?: boolean;
  initial?: CheckpointState;
  onProgress: (s: CheckpointState) => void;
  onComplete: (r: { points: number; firstTry: number; attempts: Record<string, number> }) => void;
  /** Label for the button after the last question. */
  finishLabel?: string;
}

const listNums = (xs: number[]) => xs.map((i) => "#" + (i + 1)).join(", ");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Checkpoint questions with escalating hints and unlimited retries. */
export function Checkpoint({ questions, data, dataLabel, compact, initial, onProgress, onComplete, finishLabel = "See results" }: Props) {
  const { view, theme } = useActivity();
  const [one, many] = theme.rows;
  const levels = ["Hint 1 · a nudge", `Hint 2 · look at the ${many}`, "Hint 3 · nearly there"];
  const [qi, setQi] = useState(initial?.qi ?? 0);
  const [points, setPoints] = useState(initial?.points ?? 0);
  const [firstTry, setFirstTry] = useState(initial?.firstTry ?? 0);
  const attempts = useRef<Record<string, number>>({});

  const [wrong, setWrong] = useState(0);
  const [solved, setSolved] = useState(false);
  const [crossed, setCrossed] = useState<Set<number>>(new Set());
  const [hint, setHint] = useState<string | null>(null);
  const [num, setNum] = useState("");
  const [picked, setPicked] = useState<Set<number>>(new Set());
  const [marks, setMarks] = useState<Map<number, "miss" | "extra">>(new Map());
  const nextRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const q = questions[Math.min(qi, questions.length - 1)];

  useEffect(() => {
    setWrong(0); setSolved(false); setCrossed(new Set()); setHint(null); setNum(""); setPicked(new Set()); setMarks(new Map());
  }, [qi]);
  useEffect(() => { if (solved) nextRef.current?.focus(); }, [solved]);

  const showData = solved || wrong >= 2;
  const highlight = showData ? q.highlight : null;

  function miss(spec: string | undefined) {
    const w = wrong + 1;
    setWrong(w);
    const lines: string[] = [];
    if (w === 1) lines.push(spec || (q.type === "num" ? q.first : "") || q.ladder[0]);
    else {
      if (spec) lines.push(spec);
      lines.push(q.ladder[Math.min(w - 2, 1)]);
    }
    setHint(lines.join(" "));
  }

  function win() {
    attempts.current[q.id] = wrong;
    setSolved(true);
    setHint(null);
    const p = points + pointsFor(wrong);
    const f = firstTry + (wrong === 0 ? 1 : 0);
    setPoints(p);
    setFirstTry(f);
    onProgress({ qi: qi + 1, points: p, firstTry: f });
  }

  function next() {
    if (qi + 1 >= questions.length) onComplete({ points, firstTry, attempts: attempts.current });
    else setQi(qi + 1);
  }

  function answerChoice(i: number) {
    if (q.type !== "mc" || solved) return;
    const o = q.options[i];
    if (o.correct) return win();
    setCrossed(new Set(crossed).add(i));
    miss(o.hint);
  }

  function answerNumber(e: FormEvent) {
    e.preventDefault();
    if (q.type !== "num" || solved) return;
    const v = q.kind === "count" ? Number(num.trim()) : parseAnswer(num, { percentOver1: q.kind === "proportion" });
    if (!num.trim() || !Number.isFinite(v)) {
      setHint(q.kind === "count" ? `Type a whole number of ${many}, like 4.` : q.kind === "ratio" ? "Type a number like 1.5." : q.kind === "decimal" ? "Type a decimal like 0.44, or a fraction like 4/9." : "Type a fraction (5/8), a decimal (0.62) or a percentage (62%).");
      return;
    }
    const tol = q.tolerance ?? (q.kind === "count" ? 0 : q.kind === "ratio" ? 0.02 : q.kind === "decimal" ? 0.006 : 0.01);
    if (Math.abs(v - q.answer) <= tol + 1e-9) return win();
    const trap = q.traps?.find((t) => Math.abs(v - t.value) <= tol + 1e-9);
    miss(trap?.hint);
    inputRef.current?.focus();
  }

  function answerTap() {
    if (q.type !== "tap" || solved) return;
    const target = data.map((t, i) => (q.items.every((it) => view.has(t, it)) ? i : -1)).filter((i) => i >= 0);
    const missed = target.filter((i) => !picked.has(i));
    const extra = [...picked].filter((i) => !target.includes(i));
    if (!missed.length && !extra.length) { setMarks(new Map()); return win(); }
    const need = q.need ?? q.items.join(" and ").toLowerCase();
    const parts: string[] = [];
    if (wrong === 0) {
      if (missed.length) parts.push(`You've missed ${missed.length} ${missed.length > 1 ? many : one}.`);
      if (extra.length) parts.push(`${extra.length} of your picks ${extra.length > 1 ? "don't" : "doesn't"} have ${need}.`);
    } else {
      if (missed.length) parts.push(`Look again at ${listNums(missed)}.`);
      if (extra.length) parts.push(`${listNums(extra)} ${extra.length > 1 ? "don't" : "doesn't"} have ${need}.`);
      const m = new Map<number, "miss" | "extra">();
      missed.forEach((i) => m.set(i, "miss"));
      extra.forEach((i) => m.set(i, "extra"));
      setMarks(m);
    }
    miss(parts.join(" "));
  }

  const toggle = (i: number) => {
    if (solved) return;
    const s = new Set(picked);
    s.has(i) ? s.delete(i) : s.add(i);
    setPicked(s);
  };

  return (
    <div className="split">
      <div className="stack">
        <p className="data-label">{dataLabel}{q.type === "tap" && !solved ? " · tap to select" : ""}</p>
        {q.type === "tap" ? (
          <view.Grid data={data} compact={compact} selected={picked} onToggle={toggle} marks={marks} highlight={solved ? q.highlight : null} label={`${cap(many)}: tap to select`} />
        ) : (
          <view.Grid data={data} compact={compact} highlight={highlight} />
        )}
      </div>
      <div className="stack" aria-live="polite">
        <section className="card">
          <div className="qbar" aria-hidden="true">
            {questions.map((_, i) => <i key={i} className={i < qi || (i === qi && solved) ? "d" : i === qi ? "n" : ""} />)}
          </div>
          <span className="k">Question {qi + 1} of {questions.length}</span>
          <h2>{q.prompt}</h2>
          {q.figure && <div className="qfig">{q.figure}</div>}
          {q.type === "mc" && (
            <div className={"opts" + (q.layout === "list" ? " list" : "")}>
              {q.options.map((o, i) => (
                <button key={i} type="button" className={"opt" + (crossed.has(i) ? " x" : "") + (solved && o.correct ? " ok" : "")} disabled={crossed.has(i) || solved} onClick={() => answerChoice(i)}>
                  {o.text}
                </button>
              ))}
            </div>
          )}
          {q.type === "num" && (
            <form className="numrow" onSubmit={answerNumber}>
              <label className="sr-only" htmlFor={`ans-${q.id}`}>Your answer</label>
              <input ref={inputRef} id={`ans-${q.id}`} className={"num" + (wrong && !solved ? " bad" : "")} type="text" inputMode="decimal" autoComplete="off" value={num} disabled={solved}
                placeholder={q.kind === "count" ? "e.g. 4" : q.kind === "ratio" ? "e.g. 1.5" : q.kind === "decimal" ? "e.g. 0.44" : "e.g. 3/4, 0.75 or 75%"} onChange={(e) => setNum(e.target.value)} />
              <button className="btn" type="submit" disabled={solved}>Check</button>
            </form>
          )}
          {q.type === "tap" && (
            <div className="row">
              <button type="button" className="btn" disabled={solved || picked.size === 0} onClick={answerTap}>Check my picks</button>
              <span className="worth" style={{ marginTop: 0 }}>{picked.size} selected</span>
            </div>
          )}
          {wrong > 0 && !solved && <p className="worth">Now worth {pointsFor(wrong)} point{pointsFor(wrong) > 1 ? "s" : ""}</p>}
        </section>
        {hint && !solved && <Owner level={wrong ? `${levels[Math.min(wrong - 1, 2)]} · try again` : undefined}>{hint}</Owner>}
        {solved && (
          <>
            <Owner tone="ok">Right. {q.explain}</Owner>
            <div className="row">
              <button type="button" className="btn" ref={nextRef} onClick={next}>{qi + 1 >= questions.length ? finishLabel : "Next question"}</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
