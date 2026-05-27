"use server";

import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { DailyStatus } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

export async function getDailyStatuses(dateStr: string) {
  const ref = collection(db, "daily_statuses");
  const q = query(ref, where("date", "==", dateStr));
  const snap = await getDocs(q);
  
  return snap.docs.map(doc => toPlainObject(doc) as DailyStatus);
}
