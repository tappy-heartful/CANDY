import { db } from "@/src/lib/firebase";
import { collection, doc, addDoc, updateDoc, getDocs, query, where, serverTimestamp, orderBy, limit } from "firebase/firestore";
import { DailyStatus } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/** クライアント認証済みSDKで指定日のdaily_statusesを取得 */
export async function getDailyStatuses(dateStr: string): Promise<DailyStatus[]> {
  const ref = collection(db, "daily_statuses");
  const q = query(ref, where("date", "==", dateStr));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as DailyStatus);
}

export async function saveDailyStatus(data: Partial<DailyStatus>) {
  if (data.id) {
    const { id, ...rest } = data;
    const docRef = doc(db, "daily_statuses", id);
    await updateDoc(docRef, {
      ...rest,
      updatedAt: serverTimestamp(),
    });
    return docRef;
  } else {
    const colRef = collection(db, "daily_statuses");
    const docRef = await addDoc(colRef, {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return docRef;
  }
}

export async function getDailyStatusHistory(limitNum: number = 60): Promise<DailyStatus[]> {
  const ref = collection(db, "daily_statuses");
  const q = query(ref, orderBy("date", "desc"), limit(limitNum));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as DailyStatus);
}
