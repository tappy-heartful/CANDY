"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";
import styles from "./AuthGuard.module.css";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, userData, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push("/login");
      } else if (userData && pathname !== "/user/edit") {
        // 必須項目チェック
        const isMissingRequired =
          !userData.nickname ||
          !userData.mbti ||
          !userData.birthday ||
          !userData.phone ||
          !userData.emergencyContact ||
          !userData.allergies ||
          !userData.medications ||
          !userData.medicalHistory ||
          !userData.dislikedFoods;

        if (isMissingRequired) {
          router.push("/user/edit");
        }
      }
    }
  }, [user, userData, loading, router, pathname]);

  if (loading || !user) {
    return (
      <div className={styles.loadingWrapper}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  // 必須項目チェック
  const isMissingRequired =
    !userData?.nickname ||
    !userData?.mbti ||
    !userData?.birthday ||
    !userData?.phone ||
    !userData?.emergencyContact ||
    !userData?.allergies ||
    !userData?.medications ||
    !userData?.medicalHistory ||
    !userData?.dislikedFoods;

  if (isMissingRequired && pathname !== "/user/edit") {
    return null; // リダイレクト中
  }

  return <>{children}</>;
}
