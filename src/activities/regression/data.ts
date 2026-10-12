import type { Flat } from "./engine";

export interface Listing extends Flat {
  /** 1-based number shown on the chart. */
  id: number;
}

const f = (id: number, x: number, y: number): Listing => ({ id, x, y });

/**
 * 12 recent sales for the lessons: floor area (sqm) and price ($k). They follow
 * roughly $100k + $5k per sqm, with each flat a little above or below that.
 */
export const LISTINGS: Listing[] = [
  f(1, 62, 430), f(2, 68, 415), f(3, 74, 480), f(4, 79, 480), f(5, 85, 555), f(6, 90, 540),
  f(7, 95, 555), f(8, 101, 630), f(9, 108, 635), f(10, 114, 685), f(11, 120, 670), f(12, 128, 745),
];
