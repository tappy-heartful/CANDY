import { db } from "@/src/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { InvestmentSimulation } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/** ユーザーごとの投資シミュレーション設定を取得（存在しなければnullを返す） */
export async function getInvestmentSimulation(uid: string): Promise<InvestmentSimulation | null> {
  const ref = doc(db, "investments", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  return toPlainObject(snap) as InvestmentSimulation;
}

/** ユーザーごとの投資シミュレーション設定を保存 */
export async function saveInvestmentSimulation(uid: string, data: Partial<InvestmentSimulation>) {
  const ref = doc(db, "investments", uid);
  return await setDoc(
    ref,
    {
      ...data,
      uid,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}
