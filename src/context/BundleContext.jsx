import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { getInstalledBundle } from "../api/bundles";
import { useAuth } from "./AuthContext";

/*
 * The organization's installed profession bundle — its vocabulary, field
 * schemas, identifiers, people roles and pipeline — loaded once per sign-in.
 *
 * `bundle` is null for an organization without one, and every bundle screen
 * and label keys off that: such an organization sees the product unchanged.
 */

const BundleContext = createContext({ bundle: null, loading: false, ready: true, refresh: () => {}, term: (key, many) => key });

export function BundleProvider({ children }) {
  const { user } = useAuth();
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(false);
  // Whether the first answer for this sign-in has arrived. Until then "no
  // bundle" is unknown, not false, so a screen that redirects on it waits.
  const [settledFor, setSettledFor] = useState(undefined);
  // Lookups can overlap (StrictMode signs in twice, so `user` changes while the
  // first is in flight) and answer out of order. Only the newest may settle
  // the session; an older answer settling last left `ready` false for good.
  const latest = useRef(0);

  const refresh = useCallback(async () => {
    const call = ++latest.current;

    if (!user) {
      setBundle(null);
      setSettledFor(null);
      return;
    }

    let next = null;

    try {
      setLoading(true);
      const data = await getInstalledBundle();
      next = data?.bundle || null;
    } catch {
      // Without it the product works as it does for an organization with no
      // bundle; the bundle screens simply do not appear.
      next = null;
    }

    if (call !== latest.current) return;

    setBundle(next);
    setLoading(false);
    setSettledFor(user);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const value = useMemo(() => {
    // term("client") → "Client", term("client", true) → "Clients".
    const term = (key, many = false) => {
      const entry = bundle?.vocabulary?.[key];

      if (!entry) {
        return many ? `${key[0].toUpperCase()}${key.slice(1)}s` : `${key[0].toUpperCase()}${key.slice(1)}`;
      }

      return many ? entry.many : entry.one;
    };

    return { bundle, loading, ready: settledFor === (user || null), refresh, term };
  }, [bundle, loading, refresh, settledFor, user]);

  return <BundleContext.Provider value={value}>{children}</BundleContext.Provider>;
}

export function useBundle() {
  return useContext(BundleContext);
}
