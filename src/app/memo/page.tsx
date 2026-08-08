"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import MemoClient from "@/src/features/memo/views/MemoClient";

export default function MemoPage() {
  const { loading } = useAuth();

  if (loading) return <div className="page-container" />;

  return (
    <AuthGuard>
      <MemoClient />
    </AuthGuard>
  );
}
