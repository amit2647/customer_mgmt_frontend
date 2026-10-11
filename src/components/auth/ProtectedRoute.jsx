import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";

import LoadingScreen from "../common/LoadingScreen";
import { startSignIn } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";

/*
 * Signed out: straight into the sign-in flow (auth-hardening P1), without
 * rendering /login first. Every full page load of a Vite-served app costs
 * seconds, and Hydra brings the browser back to /login with its challenge
 * anyway. The page asked for comes back as `returnTo`.
 */
function ProtectedRoute() {
  const { isAuthenticated, loading } = useAuth();

  const location = useLocation();
  const signedOut = !loading && !isAuthenticated;

  useEffect(() => {
    if (signedOut) startSignIn(`${location.pathname}${location.search}`);
  }, [signedOut, location.pathname, location.search]);

  if (!isAuthenticated) {
    return <LoadingScreen />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
