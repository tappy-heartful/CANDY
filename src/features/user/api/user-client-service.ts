import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp, getDoc, collection, query, where, getDocs, limit } from "firebase/firestore";
import { User } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

export async function updateProfile(uid: string, data: Partial<User>) {
  const userRef = doc(db, "users", uid);
  return await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// メモリキャッシュ（有効期限3分）
const partnerCache = new Map<string, { data: User | null; expiresAt: number }>();
const CACHE_TTL_MS = 3 * 60 * 1000;

export function clearPartnerCache(uid?: string) {
  if (uid) {
    partnerCache.delete(uid);
  } else {
    partnerCache.clear();
  }
}

/**
 * パートナーの情報を取得する
 * knownPartnerUid が渡されている場合は myUid の再取得をスキップして高速化
 */
export async function getPartnerData(myUid: string, knownPartnerUid?: string): Promise<User | null> {
  const cacheKey = knownPartnerUid ? `p_${knownPartnerUid}` : `my_${myUid}`;
  const cached = partnerCache.get(cacheKey);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.data;
  }

  try {
    let partnerUid = knownPartnerUid;
    if (!partnerUid) {
      const myUserRef = doc(db, "users", myUid);
      const myUserSnap = await getDoc(myUserRef);
      if (!myUserSnap.exists()) return null;

      const myUserData = myUserSnap.data() as User;
      partnerUid = myUserData.partnerUid;
      if (!partnerUid) return null;
    }

    const partnerRef = doc(db, "users", partnerUid);
    const partnerSnap = await getDoc(partnerRef);
    if (partnerSnap.exists()) {
      const partnerData = toPlainObject(partnerSnap) as User;
      partnerCache.set(cacheKey, { data: partnerData, expiresAt: now + CACHE_TTL_MS });
      return partnerData;
    }
    return null;
  } catch (error) {
    console.error("Error fetching partner data:", error);
    return null;
  }
}
