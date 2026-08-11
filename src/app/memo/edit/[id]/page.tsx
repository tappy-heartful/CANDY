import AuthGuard from "@/src/components/AuthGuard";
import MemoEditClient from "@/src/features/memo/views/MemoEditClient";

interface MemoEditPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function MemoEditPage({ params }: MemoEditPageProps) {
  const { id } = await params;

  return (
    <AuthGuard>
      <MemoEditClient id={id} />
    </AuthGuard>
  );
}
