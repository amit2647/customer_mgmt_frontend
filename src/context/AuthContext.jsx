import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { jwtDecode } from "jwt-decode";

import {
  getCurrentUser,
  logout as logoutRequest,
  restoreSession,
  submitLogin,
} from "../api/auth";
import { SESSION_ENDED } from "../api/client";
import { getProfile } from "../api/profile";

const AuthContext = createContext(null);

/*
 * The token's `username` is fixed when it is issued, so after a rename it
 * would keep showing the old name until the next sign-in. The profile is read
 * from the database instead and laid over the token's copy.
 */
function overlayProfile(user, profile) {
  if (!profile) {
    return user;
  }

  return {
    ...user,
    username: profile.name,
    name: profile.name,
    email: profile.email,
  };
}

// Best effort: the session works without it, just with the token's name.
async function withProfile(user) {
  try {
    return overlayProfile(user, await getProfile());
  } catch {
    return user;
  }
}

function decode(token) {
  try {
    return jwtDecode(token);
  } catch (error) {
    console.error("Failed to decode authentication token:", error);
    return null;
  }
}

/*
 * The session starts from the refresh cookie (auth-hardening P1): no token is
 * kept anywhere the page's scripts could read it between visits. Under
 * StrictMode this runs twice; restoreSession() shares one refresh between
 * them, so the refresh token is rotated once.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    try {
      const token = await restoreSession();

      if (!token) {
        setUser(null);
        return;
      }

      const data = await getCurrentUser();

      setUser(await withProfile({ ...decode(token), ...(data?.user || data) }));
    } catch (error) {
      console.error("Failed to restore authentication session:", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // A refresh refused mid-session (revoked, expired, deactivated): signed out.
  useEffect(() => {
    const ended = () => setUser(null);
    window.addEventListener(SESSION_ENDED, ended);
    return () => window.removeEventListener(SESSION_ENDED, ended);
  }, []);

  /*
   * The password for Hydra's login_challenge. On success the browser leaves
   * for Hydra's next step (consent, then /auth/callback, then the app), so
   * nothing is returned here.
   */
  async function login(email, password, loginChallenge) {
    const { redirect_to: next } = await submitLogin(email, password, loginChallenge);
    window.location.assign(next);
  }

  async function logout() {
    await logoutRequest();
    setUser(null);
  }

  // Called after the profile page saves, so the header follows at once.
  const applyProfile = useCallback((profile) => {
    setUser((current) => (current ? overlayProfile(current, profile) : current));
  }, []);

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
    applyProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
