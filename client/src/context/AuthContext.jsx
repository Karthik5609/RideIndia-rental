import { createContext, useContext, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(localStorage.getItem("ride_india_token"));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("ride_india_user");
    return raw ? JSON.parse(raw) : null;
  });
  const [authLoading, setAuthLoading] = useState(false);

  const persistAuth = (nextToken, nextUser) => {
    localStorage.setItem("ride_india_token", nextToken);
    localStorage.setItem("ride_india_user", JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  };

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

  const logout = () => {
    localStorage.removeItem("ride_india_token");
    localStorage.removeItem("ride_india_user");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      token,
      user,
      authLoading,
      isAuthenticated: Boolean(token),
      login,
      register,
      logout
    }),
    [token, user, authLoading]
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

