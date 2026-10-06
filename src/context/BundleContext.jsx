import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

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

  const refresh = useCallback(async () => {
    if (!user) {
      setBundle(null);
      setSettledFor(null);
      return;
    }

    try {
      setLoading(true);
      const data = await getInstalledBundle();
      setBundle(data?.bundle || null);
    } catch {
      // Without it the product works as it does for an organization with no
      // bundle; the bundle screens simply do not appear.
      setBundle(null);
    } finally {
      setLoading(false);
      setSettledFor(user);
    }
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
