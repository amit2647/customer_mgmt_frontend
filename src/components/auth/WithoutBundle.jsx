import { Navigate, Outlet, useLocation } from "react-router-dom";

import { useBundle } from "../../context/BundleContext";

/*
 * Core screens that a profession bundle replaces with its own (Leads → the
 * prospect board, Customers → Clients). With a bundle the URL redirects —
 * `redirectTo` is a path, or a function of the current path so a record keeps
 * its place (/customers/12/edit → /clients/12/edit); without one it renders
 * exactly as before. Nothing renders until the installed bundle is known, so
 * the old screen never flashes first.
 */
function WithoutBundle({ redirectTo }) {
  const { bundle, ready } = useBundle();
  const location = useLocation();

  if (!ready) return null;
  if (!bundle) return <Outlet />;

  const target = typeof redirectTo === "function" ? redirectTo(location.pathname) : redirectTo;

  return <Navigate to={`${target}${location.search}`} replace />;
}

export default WithoutBundle;
