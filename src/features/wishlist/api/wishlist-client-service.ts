import { db } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, serverTimestamp } from "firebase/firestore";
import { Wishlist } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/** クライアント認証済みSDKでwishlistを全件取得 */
export async function getWishlist(): Promise<Wishlist[]> {
  const ref = collection(db, "wishlist");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Wishlist);
}

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
