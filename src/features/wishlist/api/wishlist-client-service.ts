import { db } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Wishlist } from "@/src/lib/firestore/types";

export async function addWishlist(data: Partial<Wishlist>) {
  const ref = collection(db, "wishlist");
  return await addDoc(ref, {
    ...data,
    isAchieved: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateWishlist(id: string, data: Partial<Wishlist>) {
  const ref = doc(db, "wishlist", id);
  return await updateDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteWishlist(id: string) {
  const ref = doc(db, "wishlist", id);
  return await deleteDoc(ref);
}
