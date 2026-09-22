"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import LivingClient from "@/src/features/living/views/LivingClient";

export default function LivingPage() {
  const { loading } = useAuth();

  if (loading) return <div className="page-container" />;

  return (
    <AuthGuard>
      <LivingClient />
    </AuthGuard>
  );
}
