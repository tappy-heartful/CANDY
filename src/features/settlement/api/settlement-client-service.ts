import { db, storage } from "@/src/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch,
  deleteField,
} from "firebase/firestore";
import { toPlainObject } from "@/src/lib/firestore/utils";
import type { SettlementEvent, SettlementItem } from "@/src/lib/firestore/types";

// 領収書ファイルを Storage にアップロード
export async function uploadReceipt(
  eventId: string,
  file: File
): Promise<{ receiptUrl: string; receiptFileName: string; receiptFileType: string }> {
  const fileType = file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "image/jpeg");
  const storagePath = `settlements/${eventId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, file);
  const receiptUrl = await getDownloadURL(storageRef);

  return {
    receiptUrl,
    receiptFileName: file.name,
    receiptFileType: fileType,
  };
}

// 全てのワリカンイベントを取得
export async function getSettlementEvents(): Promise<SettlementEvent[]> {
  const ref = collection(db, "settlementEvents");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as SettlementEvent);
}

// IDから単一のイベントを取得
export async function getSettlementEventById(eventId: string): Promise<SettlementEvent | null> {
  const docRef = doc(db, "settlementEvents", eventId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return toPlainObject(snap) as SettlementEvent;
}

// ワリカンイベントを新規作成
export async function createSettlementEvent(
  name: string,
  uid: string,
  prefectureCode?: string,
  prefectureName?: string,
  municipalityCode?: string,
  municipalityName?: string,
  dateMode?: "single" | "range",
  startDate?: string,
  endDate?: string
): Promise<string> {
  const ref = collection(db, "settlementEvents");
  const now = Date.now();
  const docRef = await addDoc(ref, {
    name,
    isSettled: false,
    uid,
    prefectureCode: prefectureCode || null,
    prefectureName: prefectureName || null,
    municipalityCode: municipalityCode || null,
    municipalityName: municipalityName || null,
    dateMode: dateMode || "single",
    startDate: startDate || null,
    endDate: endDate || null,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

// イベント情報を更新
export async function updateSettlementEvent(
  eventId: string,
  name: string,
  prefectureCode?: string,
  prefectureName?: string,
  municipalityCode?: string,
  municipalityName?: string,
  dateMode?: "single" | "range",
  startDate?: string,
  endDate?: string
): Promise<void> {
  const ref = doc(db, "settlementEvents", eventId);
  await updateDoc(ref, {
    name,
    prefectureCode: prefectureCode || null,
    prefectureName: prefectureName || null,
    municipalityCode: municipalityCode || null,
    municipalityName: municipalityName || null,
    dateMode: dateMode || "single",
    startDate: startDate || null,
    endDate: endDate || null,
    updatedAt: Date.now(),
  });
}

// 清算完了フラグおよび精算モードの切り替え
export async function toggleSettlementEventSettled(
  eventId: string,
  isSettled: boolean,
  settlementMode?: "even" | "my" | "partner",
  settledRatio?: number
): Promise<void> {
  const ref = doc(db, "settlementEvents", eventId);
  await updateDoc(ref, {
    isSettled,
    settlementMode: isSettled ? (settlementMode || "even") : null,
    settledRatio: isSettled ? (settledRatio ?? 50) : null,
    updatedAt: Date.now(),
  });
}

// 清算証明画像 (PayPay等の送金完了画面) をアップロードして清算完了にする
export async function uploadSettlementProof(
  eventId: string,
  file: File,
  settlementMode?: "even" | "my" | "partner",
  settledRatio?: number
): Promise<{ proofUrl: string; proofFileName: string }> {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `settlements/${eventId}/proofs/${fileName}`);
  await uploadBytes(storageRef, file);
  const proofUrl = await getDownloadURL(storageRef);

  const docRef = doc(db, "settlementEvents", eventId);
  await updateDoc(docRef, {
    isSettled: true,
    proofUrl,
    proofFileName: file.name,
    proofUploadedAt: Date.now(),
    settlementMode: settlementMode || "even",
    settledRatio: settledRatio ?? 50,
    updatedAt: Date.now(),
  });

  return { proofUrl, proofFileName: file.name };
}

// 清算証明画像を削除して未清算に戻す
export async function removeSettlementProof(eventId: string): Promise<void> {
  const docRef = doc(db, "settlementEvents", eventId);
  await updateDoc(docRef, {
    isSettled: false,
    proofUrl: deleteField(),
    proofFileName: deleteField(),
    proofUploadedAt: deleteField(),
    settlementMode: deleteField(),
    settledRatio: deleteField(),
    updatedAt: Date.now(),
  });
}

// イベントと配下の明細を削除
export async function deleteSettlementEvent(eventId: string): Promise<void> {
  const items = await getSettlementItems(eventId);
  const batch = writeBatch(db);

  for (const item of items) {
    const itemRef = doc(db, "settlementItems", item.id);
    batch.delete(itemRef);
  }

  const eventRef = doc(db, "settlementEvents", eventId);
  batch.delete(eventRef);

  await batch.commit();
}

// 特定のイベントの明細一覧を取得
export async function getSettlementItems(eventId: string): Promise<SettlementItem[]> {
  const ref = collection(db, "settlementItems");
  const q = query(ref, where("eventId", "==", eventId), orderBy("createdAt", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as SettlementItem);
}

// 明細を新規追加
export async function addSettlementItem(
  eventId: string,
  title: string,
  amount: number,
  type: "expense" | "income",
  payerUid: string,
  uid: string,
  receiptUrl?: string,
  receiptFileName?: string,
  receiptFileType?: string
): Promise<string> {
  const ref = collection(db, "settlementItems");
  const now = Date.now();
  const docRef = await addDoc(ref, {
    eventId,
    title,
    amount,
    type,
    payerUid,
    uid,
    receiptUrl: receiptUrl || null,
    receiptFileName: receiptFileName || null,
    receiptFileType: receiptFileType || null,
    createdAt: now,
    updatedAt: now,
  });

  // イベントの最終更新日時も更新
  const eventRef = doc(db, "settlementEvents", eventId);
  await updateDoc(eventRef, { updatedAt: now });

  return docRef.id;
}

// 明細を更新
export async function updateSettlementItem(
  itemId: string,
  title: string,
  amount: number,
  type: "expense" | "income",
  payerUid: string,
  receiptUrl?: string | null,
  receiptFileName?: string | null,
  receiptFileType?: string | null
): Promise<void> {
  const ref = doc(db, "settlementItems", itemId);
  const now = Date.now();
  await updateDoc(ref, {
    title,
    amount,
    type,
    payerUid,
    receiptUrl: receiptUrl ?? null,
    receiptFileName: receiptFileName ?? null,
    receiptFileType: receiptFileType ?? null,
    updatedAt: now,
  });
}

// 明細を削除
export async function deleteSettlementItem(itemId: string): Promise<void> {
  const ref = doc(db, "settlementItems", itemId);
  await deleteDoc(ref);
}
