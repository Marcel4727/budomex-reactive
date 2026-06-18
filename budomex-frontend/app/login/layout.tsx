import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Zaloguj się · Budomex OMS",
};

export default function LoginLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
