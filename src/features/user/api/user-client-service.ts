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

/**
 * パートナーの情報を取得する
 * ※現在の実装では「自分以外の最初のユーザー」をパートナーとみなす（2人用アプリの暫定仕様）
 */
export async function getPartnerData(myUid: string): Promise<User | null> {
  try {
    const myUserRef = doc(db, "users", myUid);
    const myUserSnap = await getDoc(myUserRef);
    if (!myUserSnap.exists()) return null;

    const myUserData = myUserSnap.data() as User;
    const partnerUid = myUserData.partnerUid;
    if (!partnerUid) return null;

    const partnerRef = doc(db, "users", partnerUid);
    const partnerSnap = await getDoc(partnerRef);
    if (partnerSnap.exists()) {
      return toPlainObject(partnerSnap) as User;
    }
    return null;
  } catch (error) {
    console.error("Error fetching partner data:", error);
    return null;
  }
}
