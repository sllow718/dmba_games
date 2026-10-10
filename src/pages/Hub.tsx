import { useState } from "react";
import { ACTIVITIES, COMING_SOON } from "../activities";
import { resetProgress, update, useProgress } from "../core/progress";
import { activitySummary } from "../core/unlock";
import { Owner, Stars, TopBar } from "../components/ui";

export function Hub() {
  const p = useProgress();
  const [confirm, setConfirm] = useState(false);
  const total = ACTIVITIES.reduce((s, a) => s + activitySummary(p, a).xp, 0);
  return (
    <>
      <TopBar title="DMBA Games" sub="Data mining, one shop at a time">
        {p.name && <span>{p.name}</span>}
        <span>XP <b>{total}</b></span>
      </TopBar>
      <main>
        <div className="page-head">
          <h1>Pick a shop</h1>
          <p>Each shop on the street teaches one data-mining technique through short missions. Corner Mart is open now.</p>
        </div>
        <div className="split" style={{ marginBottom: 26 }}>
          <Owner>
            {p.name ? <>Welcome back, {p.name}. </> : <>Hello! I'm Mrs Tan, and I run Corner Mart. </>}
            I've got a week of receipts and no idea what my customers buy together. That's where you come in.
          </Owner>
          <form className="card row" onSubmit={(e) => e.preventDefault()}>
            <label htmlFor="name" style={{ fontWeight: 700 }}>Your name</label>
            <input id="name" className="num" style={{ fontSize: "1rem", flex: 1, minWidth: 0 }} maxLength={30} autoComplete="off" placeholder="What should Mrs Tan call you?"
              value={p.name} onChange={(e) => { const name = e.target.value; update((q) => ({ ...q, name })); }} />
          </form>
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
          {COMING_SOON.map((c) => (
            <div key={c.shop} className="shop closed" aria-label={`${c.shop}: opening soon`}>
              <div className="awning" />
              <div className="in">
                <span className="sign">{c.shop}</span>
                <span className="topic">{c.title} · {c.topic.toLowerCase()}</span>
                <span className="st">Opening soon</span>
              </div>
            </div>
          ))}
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
