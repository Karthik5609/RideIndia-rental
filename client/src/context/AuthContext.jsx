import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

function parseStoredUser() {
  const raw = localStorage.getItem("ride_india_user");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    localStorage.removeItem("ride_india_user");
    return null;
  }
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("ride_india_token"));
  const [user, setUser] = useState(parseStoredUser);
  const [authLoading, setAuthLoading] = useState(false);

  const persistAuth = (nextToken, nextUser) => {
    localStorage.setItem("ride_india_token", nextToken);
    localStorage.setItem("ride_india_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

  const refreshUser = useCallback(async () => {
    if (!token) return null;
    const { data } = await api.get("/auth/me");
    if (data?.data) {
      localStorage.setItem("ride_india_user", JSON.stringify(data.data));
      setUser(data.data);
      return data.data;
    }
    return null;
  }, [token]);

  const login = async ({ email, password }) => {
    setAuthLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      persistAuth(data.token, data.user);
      return data.user;
    } finally {
      setAuthLoading(false);
    }
  };

  const register = async ({ name, email, password }) => {
    setAuthLoading(true);
    try {
      const { data } = await api.post("/auth/register", { name, email, password });
      persistAuth(data.token, data.user);
      return data.user;
    } finally {
      setAuthLoading(false);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem("ride_india_token");
    localStorage.removeItem("ride_india_user");
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    if (!token) return;

    let active = true;
    refreshUser().catch((error) => {
      if (!active) return;
      const status = error?.response?.status;
      // Only force logout for truly invalid/expired sessions.
      if (status === 401 || status === 403) {
        logout();
      }
    });

    return () => {
      active = false;
    };
  }, [token, refreshUser, logout]);

  const value = useMemo(
    () => ({
      token,
      user,
      authLoading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout,
      refreshUser
    }),
    [token, user, authLoading, refreshUser]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
