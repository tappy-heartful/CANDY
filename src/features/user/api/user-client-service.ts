import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";

export async function updateProfile(uid: string, data: { nickname: string }) {
  const userRef = doc(db, "users", uid);
  return await updateDoc(userRef, {
    nickname: data.nickname,
    updatedAt: serverTimestamp(),
  });
}
