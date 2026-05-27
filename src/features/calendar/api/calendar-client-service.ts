import { db } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { CalendarEvent } from "@/src/lib/firestore/types";

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
