import AuthGuard from "@/src/components/AuthGuard";
import MemoConfirmClient from "@/src/features/memo/views/MemoConfirmClient";

interface MemoDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MemoDetailPage({ params }: MemoDetailPageProps) {
  const { id } = await params;

  return (
    <AuthGuard>
      <MemoConfirmClient id={id} />
    </AuthGuard>
  );
}
