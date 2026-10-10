import type { AnyActivity } from "../core/types";
import { basketDetective } from "./association-rules/missions";
import { loanOfficer } from "./decision-trees/missions";

export const ACTIVITIES: AnyActivity[] = [basketDetective, loanOfficer];

export const findActivity = (id: string) => ACTIVITIES.find((a) => a.id === id);
