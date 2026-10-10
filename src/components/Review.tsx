import { useEffect, useRef, useState } from "react";
import type { ReviewDef, Transaction } from "../core/types";
import { Owner, Slips } from "./ui";

interface Props {
  def: ReviewDef;
  data: readonly Transaction[];
  dataLabel: string;
  compact?: boolean;
  brief?: string;
  finishLabel: string;
  onFinish: () => void;
}

/** Four-card quick review: what it is, how to calculate it, a step-by-step worked example, key points. */
export function Review({ def, data, dataLabel, compact, brief, finishLabel, onFinish }: Props) {
  const [card, setCard] = useState(0);
  const [step, setStep] = useState(0);
  const focusRef = useRef<HTMLButtonElement>(null);
  const moved = useRef(false);

  useEffect(() => {
    if (moved.current) focusRef.current?.focus();
  }, [card, step]);

  const last = card === 3;
  const highlight = card === 2 && step > 0 ? def.steps[step - 1].highlight : null;
  const say = card === 2 && step > 0 ? def.steps[step - 1].say : card === 0 && brief ? brief : def.says[card];
  const go = (c: number) => { moved.current = true; setCard(c); };

  return (
    <div className="split">
      <section className="card rv-card" aria-live="polite" aria-label={`Review card ${card + 1} of 4`}>
        {card === 0 && (
          <>
            <span className="k">1 · What is it?</span>
            <h2>{def.title}</h2>
            {def.what}
          </>
        )}
        {card === 1 && (
          <>
            <span className="k">2 · How to calculate it</span>
            <h2>The formula</h2>
            {def.how}
          </>
        )}
        {card === 2 && (
          <>
            <span className="k">3 · Worked example</span>
            <h2>{def.exampleTitle}</h2>
            <ol className="rv-steps">
              {def.steps.slice(0, step).map((s, i) => (
                <li key={i} data-n={i + 1}>
                  <span>{s.text}<span className="eq">{s.eq}</span></span>
                </li>
              ))}
            </ol>
            {step < def.steps.length && (
              <div>
                <button type="button" className="btn alt" ref={focusRef} onClick={() => { moved.current = true; setStep(step + 1); }}>
                  Show next step ({step + 1} of {def.steps.length})
                </button>
              </div>
            )}
          </>
        )}
        {card === 3 && (
          <>
            <span className="k">4 · Remember</span>
            <h2>Key points</h2>
            <ul>{def.remember.map((r, i) => <li key={i}>{r}</li>)}</ul>
          </>
        )}
        <div className="row end foot">
          <span className="dots" aria-hidden="true">{[0, 1, 2, 3].map((i) => <i key={i} className={i === card ? "n" : ""} />)}</span>
          <span className="row">
            <button type="button" className="btn alt" disabled={card === 0} onClick={() => go(card - 1)}>Back</button>
            {last ? (
              <button type="button" className="btn" onClick={onFinish}>{finishLabel}</button>
            ) : (
              <button type="button" className="btn" ref={card === 2 && step >= def.steps.length ? focusRef : undefined} onClick={() => go(card + 1)}>Next</button>
            )}
          </span>
        </div>
      </section>
      <div className="stack">
        <p className="data-label">{dataLabel}</p>
        <Slips data={data} highlight={highlight} compact={compact} />
        <Owner>{say}</Owner>
      </div>
    </div>
  );
}
