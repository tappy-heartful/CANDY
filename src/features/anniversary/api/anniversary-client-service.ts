import { db } from "@/src/lib/firebase";
import { collection, doc, addDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { Anniversary } from "@/src/lib/firestore/types";

const COLLECTION_NAME = "anniversaries";

export async function addAnniversary(uid: string, data: { title: string; date: string; note?: string }) {
  const colRef = collection(db, COLLECTION_NAME);
  const docRef = await addDoc(colRef, {
    ...data,
    uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef;
}

export async function updateAnniversary(id: string, data: Partial<Anniversary>) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteAnniversary(id: string) {
  const docRef = doc(db, COLLECTION_NAME, id);
  await deleteDoc(docRef);
}

import { getDocs, query, where } from "firebase/firestore";

export async function getAnniversaries(uid: string, partnerUid?: string | null): Promise<Anniversary[]> {
  const uids = partnerUid ? [uid, partnerUid] : [uid];
  const colRef = collection(db, COLLECTION_NAME);
  const q = query(colRef, where("uid", "in", uids));
  const snap = await getDocs(q);
  
  const results = snap.docs.map(docSnap => {
    const data = docSnap.data();
    return {
      ...data,
      id: docSnap.id,
      createdAt: data.createdAt?.toMillis() || Date.now(),
      updatedAt: data.updatedAt?.toMillis() || Date.now(),
    } as Anniversary;
  });

  results.sort((a, b) => b.createdAt - a.createdAt);
  return results;
}
