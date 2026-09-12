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

const AuthContext = createContext(null);

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

      const resolvedUser = {
        ...tokenUser,
        ...(data?.user || data),
      };

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

      const resolvedUser = {
        ...tokenUser,
        ...(currentUser?.user || currentUser),
      };

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
