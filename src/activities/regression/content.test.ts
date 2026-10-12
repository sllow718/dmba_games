import { describe, expect, it } from "vitest";
import { LISTINGS } from "./data";
import { predict, r2, residuals } from "./engine";
import { pricePredictor } from "./missions";
import { LESSON_FIT } from "./ui";

describe("Price Predictor content matches the engine", () => {
  it("the lesson line is about $108k + $4.9k per sqm with R² 0.96", () => {
    expect(Math.round(LESSON_FIT.intercept)).toBe(108);
    expect(Math.round(LESSON_FIT.slope * 10) / 10).toBe(4.9);
    expect(Math.round(r2(LESSON_FIT, LISTINGS) * 100) / 100).toBe(0.96);
    expect(Math.round(predict(LESSON_FIT, 90) / 10) * 10).toBe(550);
  });
  it("the flats above the line are the ones the hint names", () => {
    const above = LISTINGS.filter((_, i) => residuals(LESSON_FIT, LISTINGS)[i] > 0).map((m) => m.id);
    expect(above).toEqual([1, 3, 5, 8, 10, 12]);
    const tap = pricePredictor.missions[0].questions.find((q) => q.id === "r1-above")!;
    expect(tap.ladder[1]).toContain("1, 3, 5, 8, 10 and 12");
  });
  it("the review's data range is right", () => {
    const xs = LISTINGS.map((m) => m.x);
    expect([Math.min(...xs), Math.max(...xs)]).toEqual([62, 128]);
  });
  it("has no calculation questions", () => {
    expect(pricePredictor.missions.flatMap((m) => m.questions).some((q) => q.type === "num")).toBe(false);
  });
});
