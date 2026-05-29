"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { Anniversary, Group } from "@/src/lib/firestore/types";

export async function fetchAnniversaries(uid: string, partnerUid?: string | null): Promise<Anniversary[]> {
  const uids = partnerUid ? [uid, partnerUid] : [uid];
  const ref = adminDb.collection("anniversaries");
  const snap = await ref.where("uid", "in", uids).get();
  
  const results = snap.docs.map(doc => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    } as Anniversary;
  });

  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
}

// fetchAnniversaryGroups is removed
