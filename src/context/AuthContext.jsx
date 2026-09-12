import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  hasSession,
  login as loginRequest,
  logout as logoutRequest,
} from "../api/auth";

const AuthContext = createContext(null);

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
      const data = await getCurrentUser();

      console.log("Authenticated user:", data);

      setUser(data?.user || data);
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

    /*
     * The login endpoint may return only the token.
     * Always fetch /auth/me afterwards so that the
     * frontend gets the authoritative user profile,
     * role and permissions.
     */
    try {
      const currentUser = await getCurrentUser();

      console.log("Current authenticated user:", currentUser);

      const resolvedUser = currentUser?.user || currentUser;

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

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    logout,
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
