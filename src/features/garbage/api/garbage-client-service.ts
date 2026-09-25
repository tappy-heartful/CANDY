import { db, storage } from "@/src/lib/firebase";
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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { compressImage } from "@/src/lib/image-compression";
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

/**
 * ごみの出し方・分別ガイド画像を Storage にアップロードする
 */
export async function uploadGarbageImage(file: File): Promise<string> {
  // 文字や図がくっきり読めるよう最大1600px、品質0.82で自動圧縮
  const compressed = await compressImage(file, 1600, 0.82);
  const safeName = (compressed.name || "image.jpg").replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `garbage/${Date.now()}_${safeName}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, compressed);
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return downloadUrl;
}

/**
 * ごみ画像（Storage）を削除する
 */
export async function deleteGarbageImage(imageUrl: string): Promise<void> {
  try {
    const storageRef = ref(storage, imageUrl);
    await deleteObject(storageRef);
  } catch (err) {
    // 削除に失敗してもUIの進行をブロックしない
    console.warn("Garbage image deletion skipped or failed:", err);
  }
}

