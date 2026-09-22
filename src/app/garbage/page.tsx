"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import GarbageClient from "@/src/features/garbage/views/GarbageClient";

export default function GarbagePage() {
  const { loading } = useAuth();

  if (loading) return <div className="page-container" />;

  return (
    <AuthGuard>
      <GarbageClient />
    </AuthGuard>
  );
}
