"use client";

import { useEffect, useState } from "react";
import Icon from "./Icon";
import type { ProductKey } from "./Products";
import { api, ApiError } from "@/lib/api";

const BACKEND_PRODUCT_TYPE: Record<ProductKey, string> = {
  okna: "OKNO",
  drzwi: "DRZWI",
  bramy: "BRAMA",
  rolety: "ROLETA_ZEWNETRZNA",
  parapety: "PARAPET",
};

type QuoteResponse = { message: string; orderId: string };

type FieldKey =
  | "name"
  | "email"
  | "phone"
  | "address"
  | "category"
  | "quantity"
  | "preferredDate"
  | "details"
  | "consent";

type Values = {
  name: string;
  email: string;
  phone: string;
  address: string;
  category: ProductKey | "";
  quantity: string;
  preferredDate: string;
  details: string;
  consent: boolean;
};

type Errors = Partial<Record<FieldKey, string>>;
type Touched = Partial<Record<FieldKey, boolean>>;

const validators: Record<FieldKey, (v: string | boolean) => string> = {
  name: (v) => {
    const s = String(v);
    if (!s.trim()) return "Podaj imię i nazwisko.";
    if (s.trim().length < 3) return "Imię i nazwisko musi mieć minimum 3 znaki.";
    return "";
  },
  email: (v) => {
    const s = String(v);
    if (!s.trim()) return "Podaj adres email.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim()))
      return "Email musi zawierać znak @ i domenę (np. jan@example.pl).";
    return "";
  },
  phone: (v) => {
    const s = String(v);
    if (!s.trim()) return "";
    const digits = s.replace(/\D/g, "");
    if (digits.length < 9) return "Telefon powinien mieć co najmniej 9 cyfr.";
    return "";
  },
  address: (v) => {
    const s = String(v);
    if (!s.trim()) return "Podaj adres montażu.";
    if (s.trim().length < 6) return "Adres jest zbyt krótki.";
    return "";
  },
  category: (v) => {
    if (!v) return "Wybierz, czego dotyczy zapytanie.";
    return "";
  },
  quantity: (v) => {
    const n = Number(v);
    if (!v || isNaN(n) || n < 1)
      return "Ilość musi być liczbą większą od zera.";
    if (n > 999) return "Maksymalnie 999 sztuk w jednym zgłoszeniu.";
    return "";
  },
  preferredDate: (v) => {
    const s = String(v);
    if (!s.trim()) return "";
    const today = new Date().toISOString().slice(0, 10);
    if (s < today) return "Termin musi być w przyszłości.";
    return "";
  },
  details: () => "",
  consent: (v) =>
    v ? "" : "Potrzebujemy zgody, żebyśmy mogli się z tobą skontaktować.",
};

const initialValues: Values = {
  name: "",
  email: "",
  phone: "",
  address: "",
  category: "",
  quantity: "1",
  preferredDate: "",
  details: "",
  consent: false,
};

type Props = {
  initialCategory: ProductKey | "";
};

export default function Contact({ initialCategory }: Props) {
  const [values, setValues] = useState<Values>({
    ...initialValues,
    category: initialCategory,
  });
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Touched>({});
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [refNumber, setRefNumber] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    if (initialCategory && initialCategory !== values.category) {
      setValues((v) => ({ ...v, category: initialCategory }));
      setErrors((e) => ({ ...e, category: "" }));
      setPrefilled(true);
      const t = setTimeout(() => setPrefilled(false), 1800);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCategory]);

  const setField = <K extends FieldKey>(k: K, v: Values[K]) => {
    setValues((prev) => ({ ...prev, [k]: v }));
    if (touched[k]) {
      setErrors((prev) => ({ ...prev, [k]: validators[k](v as string | boolean) }));
    }
  };

  const onBlur = (k: FieldKey) => {
    setTouched((prev) => ({ ...prev, [k]: true }));
    setErrors((prev) => ({
      ...prev,
      [k]: validators[k](values[k] as string | boolean),
    }));
  };

  const validateAll = () => {
    const next: Errors = {};
    (Object.keys(validators) as FieldKey[]).forEach((k) => {
      next[k] = validators[k](values[k] as string | boolean);
    });
    setErrors(next);
    setTouched(
      (Object.keys(validators) as FieldKey[]).reduce<Touched>(
        (a, k) => ({ ...a, [k]: true }),
        {},
      ),
    );
    return Object.values(next).every((v) => !v);
  };

  const onSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    if (!validateAll()) {
      setTimeout(() => {
        const firstError = document.querySelector<HTMLElement>(
          ".field.has-error input, .field.has-error select, .field.has-error textarea",
        );
        firstError?.focus();
      }, 0);
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const productType = values.category
        ? BACKEND_PRODUCT_TYPE[values.category]
        : "INNE";
      const phone = values.phone.trim();
      const details = values.details.trim() || "Brak dodatkowych uwag.";
      const res = await api<QuoteResponse>("/api/customer/quote", {
        method: "POST",
        body: JSON.stringify({
          customerName: values.name.trim(),
          customerEmail: values.email.trim(),
          customerPhone: phone || null,
          customerAddress: values.address.trim(),
          productType,
          productSpecifications: details,
          quantity: Number(values.quantity),
          estimatedDeliveryDate: values.preferredDate.trim() || null,
        }),
      });
      const padded = String(res.orderId).padStart(6, "0");
      setRefNumber(`BDX-${padded}`);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setSubmitError(
          err.status === 0
            ? "Nie udało się połączyć z serwerem. Sprawdź czy backend jest uruchomiony (localhost:8080)."
            : err.message ||
                "Wystąpił błąd po stronie serwera. Spróbuj ponownie za chwilę.",
        );
      } else if (err instanceof TypeError) {
        setSubmitError(
          "Nie udało się połączyć z serwerem. Sprawdź czy backend jest uruchomiony (localhost:8080).",
        );
      } else {
        setSubmitError("Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setSent(false);
    setSubmitError(null);
    setValues(initialValues);
    setErrors({});
    setTouched({});
  };

  const fieldClass = (k: FieldKey) =>
    `field ${errors[k] && touched[k] ? "has-error" : ""}`;

  const nextQuoteDate = () => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  return (
    <section className="section dark" id="kontakt">
      <div className="container">
        <div className="section-head">
          <div className="eyebrow">Zapytaj o wycenę</div>
          <h2>Powiedz, co potrzebujesz. Odezwiemy się w&nbsp;48&nbsp;godzin.</h2>
          <p className="sub">
            Wypełniasz formularz - bez logowania, bez kont. Dostajesz wycenę
            na&nbsp;maila i&nbsp;numer referencyjny do&nbsp;śledzenia zamówienia.
          </p>
        </div>

        <div className="contact-wrap" id="wycena">
          <div className="contact-info">
            <div className="info-pad">
              <h3>Budomex Sp. z&nbsp;o.o.</h3>
              <div className="info-row">
                <div className="ic">
                  <Icon name="map-pin" size={16} />
                </div>
                <div>
                  <div className="lab">Adres</div>
                  <div className="val body">
                    ul. Juliusza Kossaka 35
                    <br />
                    85-307 Bydgoszcz
                  </div>
                </div>
              </div>
              <div className="info-row">
                <div className="ic">
                  <Icon name="phone" size={16} />
                </div>
                <div>
                  <div className="lab">Telefon</div>
                  <div className="val">+48 52 850 12 00</div>
                </div>
              </div>
              <div className="info-row">
                <div className="ic">
                  <Icon name="mail" size={16} />
                </div>
                <div>
                  <div className="lab">Email</div>
                  <div className="val">biuro@budomex.pl</div>
                </div>
              </div>
              <div className="info-row">
                <div className="ic">
                  <Icon name="clock" size={16} />
                </div>
                <div>
                  <div className="lab">Godziny pracy</div>
                  <div className="val body">
                    pon-pt 8:00-17:00 <small>· biuro i&nbsp;telefon</small>
                    <br />
                    sob 9:00-13:00 <small>· tylko telefonicznie</small>
                  </div>
                </div>
              </div>
            </div>
            <div className="map-embed">
              <iframe
                title="Mapa - ul. Juliusza Kossaka 35, Bydgoszcz"
                src="https://maps.google.com/maps?q=ul.%20Juliusza%20Kossaka%2035%2C%2085-307%20Bydgoszcz&t=&z=15&ie=UTF8&iwloc=&output=embed"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </div>

          <form
            className="quote-form-card"
            onSubmit={onSubmit}
            noValidate
            aria-label="Formularz zapytania o wycenę"
          >
            {sent ? (
              <div className="success-state" role="status" aria-live="polite">
                <div className="icon-wrap">
                  <Icon name="check" size={28} strokeWidth={2.2} />
                </div>
                <h3>Zgłoszenie przyjęte.</h3>
                <div className="ref">{refNumber}</div>
                <p>
                  Dziękujemy. Wycenę wyślemy na <strong>{values.email}</strong>{" "}
                  w&nbsp;ciągu <strong>48&nbsp;godzin roboczych</strong>. Po jej
                  akceptacji pod tym numerem referencyjnym sprawdzisz status
                  zamówienia.
                </p>
                <div className="timeline">
                  <Icon name="clock" size={12} />
                  <span>
                    Następny krok:{" "}
                    <strong>wycena na mailu do {nextQuoteDate()}</strong>
                  </span>
                </div>
                <div style={{ marginTop: 24 }}>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={reset}
                  >
                    Wyślij kolejne zgłoszenie
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3>Wyceń za darmo</h3>
                <p className="intro">
                  Pola wymagane oznaczone{" "}
                  <span style={{ color: "var(--bdx-terracotta)" }}>*</span>.
                  Odpowiadamy w&nbsp;48&nbsp;godzin roboczych.
                </p>

                <div className={fieldClass("name")}>
                  <label htmlFor="f-name">
                    Imię i nazwisko<span className="req">*</span>
                  </label>
                  <input
                    id="f-name"
                    type="text"
                    placeholder="Jan Kowalski"
                    value={values.name}
                    onChange={(e) => setField("name", e.target.value)}
                    onBlur={() => onBlur("name")}
                    autoComplete="name"
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? "f-name-err" : undefined}
                  />
                  {errors.name && touched.name && (
                    <div className="error" id="f-name-err">
                      <Icon name="alert-circle" size={12} /> {errors.name}
                    </div>
                  )}
                </div>

                <div className="field-row">
                  <div className={fieldClass("email")}>
                    <label htmlFor="f-email">
                      Email<span className="req">*</span>
                    </label>
                    <input
                      id="f-email"
                      type="email"
                      placeholder="jan@example.pl"
                      value={values.email}
                      onChange={(e) => setField("email", e.target.value)}
                      onBlur={() => onBlur("email")}
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                    />
                    {errors.email && touched.email && (
                      <div className="error">
                        <Icon name="alert-circle" size={12} /> {errors.email}
                      </div>
                    )}
                  </div>
                  <div className={fieldClass("phone")}>
                    <label htmlFor="f-phone">
                      Telefon<span className="opt">opcjonalnie</span>
                    </label>
                    <input
                      id="f-phone"
                      type="tel"
                      placeholder="+48 600 000 000"
                      value={values.phone}
                      onChange={(e) => setField("phone", e.target.value)}
                      onBlur={() => onBlur("phone")}
                      autoComplete="tel"
                      aria-invalid={!!errors.phone}
                    />
                    {errors.phone && touched.phone && (
                      <div className="error">
                        <Icon name="alert-circle" size={12} /> {errors.phone}
                      </div>
                    )}
                  </div>
                </div>

                <div className={fieldClass("address")}>
                  <label htmlFor="f-addr">
                    Adres montażu<span className="req">*</span>
                  </label>
                  <input
                    id="f-addr"
                    type="text"
                    placeholder="ul. Słoneczna 14, 85-739 Bydgoszcz"
                    value={values.address}
                    onChange={(e) => setField("address", e.target.value)}
                    onBlur={() => onBlur("address")}
                    autoComplete="street-address"
                    aria-invalid={!!errors.address}
                  />
                  {errors.address && touched.address && (
                    <div className="error">
                      <Icon name="alert-circle" size={12} /> {errors.address}
                    </div>
                  )}
                </div>

                <div className="field-row">
                  <div className={`${fieldClass("category")} ${prefilled ? "prefilled" : ""}`}>
                    <label htmlFor="f-cat">
                      Kategoria<span className="req">*</span>
                    </label>
                    <select
                      id="f-cat"
                      value={values.category}
                      onChange={(e) =>
                        setField("category", e.target.value as ProductKey | "")
                      }
                      onBlur={() => onBlur("category")}
                      aria-invalid={!!errors.category}
                    >
                      <option value="" disabled>
                        Wybierz produkt
                      </option>
                      <option value="okna">Okna</option>
                      <option value="drzwi">Drzwi</option>
                      <option value="bramy">Bramy</option>
                      <option value="rolety">Rolety</option>
                      <option value="parapety">Parapety</option>
                    </select>
                    {errors.category && touched.category && (
                      <div className="error">
                        <Icon name="alert-circle" size={12} /> {errors.category}
                      </div>
                    )}
                  </div>
                  <div className={fieldClass("quantity")}>
                    <label htmlFor="f-qty">
                      Ilość<span className="req">*</span>
                    </label>
                    <input
                      id="f-qty"
                      type="number"
                      min={1}
                      max={999}
                      value={values.quantity}
                      onChange={(e) => setField("quantity", e.target.value)}
                      onBlur={() => onBlur("quantity")}
                      aria-invalid={!!errors.quantity}
                    />
                    {errors.quantity && touched.quantity && (
                      <div className="error">
                        <Icon name="alert-circle" size={12} /> {errors.quantity}
                      </div>
                    )}
                  </div>
                </div>

                <div className={fieldClass("preferredDate")}>
                  <label htmlFor="f-date">
                    Preferowany termin montażu
                    <span className="opt">opcjonalnie</span>
                  </label>
                  <input
                    id="f-date"
                    type="date"
                    min={new Date().toISOString().slice(0, 10)}
                    value={values.preferredDate}
                    onChange={(e) => setField("preferredDate", e.target.value)}
                    onBlur={() => onBlur("preferredDate")}
                    aria-invalid={!!errors.preferredDate}
                  />
                  {errors.preferredDate && touched.preferredDate && (
                    <div className="error">
                      <Icon name="alert-circle" size={12} />{" "}
                      {errors.preferredDate}
                    </div>
                  )}
                </div>

                <div className={fieldClass("details")}>
                  <label htmlFor="f-det">
                    Szczegóły<span className="opt">opcjonalnie</span>
                  </label>
                  <textarea
                    id="f-det"
                    placeholder="Wymiary, kolor, materiał (PCV / drewno / alu), dodatkowe uwagi - wszystko, co przyjdzie ci do głowy. Im więcej, tym celniejsza wycena."
                    value={values.details}
                    onChange={(e) => setField("details", e.target.value)}
                    rows={4}
                  />
                </div>

                <label className="consent">
                  <input
                    type="checkbox"
                    checked={values.consent}
                    onChange={(e) => setField("consent", e.target.checked)}
                    onBlur={() => onBlur("consent")}
                    aria-invalid={!!errors.consent}
                  />
                  <span>
                    Wyrażam zgodę na kontakt w&nbsp;sprawie wyceny
                    i&nbsp;przetwarzanie moich danych zgodnie z&nbsp;
                    <a href="#" onClick={(e) => e.preventDefault()}>
                      polityką prywatności
                    </a>
                    .
                  </span>
                </label>
                {errors.consent && touched.consent && (
                  <div
                    className="error"
                    style={{ marginTop: -14, marginBottom: 18 }}
                  >
                    <Icon name="alert-circle" size={12} /> {errors.consent}
                  </div>
                )}

                {submitError && (
                  <div
                    className="error"
                    role="alert"
                    style={{
                      marginBottom: 18,
                      padding: "10px 12px",
                      background: "var(--bdx-danger-tint)",
                      border: "1px solid rgba(179, 58, 42, 0.20)",
                      borderLeft: "3px solid var(--bdx-danger)",
                      borderRadius: 4,
                      alignItems: "flex-start",
                      gap: 8,
                    }}
                  >
                    <Icon name="alert-circle" size={14} />
                    <span>{submitError}</span>
                  </div>
                )}

                <div className="submit-row">
                  <button type="submit" className="btn lg" disabled={submitting}>
                    {submitting ? (
                      <>
                        <span className="spinner" />
                        Wysyłanie...
                      </>
                    ) : (
                      <>
                        Wyślij zapytanie
                        <Icon name="arrow-right" size={16} />
                      </>
                    )}
                  </button>
                  <div className="promise">
                    <Icon name="shield-check" size={14} />
                    <span>Bez spamu, bez sprzedaży danych</span>
                  </div>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
