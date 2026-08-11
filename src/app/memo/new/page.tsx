import AuthGuard from "@/src/components/AuthGuard";
import MemoEditClient from "@/src/features/memo/views/MemoEditClient";

export default function MemoNewPage() {
  return (
    <AuthGuard>
      <MemoEditClient />
    </AuthGuard>
  );
}
