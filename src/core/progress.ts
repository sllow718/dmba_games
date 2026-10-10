import { useSyncExternalStore } from "react";

export interface CheckpointState {
  qi: number; // current question index
  points: number;
  firstTry: number;
}

export interface MissionProgress {
  completed: boolean;
  bestStars: number;
  bestPoints: number;
  /** 0 review, 1 explore, 2 checkpoint, 3 results */
  stage: number;
  checkpoint?: CheckpointState;
  /** Wrong attempts per question id on the latest run, for a future teacher view. */
  attempts: Record<string, number>;
  /** Result of the latest completed run, shown on the results stage. */
  last?: { points: number; max: number; stars: number; firstTry: number; unlocked: boolean };
}

export interface Progress {
  version: 1;
  missions: Record<string, MissionProgress>;
  /** Mission key that was just unlocked, shown as "New" on the map until opened. */
  fresh?: string;
}

const KEY = "dmba-games:progress";
const empty = (): Progress => ({ version: 1, missions: {} });

function load(): Progress {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return empty();
    const p = JSON.parse(raw) as Progress;
    return p && p.version === 1 && p.missions ? p : empty();
  } catch {
    return empty();
  }
}

let state: Progress = load();
const listeners = new Set<() => void>();

function save() {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage blocked (private mode etc.): progress lasts for this visit only.
  }
}

export function update(fn: (p: Progress) => Progress) {
  state = fn(state);
  save();
  listeners.forEach((l) => l());
}

export const useProgress = () =>
  useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    () => state,
  );

export const missionKey = (activity: string, n: number) => `${activity}:${n}`;

export const blankMission = (): MissionProgress => ({ completed: false, bestStars: 0, bestPoints: 0, stage: 0, attempts: {} });

export function getMission(p: Progress, key: string): MissionProgress {
  return p.missions[key] ?? blankMission();
}

export function patchMission(key: string, patch: Partial<MissionProgress>) {
  update((p) => ({ ...p, missions: { ...p.missions, [key]: { ...getMission(p, key), ...patch } } }));
}

export function resetProgress() {
  update(() => empty());
}

/** Stars from the share of maximum points: ≥ 90% three, ≥ 60% two, otherwise one. */
export function starsFor(points: number, max: number): number {
  const r = max ? points / max : 0;
  return r >= 0.9 ? 3 : r >= 0.6 ? 2 : 1;
}

/** Points for a correct answer after `wrong` wrong attempts. */
export const pointsFor = (wrong: number) => (wrong === 0 ? 3 : wrong === 1 ? 2 : 1);
