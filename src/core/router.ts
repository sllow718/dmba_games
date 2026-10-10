import { useSyncExternalStore } from "react";

// Hash routing (#/basket-detective/mission-3) so the static build works on any host without rewrites.
const read = () => (window.location.hash.replace(/^#/, "") || "/").replace(/\/+$/, "") || "/";
const subscribe = (cb: () => void) => {
  window.addEventListener("hashchange", cb);
  return () => window.removeEventListener("hashchange", cb);
};

export const usePath = () => useSyncExternalStore(subscribe, read);

export function navigate(path: string, opts: { replace?: boolean } = {}) {
  const url = "#" + path;
  if (opts.replace) window.location.replace(url);
  else window.location.hash = path;
  window.scrollTo(0, 0);
}

// One-shot message carried across a redirect (e.g. "Aisle 5 is still closed").
let flash: string | null = null;
export const setFlash = (m: string) => { flash = m; };
export const takeFlash = () => { const m = flash; flash = null; return m; };
