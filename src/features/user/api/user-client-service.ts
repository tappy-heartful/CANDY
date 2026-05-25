import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { User } from "@/src/lib/firestore/types";

export async function updateProfile(uid: string, data: Partial<User>) {
  const userRef = doc(db, "users", uid);
  return await updateDoc(userRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}
