"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import IdealPropertyClient from "@/src/features/ideal-property/views/IdealPropertyClient";

export default function IdealPropertyPage() {
  const { loading } = useAuth();

  if (loading) return <div className="page-container" />;

  return (
    <AuthGuard>
      <IdealPropertyClient />
    </AuthGuard>
  );
}
