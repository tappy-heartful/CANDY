import { db } from "@/src/lib/firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  deleteField,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { GarbageSchedule } from "@/src/lib/firestore/types";

const COLLECTION_NAME = "garbageSchedules";

/**
 * Firestore updateDoc 用に undefined を deleteField() に変換する
 */
function sanitizeForUpdate(data: Record<string, any>) {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) {
      clean[key] = deleteField();
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * Firestore addDoc 用に undefined フィールドを除去する
 */
function sanitizeForAdd(data: Record<string, any>) {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      clean[key] = value;
    }
  }
  return clean;
}

/**
 * ごみカレンダーのスケジュールルール一覧を取得する
 */
export async function getGarbageSchedules(): Promise<GarbageSchedule[]> {
  const colRef = collection(db, COLLECTION_NAME);
  const snap = await getDocs(colRef);

  const results = snap.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now()),
      updatedAt: data.updatedAt?.toMillis ? data.updatedAt.toMillis() : (data.updatedAt || Date.now()),
    } as GarbageSchedule;
  });

  // 更新順、または作成順にソート
  results.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return results;
}

/**
 * 新しいごみ収集ルールを追加する
 */
export async function addGarbageSchedule(
  uid: string,
  data: Omit<GarbageSchedule, "id" | "uid" | "createdAt" | "updatedAt">
) {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = await addDoc(colRef, {
    ...sanitizeForAdd(data),
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef;
}

/**
 * ごみ収集ルールを更新する
 */
export async function updateGarbageSchedule(
  id: string,
  data: Partial<Omit<GarbageSchedule, "id" | "uid" | "createdAt" | "updatedAt">>
) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...sanitizeForUpdate(data),
    updatedAt: serverTimestamp(),
  });
}

/**
 * ごみ収集ルールを削除する
 */
export async function deleteGarbageSchedule(id: string) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}
