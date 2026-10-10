import type { ActivityDef } from "../core/types";
import { getMission, missionKey, useProgress } from "../core/progress";
import { LockIcon, TopBar } from "../components/ui";

export function FormulaCards({ activity }: { activity: ActivityDef }) {
  const p = useProgress();
  return (
    <>
      <TopBar title={activity.shop} sub="Formula cards" home={"/" + activity.id}>
        <a className="link" href={`#/${activity.id}`}>Mission map</a>
      </TopBar>
      <main>
        <div className="page-head">
          <h1>Formula cards</h1>
          <p>A card is added each time you finish an aisle. Use them for revision.</p>
        </div>
        <div className="fcards">
          {activity.missions.map((m) => {
            const done = getMission(p, missionKey(activity.id, m.n)).completed;
            return (
              <section key={m.n} className={"card fcard" + (done ? "" : " locked")}>
                <span className="k">Aisle {m.n} · {m.concept}</span>
                {done ? (
                  <>
                    <h2 style={{ fontSize: "1.2rem" }}>{m.review.title}</h2>
                    <div className="formula">{m.card.formula}</div>
                    <p><b>Example:</b> {m.card.example}</p>
                    <ul style={{ marginTop: 8 }}>{m.review.remember.map((r, i) => <li key={i}>{r}</li>)}</ul>
                  </>
                ) : (
                  <p className="row" style={{ marginTop: 8 }}><LockIcon /> Finish Aisle {m.n} to collect this card.</p>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </>
  );
}
