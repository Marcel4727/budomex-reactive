"use client";

import { useCallback, useEffect, useState } from "react";
import Nav from "./Nav";
import Hero from "./Hero";
import Products, { type ProductKey } from "./Products";
import Process from "./Process";
import WhyUs from "./WhyUs";
import Realizacje from "./Realizacje";
import Testimonials from "./Testimonials";
import FAQ from "./FAQ";
import Contact from "./Contact";
import Footer from "./Footer";

const PRODUCT_KEYS: ProductKey[] = [
  "okna",
  "drzwi",
  "bramy",
  "rolety",
  "parapety",
];

function readCategoryFromHash(): ProductKey | "" {
  if (typeof window === "undefined") return "";
  const m = window.location.hash.match(/^#wycena-(\w+)$/);
  const key = m?.[1];
  return PRODUCT_KEYS.includes(key as ProductKey) ? (key as ProductKey) : "";
}

export default function LandingPage() {
  const [category, setCategory] = useState<ProductKey | "">("");

  useEffect(() => {
    setCategory(readCategoryFromHash());
  }, []);

  const askFor = useCallback((key: ProductKey) => {
    setCategory(key);
    history.replaceState(null, "", `#wycena-${key}`);
    setTimeout(() => {
      document
        .getElementById("wycena")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      setTimeout(() => {
        document
          .getElementById("f-name")
          ?.focus({ preventScroll: true });
      }, 600);
    }, 0);
  }, []);

  return (
    <>
      <a href="#tresc" className="skip-link">
        Przejdź do treści
      </a>
      <Nav />
      <main id="tresc" tabIndex={-1}>
        <Hero />
        <Products onAsk={askFor} />
        <Process />
        <Realizacje />
        <WhyUs />
        <Testimonials />
        <FAQ />
        <Contact initialCategory={category} />
      </main>
      <Footer />
    </>
  );
}
