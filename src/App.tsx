import { findActivity } from "./activities";
import { ActivityContext } from "./core/activity";
import { usePath } from "./core/router";
import { Hub } from "./pages/Hub";
import { MissionMap } from "./pages/MissionMap";
import { MissionPage } from "./pages/MissionPage";
import { FormulaCards } from "./pages/FormulaCards";

export function App() {
  const path = usePath();
  const [, id, sub] = path.split("/");
  const activity = id ? findActivity(id) : undefined;
  if (!activity) return <Hub />;
  const m = sub ? /^mission-(\d+)$/.exec(sub) : null;
  return (
    <ActivityContext.Provider value={activity}>
      {sub === "cards" ? (
        <FormulaCards activity={activity} />
      ) : m ? (
        <MissionPage key={path} activity={activity} n={Number(m[1])} />
      ) : (
        <MissionMap key={path} activity={activity} />
      )}
    </ActivityContext.Provider>
  );
}
