"use client";

import { Suspense, useEffect, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import AnniversaryClient from "@/src/features/anniversary/views/AnniversaryClient";
import { fetchAnniversaries } from "@/src/features/anniversary/api/anniversary-server-actions";
import AuthGuard from "@/src/components/AuthGuard";
import { Anniversary } from "@/src/lib/firestore/types";
import { showSpinner, hideSpinner } from "@/src/lib/functions";

import { getPartnerData } from "@/src/features/user/api/user-client-service";

export default function AnniversariesPage() {
  const { user, userData } = useAuth();
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (user) {
        showSpinner();
        try {
          const partner = await getPartnerData(user.uid);
          const partnerUid = partner?.id || null;
          const annData = await fetchAnniversaries(user.uid, partnerUid);
          setAnniversaries(annData);
        } catch (e) {
          console.error(e);
        } finally {
          setLoading(false);
          hideSpinner();
        }
      }
    }
    loadData();
  }, [user, userData]);

  return (
    <AuthGuard>
      <Suspense fallback={null}>
        {!loading && (
          <AnniversaryClient 
            initialAnniversaries={anniversaries} 
          />
        )}
      </Suspense>
    </AuthGuard>
  );
}

