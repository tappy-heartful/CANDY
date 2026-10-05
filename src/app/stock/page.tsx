"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import ReplenishmentListClient from "@/src/features/replenishment/views/ReplenishmentListClient";
import AuthGuard from "@/src/components/AuthGuard";

export default function StockPage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div
          style={{
            width: "36px",
            height: "36px",
            border: "3px solid #e2e8f0",
            borderTopColor: "#10b981",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        ></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <ReplenishmentListClient />
    </AuthGuard>
  );
}
