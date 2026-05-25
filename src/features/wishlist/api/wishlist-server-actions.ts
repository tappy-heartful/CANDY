import { db } from "@/src/lib/firebase";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { Wishlist } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

export async function getWishlist(uid: string) {
  const ref = collection(db, "wishlist");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  
  const all = snap.docs.map(doc => toPlainObject(doc) as Wishlist);
  
  return all.filter(w => 
    w.uid === uid || 
    w.type === "couple" || 
    (w.type === "personal" && w.showToPartner)
  );
}
