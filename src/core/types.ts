import type { ComponentType, ReactNode } from "react";

export type Transaction = readonly string[];

/**
 * Which receipts to light up. Receipts with every `lit` item get a yellow outline; if `both`
 * is given, receipts that also have every `both` item turn green and, with `only`, the
 * yellow-only ones fade. Every other receipt fades.
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
  /** Receipts to light up from hint 2 onwards and after a correct answer. */
  highlight?: Highlight;
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
  /** count: whole receipts; proportion: 0–1, typed as a fraction, decimal or %; ratio: e.g. lift */
  kind: "count" | "proportion" | "ratio";
  tolerance?: number;
  traps?: { value: number; hint: string }[];
  /** Hint 1 when the wrong number matches no trap. */
  first: string;
}

export interface TapQuestion extends QuestionBase {
  type: "tap";
  /** Correct receipts are those that contain every one of these items. */
  items: string[];
}

export type Question = ChoiceQuestion | NumberQuestion | TapQuestion;

export interface ExploreProps {
  data: Transaction[];
  /** Call once the explore task is complete; unlocks the checkpoint. */
  onDone: () => void;
  done: boolean;
}

export interface MissionDef {
  n: number;
  title: string;
  concept: string;
  badge: string;
  data: Transaction[];
  dataLabel: string;
  brief: string;
  review: ReviewDef;
  explore: { goal: string; Component: ComponentType<ExploreProps> };
  questions: Question[];
  /** Formula card saved to the collection once complete. */
  card: { formula: string; example: string };
}

export interface ActivityDef {
  id: string;
  shop: string;
  title: string;
  topic: string;
  missions: MissionDef[];
}
