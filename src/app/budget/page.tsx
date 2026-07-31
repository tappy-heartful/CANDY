"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import BudgetClient from "@/src/features/budget/views/BudgetClient";

export default function BudgetPage() {
  const { loading } = useAuth();

  if (loading) return <div className="page-container" />;

  return (
    <AuthGuard>
      <BudgetClient />
    </AuthGuard>
  );
}
