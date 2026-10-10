import { useState } from "react";
import type { ActivityDef } from "../core/types";
import { getMission, missionKey, useProgress } from "../core/progress";
import { activitySummary, isOpen } from "../core/unlock";
import { navigate, takeFlash } from "../core/router";
import { LockIcon, Owner, Stars, TopBar } from "../components/ui";

export function MissionMap({ activity }: { activity: ActivityDef }) {
  const p = useProgress();
  const [msg, setMsg] = useState<string | null>(() => takeFlash());
  const s = activitySummary(p, activity);
  const say = msg ?? (s.done === s.total
    ? "Every aisle is done. Replay any of them to beat your score, or flip through your formula cards."
    : s.done === 0
      ? "Six aisles, one idea each. Start with Aisle 1. The next aisle opens when you finish the one before."
      : `Aisle ${s.next} is next. Pick up where you left off.`);

  return (
    <>
      <TopBar title={activity.shop} sub={activity.title}>
        <span>Done <b>{s.done} / {s.total}</b></span>
        <span>Stars <b>{s.stars} / {s.maxStars}</b></span>
        <a className="link" href={`#/${activity.id}/cards`}>Formula cards</a>
        <a className="link" href="#/">Street</a>
      </TopBar>
      <main>
        <div className="page-head">
          <h1>{activity.title}</h1>
          <p>{activity.topic} at Mrs Tan's minimart. Each aisle is one mission: a quick review, a hands-on task and a checkpoint.</p>
        </div>
        <div style={{ maxWidth: 720, marginBottom: 22 }}><Owner>{say}</Owner></div>
        <div className="aisles">
          {activity.missions.map((m) => {
            const mp = getMission(p, missionKey(activity.id, m.n));
            const open = isOpen(p, activity, m.n);
            const cls = mp.completed ? "done" : open ? "cur" : "lock";
            const fresh = p.fresh === missionKey(activity.id, m.n);
            return (
              <button key={m.n} type="button" className={"aisle " + cls} aria-disabled={!open}
                aria-label={`Aisle ${m.n}, ${m.title}. ${mp.completed ? `Done, ${mp.bestStars} stars.` : open ? (mp.stage > 0 ? "In progress." : "Open.") : `Closed until you finish aisle ${m.n - 1}.`}`}
                onClick={() => {
                  if (!open) { setMsg(`Aisle ${m.n} is still closed. Finish Aisle ${m.n - 1}: ${activity.missions[m.n - 2].title} first.`); return; }
                  navigate(`/${activity.id}/mission-${m.n}`);
                }}>
                {fresh && open && !mp.completed && <span className="new">New</span>}
                <span className="no">{!open && <LockIcon />}Aisle {m.n} · {mp.completed ? "done" : open ? (mp.stage > 0 ? "in progress" : "play now") : "closed"}</span>
                <span className="nm">{m.title}</span>
                {mp.completed ? <Stars n={mp.bestStars} /> : <span className="ds">{open ? m.concept : `Finish Aisle ${m.n - 1} to open`}</span>}
              </button>
            );
          })}
        </div>
      </main>
    </>
  );
}
