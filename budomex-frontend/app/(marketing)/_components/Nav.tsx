"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import Logo from "./Logo";

const NAV_LINKS = [
  { href: "#oferta", label: "Oferta" },
  { href: "#proces", label: "Proces" },
  { href: "#realizacje", label: "Realizacje" },
  { href: "#faq", label: "FAQ" },
  { href: "#kontakt", label: "Kontakt" },
] as const;

export default function Nav() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  // Escape zamyka mobilne menu.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Scroll-spy: podświetla link sekcji aktualnie w widoku.
  useEffect(() => {
    const ids = NAV_LINKS.map((l) => l.href.slice(1));
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Wybierz sekcję najbliżej górnej krawędzi, która jest widoczna.
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible.length > 0) {
          setActive(visible[0].target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const handleLink = (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    e.preventDefault();
    setOpen(false);
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <nav className="nav">
        <a href="#" className="nav-logo" aria-label="Budomex - strona główna">
          <Logo />
        </a>

        <div className="nav-links" role="navigation" aria-label="Główna nawigacja">
          {NAV_LINKS.map((l) => {
            const isActive = active === l.href.slice(1);
            return (
              <a
                key={l.href}
                href={l.href}
                className={isActive ? "active" : ""}
                aria-current={isActive ? "true" : undefined}
                onClick={(e) => handleLink(e, l.href)}
              >
                {l.label}
              </a>
            );
          })}
        </div>

        <div className="nav-right">
          <a href="tel:+48528501200" className="nav-phone">
            <Icon name="phone" size={14} />
            <span>+48 52 850 12 00</span>
          </a>
          <a
            href="#wycena"
            className="btn"
            onClick={(e) => handleLink(e, "#wycena")}
          >
            Wycena w 48h
            <Icon name="arrow-right" size={14} />
          </a>
          <button
            type="button"
            className="nav-burger"
            aria-label="Otwórz menu"
            onClick={() => setOpen(true)}
          >
            <Icon name="menu" size={20} />
          </button>
        </div>
      </nav>

      <div
        className={`drawer-scrim ${open ? "open" : ""}`}
        onClick={() => setOpen(false)}
      />
      <aside
        className={`drawer ${open ? "open" : ""}`}
        aria-hidden={!open}
        aria-label="Menu nawigacji"
        inert={!open}
      >
        <div className="drawer-head">
          <Logo />
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Zamknij menu"
          >
            <Icon name="x" size={20} />
          </button>
        </div>
        <div className="drawer-links">
          {NAV_LINKS.map((l) => (
            <a key={l.href} href={l.href} onClick={(e) => handleLink(e, l.href)}>
              {l.label}
              <Icon name="chevron-right" size={16} />
            </a>
          ))}
        </div>
        <a
          href="#wycena"
          className="btn"
          onClick={(e) => handleLink(e, "#wycena")}
        >
          Wycena w 48h
          <Icon name="arrow-right" size={14} />
        </a>
        <div className="drawer-meta">
          <a href="tel:+48528501200">
            <Icon name="phone" size={12} /> +48 52 850 12 00
          </a>
          <span>pon-pt 8:00-17:00 · sob 9:00-13:00</span>
        </div>
      </aside>
    </>
  );
}
