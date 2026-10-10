import type { AnyActivity } from "./types";
import type { Progress } from "./progress";
import { getMission, missionKey } from "./progress";

export const isDone = (p: Progress, a: AnyActivity, n: number) => getMission(p, missionKey(a.id, n)).completed;

/** Mission n is open when it is the first one or the one before it is complete. */
export const isOpen = (p: Progress, a: AnyActivity, n: number) => n === 1 || isDone(p, a, n - 1);

export function activitySummary(p: Progress, a: AnyActivity) {
  const ms = a.missions.map((m) => getMission(p, missionKey(a.id, m.n)));
  const done = ms.filter((m) => m.completed).length;
  return {
    done,
    total: a.missions.length,
    stars: ms.reduce((s, m) => s + m.bestStars, 0),
    maxStars: a.missions.length * 3,
    xp: ms.reduce((s, m) => s + m.bestPoints * 10, 0),
    next: a.missions.find((m) => !getMission(p, missionKey(a.id, m.n)).completed)?.n ?? null,
  };
}
