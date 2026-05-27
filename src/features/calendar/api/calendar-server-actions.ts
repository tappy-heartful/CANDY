"use server";

import { db } from "@/src/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { CalendarEvent } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

export async function getEvents() {
  const ref = collection(db, "events");
  const q = query(ref, orderBy("startDate", "asc"));
  const snap = await getDocs(q);
  
  return snap.docs.map(doc => toPlainObject(doc) as CalendarEvent);
}
