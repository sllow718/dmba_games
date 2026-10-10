import { describe, expect, it } from "vitest";
import { apriori, combinations, count, parseAnswer, ruleStats, strongRules, support } from "./engine";
import { SATURDAY, SATURDAY_ITEMS, WEEK } from "./data";

const r2 = (x: number) => Math.round(x * 100) / 100;

describe("counting and support on the Saturday receipts", () => {
  it.each([
    [["Bread"], 6], [["Butter"], 5], [["Milk"], 6], [["Eggs"], 4], [["Coffee"], 3], [["Cookies"], 3],
    [["Bread", "Butter"], 5], [["Bread", "Milk"], 3], [["Coffee", "Cookies"], 2], [["Milk", "Eggs"], 2],
    [["Bread", "Butter", "Milk"], 3], [["Bread", "Butter", "Eggs"], 2],
  ])("count(%j) = %i", (items, n) => {
    expect(count(SATURDAY, items)).toBe(n);
  });

  it("support is count over all receipts", () => {
    expect(support(SATURDAY, ["Bread", "Butter"])).toBe(0.5);
    expect(support(SATURDAY, ["Coffee", "Cookies"])).toBe(0.2);
  });

  it("a combination is never more common than its items", () => {
    expect(support(SATURDAY, ["Bread", "Butter"])).toBeLessThanOrEqual(support(SATURDAY, ["Butter"]));
  });
});

describe("rules used in the missions", () => {
  const stats = (a: string[], b: string[]) => ruleStats(SATURDAY, { if: a, then: b });

  it("Butter → Bread is strong", () => {
    const s = stats(["Butter"], ["Bread"]);
    expect([s.support, s.confidence, r2(s.lift)]).toEqual([0.5, 1, 1.67]);
  });
  it("Bread → Butter: same support, lower confidence", () => {
    const s = stats(["Bread"], ["Butter"]);
    expect([s.support, r2(s.confidence), r2(s.lift)]).toEqual([0.5, 0.83, 1.67]);
  });
  it("Coffee → Cookies: rare but strong", () => {
    const s = stats(["Coffee"], ["Cookies"]);
    expect([s.support, r2(s.confidence), r2(s.lift)]).toEqual([0.2, 0.67, 2.22]);
  });
  it("Bread → Milk: lift below 1", () => {
    const s = stats(["Bread"], ["Milk"]);
    expect([s.support, s.confidence, r2(s.lift)]).toEqual([0.3, 0.5, 0.83]);
  });
  it("{Bread, Butter} → Milk: lift exactly 1", () => {
    const s = stats(["Bread", "Butter"], ["Milk"]);
    expect([s.support, s.confidence, r2(s.lift)]).toEqual([0.3, 0.6, 1]);
  });
  it("Eggs → Bread", () => {
    const s = stats(["Eggs"], ["Bread"]);
    expect([s.confidence, r2(s.lift)]).toEqual([0.75, 1.25]);
  });
});

describe("apriori at 30% (3 of 10)", () => {
  const res = apriori(SATURDAY, 3, SATURDAY_ITEMS);
  it("keeps all six singles", () => {
    expect(res.levels[0].candidates.every((c) => c.status === "frequent")).toBe(true);
  });
  it("finds four frequent pairs", () => {
    const pairs = res.levels[1].candidates.filter((c) => c.status === "frequent").map((c) => c.items.join("·"));
    expect(pairs).toEqual(["Bread·Butter", "Bread·Milk", "Bread·Eggs", "Butter·Milk"]);
    expect(res.levels[1].candidates).toHaveLength(15);
  });
  it("prunes two triples without counting and keeps one", () => {
    const l3 = res.levels[2].candidates;
    expect(l3.map((c) => [c.items.join("·"), c.status])).toEqual([
      ["Bread·Butter·Milk", "frequent"],
      ["Bread·Butter·Eggs", "pruned"],
      ["Bread·Milk·Eggs", "pruned"],
    ]);
    expect(l3[1].rareSubset).toEqual(["Butter", "Eggs"]);
  });
  it("uses 220 receipt checks instead of 630", () => {
    expect(res.checks).toBe(220);
    expect(res.naiveChecks).toBe(630);
  });
});

describe("strong rules in the week sample", () => {
  const rules = strongRules(WEEK, { minSupport: 0.2, minConfidence: 0.6, minLift: 1 });
  const names = rules.map((r) => `${r.if.join("+")}→${r.then.join("+")}`);
  it("includes the designed rules", () => {
    expect(names).toEqual(expect.arrayContaining(["Pasta+Tomato→Cheese", "Fries→Soda", "Coffee→Cookies"]));
  });
  it("excludes the decoys", () => {
    expect(names).not.toContain("Wine→Cheese"); // strong but only 10% support
    expect(names.some((n) => n.endsWith("→Milk"))).toBe(false); // milk is everywhere: lift < 1
    expect(r2(ruleStats(WEEK, { if: ["Wine"], then: ["Cheese"] }).lift)).toBe(4.29);
    expect(ruleStats(WEEK, { if: ["Pasta"], then: ["Milk"] }).lift).toBeLessThan(1);
  });
  it("Pasta + Tomato → Cheese", () => {
    const s = ruleStats(WEEK, { if: ["Pasta", "Tomato"], then: ["Cheese"] });
    expect([s.support, s.confidence, r2(s.lift)]).toEqual([0.2, 0.75, 3.21]);
  });
});

describe("combinations", () => {
  it("lists pairs in order", () => {
    expect(combinations(["a", "b", "c"], 2)).toEqual([["a", "b"], ["a", "c"], ["b", "c"]]);
  });
});

describe("parseAnswer", () => {
  it.each([
    ["5/6", 5 / 6], ["0.83", 0.83], ["83%", 0.83], ["83", 0.83], [" 50 % ", 0.5], ["0,5", 0.5], ["1", 1],
  ])("%s", (raw, v) => {
    expect(parseAnswer(raw)).toBeCloseTo(v, 6);
  });
  it("rejects junk", () => {
    expect(parseAnswer("")).toBeNaN();
    expect(parseAnswer("abc")).toBeNaN();
    expect(parseAnswer("1/0")).toBeNaN();
    expect(parseAnswer("1/2/3")).toBeNaN();
  });
  it("keeps ratios over 1 when asked", () => {
    expect(parseAnswer("2.22", { percentOver1: false })).toBeCloseTo(2.22);
  });
});
