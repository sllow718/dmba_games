import type { ComponentType, ReactNode } from "react";

export type Transaction = readonly string[];

/**
 * Which rows to light up. Each string is a tag the activity's `DataView.has` understands: an item
 * name for receipts, a condition like "credit=Good" for applicants. Rows with every `lit` tag get a
 * yellow outline; if `both` is given, rows that also have every `both` tag turn green and, with
 * `only`, the yellow-only ones fade. Every other row fades.
 */
export interface Highlight {
  lit: string[];
  both?: string[];
  only?: boolean;
}

export interface ReviewStep {
  text: ReactNode;
  eq: string;
  say: string;
  highlight?: Highlight;
}

export interface ReviewDef {
  title: string;
  what: ReactNode;
  how: ReactNode;
  exampleTitle: string;
  steps: ReviewStep[];
  remember: ReactNode[];
  /** What Mrs Tan says on each of the four cards before any step is shown. */
  says: [string, string, string, string];
}

interface QuestionBase {
  id: string;
  prompt: ReactNode;
  /** Hint 2 and hint 3+, shown after the 2nd and 3rd wrong attempts. */
  ladder: [string, string];
  /** Shown with every correct answer. */
  explain: string;
  /** Rows to light up from hint 2 onwards and after a correct answer. */
  highlight?: Highlight;
  /** Extra visual shown under the prompt, such as a tree to read. */
  figure?: ReactNode;
}

export interface Option {
  text: ReactNode;
  correct?: boolean;
  /** Targeted nudge for the misconception behind this wrong option. */
  hint?: string;
}

export interface ChoiceQuestion extends QuestionBase {
  type: "mc";
  options: Option[];
  layout?: "grid" | "list";
}

export interface NumberQuestion extends QuestionBase {
  type: "num";
  answer: number;
  /** count: whole rows; proportion: 0–1, typed as a fraction, decimal or %; ratio: e.g. lift; decimal: e.g. Gini 0.44 */
  kind: "count" | "proportion" | "ratio" | "decimal";
  tolerance?: number;
  traps?: { value: number; hint: string }[];
  /** Hint 1 when the wrong number matches no trap. */
  first: string;
}

export interface TapQuestion extends QuestionBase {
  type: "tap";
  /** Correct rows are those that have every one of these tags. */
  items: string[];
  /** What a correct row needs, in words for hints, e.g. "good credit". Defaults to the items. */
  need?: string;
}

export type Question = ChoiceQuestion | NumberQuestion | TapQuestion;

export interface ExploreProps<R = Transaction> {
  data: R[];
  /** Call once the explore task is complete; unlocks the checkpoint. */
  onDone: () => void;
  done: boolean;
}

export interface MissionDef<R = Transaction> {
  n: number;
  title: string;
  concept: string;
  badge: string;
  data: R[];
  dataLabel: string;
  brief: string;
  review: ReviewDef;
  explore: { goal: string; Component: ComponentType<ExploreProps<R>> };
  questions: Question[];
  /** Formula card saved to the collection once complete. */
  card: { formula: string; example: string };
}

export interface GridProps<R> {
  data: readonly R[];
  highlight?: Highlight | null;
  compact?: boolean;
  /** Tap mode: rows become toggle buttons. */
  selected?: Set<number>;
  onToggle?: (i: number) => void;
  marks?: Map<number, "miss" | "extra">;
  label?: string;
}

/** How an activity shows its rows and decides which highlight tags a row has. */
export interface DataView<R> {
  Grid: ComponentType<GridProps<R>>;
  has: (row: R, tag: string) => boolean;
}

/** The words and character that make each shop its own place. */
export interface Theme {
  owner: { name: string; initials: string };
  /** What one mission is called in this shop: "Aisle", "Counter". */
  stop: string;
  /** One row of data, singular and plural: ["receipt", "receipts"]. */
  rows: [string, string];
  /** Lead paragraph on the mission map. */
  intro: string;
  /** The owner's hello on the street page. */
  greeting: string;
  /** The owner's line after the final mission. */
  finale: string;
}

export interface ActivityDef<R = Transaction> {
  id: string;
  shop: string;
  title: string;
  topic: string;
  theme: Theme;
  view: DataView<R>;
  missions: MissionDef<R>[];
}

export type AnyActivity = ActivityDef<any>;
export type AnyMission = AnyActivity["missions"][number];
