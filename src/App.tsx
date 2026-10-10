import { findActivity } from "./activities";
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
  if (!sub) return <MissionMap key={path} activity={activity} />;
  if (sub === "cards") return <FormulaCards activity={activity} />;
  const m = /^mission-(\d+)$/.exec(sub);
  if (m) return <MissionPage key={path} activity={activity} n={Number(m[1])} />;
  return <MissionMap key={path} activity={activity} />;
}
