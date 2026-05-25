"use client";

import { useAuth } from "@/src/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { useEffect } from "react";

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
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        backgroundColor: '#fff'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #A0E7D2',
          borderTop: '4px solid #F7A8C4',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
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
