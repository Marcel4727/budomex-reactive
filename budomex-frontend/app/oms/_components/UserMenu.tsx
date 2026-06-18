"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";
import type { AuthUser } from "@/lib/auth";

type Props = {
  user: AuthUser;
  chipLabel: string;
  initials: string;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onLogout: () => void;
};

export default function UserMenu({
  user,
  chipLabel,
  initials,
  theme,
  onToggleTheme,
  onLogout,
}: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!wrapRef.current) return;
      if (!wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const close = () => setOpen(false);

  return (
    <div className="user-menu-wrap" ref={wrapRef}>
      <button
        type="button"
        className={`user-menu ${open ? "open" : ""}`}
        aria-label="Menu konta"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="avatar">{initials}</span>
        <span className="name">{user.fullName}</span>
        <span className="role-chip">{chipLabel}</span>
        <span className="chev">
          <Icon name="chevron-down" size={13} />
        </span>
      </button>

      {open && (
        <div
          className="user-pop"
          role="menu"
          aria-orientation="vertical"
          aria-label="Menu konta"
        >
          <div className="user-pop-head">
            <div className="name">{user.fullName}</div>
            <div className="meta">
              <span className="role-chip">{chipLabel}</span>
              <span>{user.username}</span>
            </div>
          </div>

          <div className="user-pop-list">
            <button
              type="button"
              className="user-pop-item"
              role="menuitemcheckbox"
              aria-checked={theme === "dark"}
              onClick={() => {
                onToggleTheme();
              }}
            >
              <Icon name={theme === "dark" ? "sun" : "moon"} size={16} />
              <span className="item-label">
                {theme === "dark" ? "Tryb jasny" : "Tryb ciemny"}
              </span>
            </button>

            <div className="user-pop-sep" />

            <button
              type="button"
              className="user-pop-item danger"
              role="menuitem"
              onClick={() => {
                close();
                onLogout();
              }}
            >
              <Icon name="log-out" size={16} />
              <span className="item-label">Wyloguj się</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
