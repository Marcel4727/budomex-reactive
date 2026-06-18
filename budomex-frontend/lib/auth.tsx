"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { api, getToken, setToken } from "./api";

export type Role = "manager" | "worker";

export type AuthUser = {
  username: string;
  fullName: string;
  firstName?: string;
  lastName?: string;
  role: Role;
};

type LoginResponse = {
  token: string;
  username: string;
  roles: string[];
  firstName?: string;
  lastName?: string;
  fullName?: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  /** True until the initial localStorage hydration completes. */
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
};

const USER_KEY = "bdx-oms-user";

const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeRole(roles: string[]): Role | null {
  for (const r of roles) {
    const stripped = r.replace(/^ROLE_/, "").toUpperCase();
    if (stripped === "MANAGER") return "manager";
    if (stripped === "WORKER") return "worker";
  }
  return null;
}

function readStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

function writeStoredUser(user: AuthUser | null) {
  if (typeof window === "undefined") return;
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
    else localStorage.removeItem(USER_KEY);
  } catch {}
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const stored = readStoredUser();
    if (token && stored) setUser(stored);
    setLoading(false);
  }, []);

  const login = useCallback(
    async (username: string, password: string): Promise<AuthUser> => {
      const res = await api<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
      const role = normalizeRole(res.roles);
      if (!role) {
        throw new Error(
          "Konto nie ma roli managera ani pracownika. Skontaktuj się z administratorem.",
        );
      }
      const nextUser: AuthUser = {
        username: res.username,
        fullName: res.fullName?.trim() || res.username,
        firstName: res.firstName,
        lastName: res.lastName,
        role,
      };
      setToken(res.token);
      writeStoredUser(nextUser);
      setUser(nextUser);
      return nextUser;
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    writeStoredUser(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, loading, login, logout }),
    [user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
