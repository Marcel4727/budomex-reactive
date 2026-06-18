import Link from "next/link";
import Logo from "../../(marketing)/_components/Logo";

type Props = {
  refLabel?: string;
};

export default function OrderTopNav({ refLabel }: Props) {
  return (
    <header className="order-topnav">
      <Link href="/" aria-label="Budomex — strona główna">
        <Logo />
      </Link>
      <div className="nav-right">
        {refLabel && <span className="ref-pill">{refLabel}</span>}
        <span>Pomoc: <a href="tel:+48528501200" style={{ color: "var(--bdx-navy)" }}>+48 52 850 12 00</a></span>
      </div>
    </header>
  );
}
