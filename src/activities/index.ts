import type { ActivityDef } from "../core/types";
import { basketDetective } from "./association-rules/missions";

export const ACTIVITIES: ActivityDef[] = [basketDetective];

export const findActivity = (id: string) => ACTIVITIES.find((a) => a.id === id);
