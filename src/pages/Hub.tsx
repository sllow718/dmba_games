import { useState } from "react";
import { ACTIVITIES } from "../activities";
import { resetProgress, useProgress } from "../core/progress";
import { activitySummary } from "../core/unlock";
import { Owner, Stars, TopBar } from "../components/ui";

export function Hub() {
  const p = useProgress();
  const [confirm, setConfirm] = useState(false);
  const total = ACTIVITIES.reduce((s, a) => s + activitySummary(p, a).xp, 0);
  return (
    <>
      <TopBar title="DMBA Learn" sub="Data mining, one shop at a time">
        <span>XP <b>{total}</b></span>
      </TopBar>
      <main>
        <div className="page-head">
          <h1>Pick a shop</h1>
          <p>Each shop on the street teaches one data-mining technique through short missions.</p>
        </div>
        <div className="stack" style={{ marginBottom: 26 }}>
          {ACTIVITIES.map((a) => <Owner key={a.id} who={a.theme.owner}>{a.theme.greeting}</Owner>)}
        </div>
        <div className="street">
          {ACTIVITIES.map((a) => {
            const s = activitySummary(p, a);
            return (
              <a key={a.id} className="shop" href={`#/${a.id}`}>
                <div className="awning" />
                <div className="in">
                  <span className="sign">{a.shop}</span>
                  <span className="topic">{a.title} · {a.topic.toLowerCase()}</span>
                  <span className="st">
                    {s.done === s.total ? "All missions done" : s.done ? `Mission ${s.next} of ${s.total}` : "Start here →"}
                    {s.done > 0 && <Stars n={Math.round(s.stars / s.done)} size="1rem" />}
                    <span>{s.stars} / {s.maxStars} stars</span>
                  </span>
                </div>
              </a>
            );
          })}
        </div>
        <div className="footer-note row">
          <span>Progress is saved in this browser only.</span>
          {!confirm ? (
            <button type="button" className="btn alt small" onClick={() => setConfirm(true)}>Reset progress</button>
          ) : (
            <span className="row">
              <span>Delete all progress and stars?</span>
              <button type="button" className="btn small" onClick={() => { resetProgress(); setConfirm(false); }}>Yes, reset</button>
              <button type="button" className="btn alt small" onClick={() => setConfirm(false)}>Cancel</button>
            </span>
          )}
        </div>
      </main>
    </>
  );
}
