import { db } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, query, orderBy } from "firebase/firestore";
import { CalendarEvent, Todo } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/** クライアント認証済みSDKでイベントを取得 */
export async function getEvents(): Promise<CalendarEvent[]> {
  const ref = collection(db, "events");
  const q = query(ref, orderBy("startDate", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as CalendarEvent);
}

/** クライアント認証済みSDKでtodosを取得（全件） */
export async function getTodosForCalendar(): Promise<Todo[]> {
  const ref = collection(db, "todos");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Todo);
}

export async function addEvent(data: Partial<CalendarEvent>) {
  const ref = collection(db, "events");
  return await addDoc(ref, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateEvent(id: string, data: Partial<CalendarEvent>) {
  const ref = doc(db, "events", id);
  return await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteEvent(id: string) {
  const ref = doc(db, "events", id);
  return await deleteDoc(ref);
}
