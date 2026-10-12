import { describe, expect, it } from "vitest";
import { basketDetective } from "./missions";
import { SATURDAY, WEEK } from "./data";
import { count, ruleStats, support } from "./engine";

const S = (a: string[], b: string[]) => ruleStats(SATURDAY, { if: a, then: b });
const W = (a: string[], b: string[]) => ruleStats(WEEK, { if: a, then: b });

// Every numeric checkpoint answer, recomputed from the receipts.
const expected: Record<string, number> = {
  "m2-supp": support(SATURDAY, ["Coffee", "Cookies"]),
  "m2-triple": support(SATURDAY, ["Bread", "Butter", "Milk"]),
  "m3-bb": S(["Bread"], ["Butter"]).confidence,
  "m3-flip": S(["Butter"], ["Bread"]).confidence,
  "m4-base": support(SATURDAY, ["Milk"]),
  "m4-lift": S(["Bread"], ["Milk"]).lift,
  "m5-count": count(SATURDAY, ["Bread", "Butter", "Milk"]),
};

describe("mission content", () => {
  const ms = basketDetective.missions;

  it("has six missions numbered in order", () => {
    expect(ms.map((m) => m.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  for (const m of ms) {
    describe(`mission ${m.n}`, () => {
      it("has 3–5 checkpoint questions with unique ids", () => {
        expect(m.questions.length).toBeGreaterThanOrEqual(3);
        expect(m.questions.length).toBeLessThanOrEqual(5);
        expect(new Set(m.questions.map((q) => q.id)).size).toBe(m.questions.length);
      });
      it("has a 4-card review with worked steps", () => {
        expect(m.review.steps.length).toBeGreaterThan(0);
        expect(m.review.says).toHaveLength(4);
      });
      for (const q of m.questions) {
        it(`${q.id} is answerable with escalating hints`, () => {
          expect(q.ladder).toHaveLength(2);
          if (q.type === "mc") {
            expect(q.options.filter((o) => o.correct)).toHaveLength(1);
            for (const o of q.options) if (!o.correct) expect(o.hint, `wrong option needs a hint`).toBeTruthy();
          }
          if (q.type === "num") {
            expect(expected[q.id], `no recomputed value for ${q.id}`).toBeDefined();
            expect(q.answer).toBeCloseTo(expected[q.id], 6);
            for (const t of q.traps ?? []) expect(Math.abs(t.value - q.answer)).toBeGreaterThan(0.02);
          }
          if (q.type === "tap") {
            expect(m.data.some((t) => q.items.every((i) => t.includes(i)))).toBe(true);
          }
        });
      }
    });
  }
});

describe("numbers quoted in mission text", () => {
  it("Mission 4 rule list", () => {
    expect(S(["Eggs"], ["Milk"]).confidence).toBe(0.5);
    expect(S(["Eggs"], ["Milk"]).lift).toBeCloseTo(0.83, 2);
    expect(S(["Bread", "Butter"], ["Milk"]).lift).toBeCloseTo(1, 6);
  });
  it("Mission 6 rules", () => {
    const pm = W(["Pasta"], ["Milk"]);
    expect([Math.round(pm.support * 100), Math.round(pm.confidence * 100), +pm.lift.toFixed(2)]).toEqual([17, 56, 0.88]);
    const cs = W(["Fries"], ["Soda"]);
    expect([cs.count, cs.countIf, cs.countThen, +cs.lift.toFixed(2)]).toEqual([7, 8, 8, 3.28]);
    const wp = W(["Wine"], ["Cheese"]);
    expect([wp.support, wp.confidence, +wp.lift.toFixed(2)]).toEqual([0.1, 1, 4.29]);
    expect(Math.round(support(WEEK, ["Milk"]) * 100)).toBe(63);
    expect(W(["Pasta", "Tomato"], ["Cheese"]).lift.toFixed(2)).toBe("3.21");
  });
});
