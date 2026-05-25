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
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("__name__", "!=", myUid), limit(1));
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return toPlainObject(querySnapshot.docs[0]) as User;
    }
    return null;
  } catch (error) {
    console.error("Error fetching partner data:", error);
    return null;
  }
}
