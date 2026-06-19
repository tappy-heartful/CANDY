"use server";

import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { InvestmentSimulation } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/** サーバーサイドから指定ユーザーの投資シミュレーション設定を取得 */
export async function getInvestmentSimulationServer(uid: string): Promise<InvestmentSimulation | null> {
  const ref = doc(db, "investments", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    return null;
  }
  return toPlainObject(snap) as InvestmentSimulation;
}
