import { db } from "@/src/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { PropertyPreference } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

const COLLECTION_NAME = "propertyPreferences";

/**
 * ユーザーの希望物件条件を取得する
 */
export async function getPropertyPreference(uid: string): Promise<PropertyPreference | null> {
  try {
    const docRef = doc(db, COLLECTION_NAME, uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return toPlainObject(snap) as PropertyPreference;
    }
    return null;
  } catch (error) {
    console.error("Error getting property preference:", error);
    return null;
  }
}

/**
 * ユーザーの希望物件条件を保存する
 */
export async function savePropertyPreference(uid: string, data: Partial<PropertyPreference>): Promise<void> {
  const docRef = doc(db, COLLECTION_NAME, uid);
  await setDoc(docRef, {
    ...data,
    uid,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
