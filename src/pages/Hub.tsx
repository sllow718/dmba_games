import { useState } from "react";
import { ACTIVITIES } from "../activities";
import { resetProgress, useProgress } from "../core/progress";
import { activitySummary } from "../core/unlock";
import { Stars, TopBar } from "../components/ui";

export function Hub() {
  const p = useProgress();
  const [confirm, setConfirm] = useState(false);
  const total = ACTIVITIES.reduce((s, a) => s + activitySummary(p, a).xp, 0);
  return (
    <>
      <TopBar title="DMBA Learn" sub="Data mining for business analytics">
        <span>XP <b>{total}</b></span>
      </TopBar>
      <main>
        <div className="page-head">
          <h1>Pick a topic</h1>
          <p>DMBA Learn is a learning app for data mining in business analytics. Each topic is a short set of guided missions: a quick review, a hands-on activity and a checkpoint with hints. Start with any topic and explore at your own pace.</p>
        </div>
        <div className="topics">
          {ACTIVITIES.map((a) => {
            const s = activitySummary(p, a);
            return (
              <a key={a.id} className="topic-card" href={`#/${a.id}`}>
                <div className="in">
                  <span className="k">{a.missions.length} missions · {a.title}</span>
                  <span className="name">{a.topic}</span>
                  <span className="sum">{a.summary}</span>
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
