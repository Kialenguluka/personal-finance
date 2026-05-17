import { useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: "user" | "admin";
  preferredLang: "pt" | "en";
  currency: string;
  createdAt: string;
}

export function useAuth() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem("auth_user");
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState(false);

  const token = localStorage.getItem("token");
  const isAuthenticated = !!token && !!user;

  const login = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem("token", token);
    localStorage.setItem("auth_user", JSON.stringify(user));
    setUser(user);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("auth_user");
    setUser(null);
    queryClient.clear();
  }, [queryClient]);

  const updateUser = useCallback((updated: AuthUser) => {
    localStorage.setItem("auth_user", JSON.stringify(updated));
    setUser(updated);
  }, []);

  return { user, isAuthenticated, isLoading, login, logout, updateUser };
}
