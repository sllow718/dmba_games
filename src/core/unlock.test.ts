import { describe, expect, it } from "vitest";
import { basketDetective as a } from "../activities/association-rules/missions";
import { activitySummary, isOpen } from "./unlock";
import type { Progress } from "./progress";
import { blankMission } from "./progress";

const prog = (done: number[]): Progress => ({
  version: 1,
  missions: Object.fromEntries(done.map((n) => [`${a.id}:${n}`, { ...blankMission(), completed: true, bestStars: 2, bestPoints: 8 }])),
});

describe("unlocking", () => {
  it("opens every mission from the start", () => {
    expect(a.missions.map((m) => isOpen(prog([]), a, m.n))).toEqual([true, true, true, true, true, true]);
  });
  it("summarises progress", () => {
    expect(activitySummary(prog([1, 2]), a)).toMatchObject({ done: 2, stars: 4, next: 3, xp: 160 });
  });
});
