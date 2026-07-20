import SettlementDetailClient from "@/src/features/settlement/views/SettlementDetailClient";

export const metadata = {
  title: "ワリカン詳細・清算 | CANDY",
  description: "イベントの割り勘詳細と最終精算金額の計算",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SettlementDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <SettlementDetailClient eventId={id} />;
}
