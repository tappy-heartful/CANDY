import { db, storage } from "@/src/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  writeBatch
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { toPlainObject } from "@/src/lib/firestore/utils";


// TODO
export interface Album {
  id: string;
  name: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
}

export interface Photo {
  id: string;
  albumId: string;
  url: string;
  uid: string;
  createdAt: number;
}

// すべてのアルバムを取得
export async function getAlbums(): Promise<Album[]> {
  const ref = collection(db, "albums");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Album);
}

// アルバムを作成
export async function createAlbum(name: string, uid: string): Promise<string> {
  const ref = collection(db, "albums");
  const docRef = await addDoc(ref, {
    name,
    uid,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

// アルバム名を更新
export async function updateAlbumName(albumId: string, name: string) {
  const ref = doc(db, "albums", albumId);
  return await updateDoc(ref, {
    name,
    updatedAt: Date.now(),
  });
}

// 特定のアルバムの写真を取得
export async function getPhotos(albumId: string): Promise<Photo[]> {
  const ref = collection(db, "photos");
  const q = query(ref, where("albumId", "==", albumId), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Photo);
}

// 写真をアップロードしてDBに追加
export async function uploadPhoto(albumId: string, file: File, uid: string): Promise<Photo> {
  const storagePath = `albums/${albumId}/${Date.now()}_${file.name}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);

  const refPhotos = collection(db, "photos");
  const docRef = await addDoc(refPhotos, {
    albumId,
    url,
    uid,
    createdAt: Date.now(),
  });

  return {
    id: docRef.id,
    albumId,
    url,
    uid,
    createdAt: Date.now(),
  };
}

// 選択された写真を削除
export async function deletePhotos(photos: Photo[]) {
  const batch = writeBatch(db);
  for (const photo of photos) {
    const photoRef = doc(db, "photos", photo.id);
    batch.delete(photoRef);

    // Storageから実ファイルを削除
    try {
      // URLからファイルパスをデコードして取得
      const decodedUrl = decodeURIComponent(photo.url);
      const parts = decodedUrl.split("/o/");
      if (parts.length > 1) {
        const filePath = parts[1].split("?")[0];
        const storageRef = ref(storage, filePath);
        await deleteObject(storageRef);
      }
    } catch (e) {
      console.error("Failed to delete storage file:", e);
    }
  }
  await batch.commit();
}

// アルバムと配下の全写真を削除
export async function deleteAlbum(albumId: string) {
  const photos = await getPhotos(albumId);
  if (photos.length > 0) {
    await deletePhotos(photos);
  }
  const albumRef = doc(db, "albums", albumId);
  await deleteDoc(albumRef);
}
