import { db } from "@/src/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";
import { Memo } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * coupleKeyに紐づくメモ一覧を取得する
 */
export async function getMemos(coupleKey: string): Promise<Memo[]> {
  try {
    const ref = collection(db, "memos");
    const q = query(
      ref,
      where("coupleKey", "==", coupleKey),
      orderBy("updatedAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => toPlainObject(d) as Memo);
  } catch (error) {
    console.error("Error getting memos:", error);
    return [];
  }
}

/**
 * メモを新規作成する
 */
export async function addMemo(data: {
  coupleKey: string;
  title: string;
  content: string;
  uid: string;
  partnerEditable: boolean;
}) {
  const ref = collection(db, "memos");
  return await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * メモを更新する
 */
export async function updateMemo(
  id: string,
  data: Partial<Omit<Memo, "id" | "createdAt">>
) {
  const ref = doc(db, "memos", id);
  return await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * メモを削除する
 */
export async function deleteMemo(id: string) {
  const ref = doc(db, "memos", id);
  return await deleteDoc(ref);
}
