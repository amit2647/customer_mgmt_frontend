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
  hasSession,
  login as loginRequest,
  logout as logoutRequest,
} from "../api/auth";
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

function getUserFromToken() {
  const token = localStorage.getItem("omnicore_access_token");

  if (!token) {
    return null;
  }

  try {
    return jwtDecode(token);
  } catch (error) {
    console.error("Failed to decode authentication token:", error);
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    if (!hasSession()) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const tokenUser = getUserFromToken();

      const data = await getCurrentUser();

      console.log("Authenticated user:", data);
      console.log("Authenticated user from token:", tokenUser);

      const resolvedUser = await withProfile({
        ...tokenUser,
        ...(data?.user || data),
      });

      setUser(resolvedUser);
    } catch (error) {
      console.error("Failed to restore authentication session:", error);

      logoutRequest();
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  async function login(email, password) {
    const loginData = await loginRequest(email, password);

    console.log("Login response:", loginData);

    try {
      const tokenUser = getUserFromToken();

      const currentUser = await getCurrentUser();

      console.log("Current authenticated user:", currentUser);
      console.log("Authenticated user from token:", tokenUser);

      const resolvedUser = await withProfile({
        ...tokenUser,
        ...(currentUser?.user || currentUser),
      });

      setUser(resolvedUser);

      return {
        ...loginData,
        user: resolvedUser,
      };
    } catch (error) {
      logoutRequest();
      setUser(null);
      throw error;
    }
  }

  function logout() {
    logoutRequest();
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
