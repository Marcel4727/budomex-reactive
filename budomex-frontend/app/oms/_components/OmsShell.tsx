"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getToken } from "@/lib/api";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import RealtimeBridge from "./RealtimeBridge";

type Theme = "light" | "dark";
export type Role = "manager" | "worker";

export default function OmsShell({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [theme, setTheme] = useState<Theme>("light");
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();

  // Motyw jest per-konto: czytamy preferencję zalogowanego usera i stosujemy ją
  // przy każdej zmianie konta (np. po wylogowaniu managera i zalogowaniu
  // pracownika na tym samym urządzeniu). Domyślnie jasny.
  useEffect(() => {
    if (!user) return;
    let next: Theme = "light";
    try {
      const saved = localStorage.getItem(`bdx-oms-theme:${user.username}`);
      if (saved === "dark" || saved === "light") next = saved;
    } catch {}
    document.documentElement.setAttribute("data-theme", next);
    setTheme(next);
  }, [user]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    const isWorkerRoute = pathname?.startsWith("/oms/worker");
    const isManagerRoute = pathname?.startsWith("/oms/manager");
    if (user.role === "worker" && isManagerRoute) {
      router.replace("/oms/worker");
    } else if (user.role === "manager" && isWorkerRoute) {
      router.replace("/oms/manager");
    }
  }, [loading, user, pathname, router]);

  const toggleTheme = () => {
    if (!user) return;
    const { username } = user;
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      try {
        localStorage.setItem(`bdx-oms-theme:${username}`, next);
      } catch {}
      return next;
    });
  };

  // While auth is hydrating or redirect is pending — keep the shell empty
  // (avoids flashing the wrong role's chrome before the redirect lands).
  if (loading || !user) {
    return null;
  }

  const role: Role = user.role;
  const mismatched =
    (role === "worker" && pathname?.startsWith("/oms/manager")) ||
    (role === "manager" && pathname?.startsWith("/oms/worker"));
  if (mismatched) return null;

  return (
    <div className={`oms-shell role-${role}`}>
      <RealtimeBridge token={getToken()} />
      <a href="#oms-main" className="skip-link">
        Przejdź do treści głównej
      </a>
      <Sidebar role={role} />
      <div className="main">
        <TopBar
          role={role}
          theme={theme}
          onToggleTheme={toggleTheme}
          user={user}
          onLogout={() => {
            logout();
            router.replace("/login");
          }}
        />
        <main className="content" id="oms-main" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
