"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "./Icon";

type Slide = {
  src: string;
  alt: string;
  /** CSS `object-position` - kontroluje co widać przy crop'ie do 4:3. */
  position?: string;
  /** Krótka etykieta dla nawigacyjnych kropek. */
  label: string;
};

const SLIDES: Slide[] = [
  {
    src: "/hero/window.webp",
    alt: "Wnętrze domu z dużym oknem PCV - ciepłe światło wpadające o złotej godzinie.",
    position: "center",
    label: "Okna",
  },
  {
    src: "/hero/door.webp",
    alt: "Nowoczesne drzwi zewnętrzne - frontowe wejście do domu.",
    /* Portret 3:4 cropowany do 5:4 - środek drzwi w kadrze, minimalny crop. */
    position: "center 45%",
    label: "Drzwi",
  },
  {
    src: "/hero/gate.webp",
    alt: "Brama garażowa nowoczesnego domu jednorodzinnego.",
    position: "center",
    label: "Bramy",
  },
];

const AUTO_CYCLE_MS = 5500;

export default function HeroSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const hoverRef = useRef(false);

  // Detekcja reduced-motion - gdy true, NIE auto-cyklujemy.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Auto-cycle - działa tylko gdy !paused, !reduced, nie hovered.
  useEffect(() => {
    if (paused || reduced) return;
    const id = setInterval(() => {
      if (hoverRef.current) return;
      setIndex((i) => (i + 1) % SLIDES.length);
    }, AUTO_CYCLE_MS);
    return () => clearInterval(id);
  }, [paused, reduced]);

  const goTo = (i: number) => {
    setIndex(i);
  };

  return (
    <div
      className="hero-slideshow"
      onMouseEnter={() => {
        hoverRef.current = true;
      }}
      onMouseLeave={() => {
        hoverRef.current = false;
      }}
      aria-roledescription="carousel"
      aria-label="Realizacje Budomex - okna, drzwi, bramy"
    >
      <div
        className="hero-slideshow-frame"
        aria-live={paused || reduced ? "polite" : "off"}
      >
        {SLIDES.map((s, i) => (
          <img
            key={s.src}
            src={s.src}
            alt={i === index ? s.alt : ""}
            aria-hidden={i !== index}
            className={`hero-slide ${i === index ? "active" : ""}`}
            style={{ objectPosition: s.position ?? "center" }}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            fetchPriority={i === 0 ? "high" : "low"}
          />
        ))}

        <button
          type="button"
          className="hero-slideshow-pause"
          onClick={() => setPaused((p) => !p)}
          aria-label={paused ? "Wznów slideshow" : "Zatrzymaj slideshow"}
          aria-pressed={paused}
          title={paused ? "Wznów" : "Zatrzymaj"}
        >
          {paused ? (
            <Icon name="play" size={12} />
          ) : (
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
            >
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          )}
        </button>
      </div>

      <div className="hero-slideshow-dots" role="tablist" aria-label="Slajdy">
        {SLIDES.map((s, i) => (
          <button
            key={s.src}
            type="button"
            role="tab"
            className={`hero-dot ${i === index ? "active" : ""}`}
            onClick={() => goTo(i)}
            aria-selected={i === index}
            aria-label={`Pokaż: ${s.label}`}
          >
            <span className="hero-dot-label">{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
