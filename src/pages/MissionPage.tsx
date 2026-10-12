import { useEffect, useRef, useState } from "react";
import type { AnyActivity, AnyMission } from "../core/types";
import { getMission, missionKey, patchMission, starsFor, update, useProgress } from "../core/progress";
import { isOpen } from "../core/unlock";
import { ActivityContext } from "../core/activity";
import { navigate, setFlash } from "../core/router";
import { Review } from "../components/Review";
import { Checkpoint } from "../components/Checkpoint";
import { Owner, Stars, TopBar } from "../components/ui";

const STAGES = ["Review", "Explore", "Checkpoint", "Results"];

export function MissionPage({ activity, n }: { activity: AnyActivity; n: number }) {
  const { stop } = activity.theme;
  const p = useProgress();
  const m = activity.missions.find((x) => x.n === n);
  const key = missionKey(activity.id, n);
  const mp = getMission(p, key);
  const open = !!m && isOpen(p, activity, n);
  /** A finished stage opened from the stage tabs, shown without changing saved progress. */
  const [view, setView] = useState<number | null>(null);
  const [exploreDone, setExploreDone] = useState(false);
  const completing = useRef(false);
  // A reload after the last checkpoint answer but before "See results" lands on a finished checkpoint.
  // Checked once on load only: during play the last answer also stores qi === length.
  const [finishedUnseen] = useState(() => !!m && open && Math.min(mp.stage, 3) === 2 && !!mp.checkpoint && mp.checkpoint.qi >= m.questions.length);

  useEffect(() => {
    if (!m) navigate("/" + activity.id, { replace: true });
    else if (!open) {
      setFlash(`${stop} ${n} is still closed. Finish ${stop} ${n - 1}: ${activity.missions[n - 2].title} first.`);
      navigate("/" + activity.id, { replace: true });
    } else if (p.fresh === key) update((q) => ({ ...q, fresh: undefined }));
  }, [m, open, n, activity, key, p.fresh]);

  useEffect(() => {
    if (finishedUnseen && m && mp.checkpoint) complete({ points: mp.checkpoint.points, firstTry: mp.checkpoint.firstTry, attempts: mp.attempts }, m);
  });

  if (!m || !open) return null;

  const stage = Math.min(mp.stage, 3);
  const replay = mp.completed;
  const setStage = (s: number) => { completing.current = false; setView(null); patchMission(key, { stage: s }); window.scrollTo(0, 0); };
  const compact = m.data.length > 12;
  const mapPath = "/" + activity.id;

  function complete(r: { points: number; firstTry: number; attempts: Record<string, number> }, mission: AnyMission) {
    if (completing.current) return;
    completing.current = true;
    const max = mission.questions.length * 3;
    const stars = starsFor(r.points, max);
    const nextN = mission.n + 1;
    const hasNext = activity.missions.some((x) => x.n === nextN);
    update((q) => {
      const cur = getMission(q, key);
      const unlocked = !cur.completed && hasNext;
      return {
        ...q,
        fresh: unlocked ? missionKey(activity.id, nextN) : q.fresh,
        missions: {
          ...q.missions,
          [key]: {
            ...cur,
            completed: true,
            stage: 3,
            checkpoint: undefined,
            bestStars: Math.max(cur.bestStars, stars),
            bestPoints: Math.max(cur.bestPoints, r.points),
            attempts: r.attempts,
            last: { points: r.points, max, stars, firstTry: r.firstTry, unlocked },
          },
        },
      };
    });
    window.scrollTo(0, 0);
  }

  if (finishedUnseen && stage === 2) return null;

  const next = activity.missions.find((x) => x.n === n + 1);
  // Stages already finished on this run, or any stage once the aisle has been completed before.
  const canView = (i: number) => i !== stage && (i < stage || (replay && (i < 3 || !!mp.last)));
  const shown = view ?? stage;
  const openView = (i: number) => { setView(i === stage ? null : i); window.scrollTo(0, 0); };
  const back = () => openView(stage);
  const backLabel = `Back to ${STAGES[stage].toLowerCase()}`;

  return (
    <ActivityContext.Provider value={m.view ? { ...activity, view: m.view } : activity}>
      <TopBar title={`${stop} ${n} · ${m.title}`} sub={STAGES[shown]} home={mapPath}>
        <span className="pips" aria-hidden="true">{STAGES.map((_, i) => <i key={i} className={i < stage ? "d" : i === stage ? "n" : ""} />)}</span>
        {stage > 0 && stage < 3 && <button type="button" className="link" onClick={() => openView(view === 0 ? stage : 0)}>{view === 0 ? "Close review" : "Review ↺"}</button>}
        <a className="link" href={"#" + mapPath}>Mission map</a>
      </TopBar>
      <main>
        <div className="stage-row" aria-label="Mission stages">
          {STAGES.map((s, i) => {
            const cls = (i < stage || (replay && i !== stage) ? "d" : i === stage ? "n" : "t") + (view !== null && i === shown ? " on" : "");
            const label = <>{i < stage || (replay && i !== stage) ? "✓ " : ""}{s}</>;
            return view !== null && i === stage ? (
              <button key={s} type="button" className={cls} onClick={back} aria-current="step">{label}</button>
            ) : canView(i) ? (
              <button key={s} type="button" className={cls} onClick={() => openView(i)} aria-pressed={i === shown}>{label}</button>
            ) : (
              <span key={s} className={cls} aria-current={i === stage ? "step" : undefined}>{label}</span>
            );
          })}
        </div>

        {view !== null && view !== 0 && (
          <p className="worth" style={{ margin: "0 0 16px" }}>
            {view === 2 ? "Practice run: your stars and score won't change." : `Looking back at ${STAGES[view].toLowerCase()}. Your progress is saved.`}
            {` Tap ${STAGES[stage]} to carry on.`}
          </p>
        )}

        {view === 0 ? (
          <Review def={m.review} data={m.data} dataLabel={m.dataLabel} compact={compact} finishLabel={backLabel} onFinish={back} />
        ) : view === 1 ? (
          <m.explore.Component data={m.data} done={exploreDone} onDone={() => setExploreDone(true)} />
        ) : view === 2 ? (
          <Checkpoint key="practice" questions={m.questions} data={m.data} dataLabel={m.dataLabel} compact={compact}
            onProgress={() => {}} onComplete={back} finishLabel={backLabel} />
        ) : view === 3 ? (
          <Results mission={m} last={mp.last} best={mp.bestStars} next={next} activity={activity} onReplay={() => setStage(0)} />
        ) : stage === 0 ? (
          <>
            {replay && (
              <div className="row" style={{ marginBottom: 14 }}>
                <span className="worth" style={{ marginTop: 0 }}>You've done this {stop.toLowerCase()} before.</span>
                <button type="button" className="btn alt small" onClick={() => setStage(1)}>Skip review</button>
              </div>
            )}
            <Review def={m.review} data={m.data} dataLabel={m.dataLabel} compact={compact} brief={m.brief} finishLabel="Start exploring" onFinish={() => setStage(1)} />
          </>
        ) : stage === 1 ? (
          <>
            <div className="row end" style={{ marginBottom: 16 }}>
              <p style={{ margin: 0, fontWeight: 700 }}>{m.explore.goal}</p>
              <span className="row">
                {!exploreDone && !replay && <span className="worth" style={{ marginTop: 0 }}>Finish the task to unlock the checkpoint</span>}
                <button type="button" className="btn" disabled={!exploreDone && !replay} onClick={() => setStage(2)}>Go to the checkpoint →</button>
              </span>
            </div>
            <m.explore.Component data={m.data} done={exploreDone} onDone={() => setExploreDone(true)} />
          </>
        ) : stage === 2 ? (
          <Checkpoint
            key={key}
            questions={m.questions}
            data={m.data}
            dataLabel={m.dataLabel}
            compact={compact}
            initial={mp.checkpoint}
            onProgress={(c) => patchMission(key, { checkpoint: c })}
            onComplete={(r) => complete(r, m)}
          />
        ) : (
          <Results mission={m} last={mp.last} best={mp.bestStars} next={next} activity={activity} onReplay={() => setStage(0)} />
        )}
      </main>
    </ActivityContext.Provider>
  );
}

function Results({ mission, last, best, next, activity, onReplay }: {
  mission: AnyMission; last?: { points: number; max: number; stars: number; firstTry: number; unlocked: boolean }; best: number;
  next?: AnyMission; activity: AnyActivity; onReplay: () => void;
}) {
  const leave = (path: string) => { patchMission(missionKey(activity.id, mission.n), { stage: 0 }); navigate(path); };
  return (
    <div className="split">
      <section className="card" aria-labelledby="res-h">
        <span className="k">Mission complete</span>
        <h2 id="res-h">{mission.title}</h2>
        {last && (
          <>
            <Stars n={last.stars} size="2.4rem" />
            <p style={{ marginTop: 10 }}>{last.firstTry} of {mission.questions.length} answers right first time · {last.points} / {last.max} points · +{last.points * 10} XP</p>
            {best > last.stars && <p className="worth">Your best on this {activity.theme.stop.toLowerCase()} is still {best} stars.</p>}
          </>
        )}
        <div className="row" style={{ margin: "14px 0" }}>
          <span className="badge">{mission.badge.toUpperCase()}</span>
          <span><b>Badge: {mission.badge}</b><br /><span className="worth" style={{ marginTop: 0 }}>Formula card added: {mission.card.formula}</span></span>
        </div>
        <div className="row end" style={{ marginTop: 16 }}>
          <span className="row">
            <button type="button" className="btn alt" onClick={() => leave("/" + activity.id)}>← Mission map</button>
            <button type="button" className="btn alt" onClick={onReplay}>Play again</button>
          </span>
          {next ? (
            <button type="button" className="btn" onClick={() => leave(`/${activity.id}/mission-${next.n}`)}>Go to Mission {next.n} →</button>
          ) : (
            <button type="button" className="btn" onClick={() => leave("/")}>Back to all topics</button>
          )}
        </div>
      </section>
      <div className="stack">
        <Owner tone="ok">
          {next
            ? <>Nice work. Up next: <b>{activity.theme.stop} {next.n}: {next.title}</b>.</>
            : activity.theme.finale}
        </Owner>
      </div>
    </div>
  );
}
