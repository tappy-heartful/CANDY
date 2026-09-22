"use server";

import { adminDb } from "@/src/lib/firebase-admin";
import { GarbageSchedule } from "@/src/lib/firestore/types";

/**
 * ごみ収集スケジュール一覧をサーバーサイドで取得
 */
export async function fetchGarbageSchedules(): Promise<GarbageSchedule[]> {
  try {
    const ref = adminDb.collection("garbageSchedules");
    const snap = await ref.get();

    const results = snap.docs.map((doc) => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
        updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
      } as GarbageSchedule;
    });

    results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
    return results;
  } catch (error) {
    console.error("fetchGarbageSchedules error:", error);
    return [];
  }
}
