import { createContext, useContext } from "react";
import type { AnyActivity } from "./types";

/** The shop being played, so shared screens can use its owner, wording and data view. */
export const ActivityContext = createContext<AnyActivity | null>(null);

export function useActivity(): AnyActivity {
  const a = useContext(ActivityContext);
  if (!a) throw new Error("useActivity needs an ActivityContext provider");
  return a;
}

export const useOptionalActivity = () => useContext(ActivityContext);
