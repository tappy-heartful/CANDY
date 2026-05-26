"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import styles from "./page.module.css";

export default function RootPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/home");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.spinner}></div>
    </div>
  );
}
