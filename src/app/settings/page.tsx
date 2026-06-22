"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import SettingsClient from "@/src/features/settings/views/SettingsClient";
import AuthGuard from "@/src/components/AuthGuard";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <SettingsClient />
    </AuthGuard>
  );
}
