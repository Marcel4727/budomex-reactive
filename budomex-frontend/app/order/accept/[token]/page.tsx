import AcceptancePanel from "./_components/AcceptancePanel";

export const metadata = {
  title: "Akceptacja oferty · Budomex",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function AcceptPage({ params }: Props) {
  const { token } = await params;
  return <AcceptancePanel token={token} />;
}
