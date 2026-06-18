import TrackingPanel from "./_components/TrackingPanel";

export const metadata = {
  title: "Śledzenie zamówienia · Budomex",
};

type Props = {
  params: Promise<{ token: string }>;
};

export default async function TrackPage({ params }: Props) {
  const { token } = await params;
  return <TrackingPanel token={token} />;
}
