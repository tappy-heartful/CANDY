import { db, storage } from "@/src/lib/firebase";
import EXIF from "exif-js";
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
  writeBatch,
  limit,
  arrayUnion,
  arrayRemove
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { compressImage } from "@/src/lib/image-compression";

import type { Album, Photo, Prefecture, Municipality } from "@/src/lib/firestore/types";
export type { Album, Photo, Prefecture, Municipality };

// すべてのアルバムを取得
export async function getAlbums(): Promise<Album[]> {
  const ref = collection(db, "albums");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Album);
}

// 都道府県一覧を取得
export async function getPrefectures(): Promise<Prefecture[]> {
  const ref = collection(db, "prefectures");
  const q = query(ref, orderBy("code", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Prefecture);
}

// 都道府県コードに一致する市区町村一覧を取得
export async function getMunicipalities(prefCode: string): Promise<Municipality[]> {
  const ref = collection(db, "municipalities");
  const q = query(ref, where("prefCode", "==", prefCode), orderBy("code", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Municipality);
}

// アルバムを作成
export async function createAlbum(
  name: string,
  uid: string,
  prefectureCode?: string,
  prefectureName?: string,
  municipalityCode?: string,
  municipalityName?: string,
  dateMode?: "single" | "range",
  startDate?: string,
  endDate?: string
): Promise<string> {
  const ref = collection(db, "albums");
  const docRef = await addDoc(ref, {
    name,
    uid,
    prefectureCode: prefectureCode || null,
    prefectureName: prefectureName || null,
    municipalityCode: municipalityCode || null,
    municipalityName: municipalityName || null,
    dateMode: dateMode || "single",
    startDate: startDate || null,
    endDate: endDate || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

// アルバム情報を更新
export async function updateAlbum(
  albumId: string,
  name: string,
  prefectureCode?: string,
  prefectureName?: string,
  municipalityCode?: string,
  municipalityName?: string,
  dateMode?: "single" | "range",
  startDate?: string,
  endDate?: string
) {
  const ref = doc(db, "albums", albumId);
  return await updateDoc(ref, {
    name,
    prefectureCode: prefectureCode || null,
    prefectureName: prefectureName || null,
    municipalityCode: municipalityCode || null,
    municipalityName: municipalityName || null,
    dateMode: dateMode || "single",
    startDate: startDate || null,
    endDate: endDate || null,
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

// 画像ファイルからExifの撮影日時(DateTimeOriginal)を取得するヘルパー関数
export function getExifTakenAt(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      resolve(null);
      return;
    }

    try {
      EXIF.getData(file as any, function (this: any) {
        const dateTimeStr = EXIF.getTag(this, "DateTimeOriginal");
        if (dateTimeStr) {
          // EXIF形式 "YYYY:MM:DD HH:MM:SS" を JS Date でパース可能な形式に変換
          const parts = dateTimeStr.split(" ");
          if (parts.length === 2) {
            const datePart = parts[0].replace(/:/g, "-");
            const timePart = parts[1];
            const date = new Date(`${datePart}T${timePart}`);
            if (!isNaN(date.getTime())) {
              resolve(date.getTime());
              return;
            }
          }
        }
        resolve(null);
      });
    } catch (e) {
      console.error("Exif parsing failed:", e);
      resolve(null);
    }
  });
}

// 度分秒 (DMS) 形式から 10進数 (Decimal Degrees) に変換するヘルパー関数
function convertDMSToDD(dms: any, ref: string): number | null {
  if (!dms || !Array.isArray(dms) || dms.length < 3) return null;
  const degrees = typeof dms[0] === "number" ? dms[0] : Number(dms[0]);
  const minutes = typeof dms[1] === "number" ? dms[1] : Number(dms[1]);
  const seconds = typeof dms[2] === "number" ? dms[2] : Number(dms[2]);

  if (isNaN(degrees) || isNaN(minutes) || isNaN(seconds)) return null;

  let dd = degrees + minutes / 60 + seconds / 3600;
  if (ref === "S" || ref === "W") {
    dd = dd * -1;
  }
  return Number(dd.toFixed(6));
}

// 画像ファイルからExifの位置情報(GPSLatitude/GPSLongitude)を取得するヘルパー関数
export function getExifLocation(file: File): Promise<{ latitude: number; longitude: number } | null> {
  return new Promise((resolve) => {
    if (file.type !== "image/jpeg" && file.type !== "image/jpg") {
      resolve(null);
      return;
    }

    try {
      EXIF.getData(file as any, function (this: any) {
        const lat = EXIF.getTag(this, "GPSLatitude");
        const latRef = EXIF.getTag(this, "GPSLatitudeRef");
        const lon = EXIF.getTag(this, "GPSLongitude");
        const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

        if (lat && latRef && lon && lonRef) {
          const latitude = convertDMSToDD(lat, latRef);
          const longitude = convertDMSToDD(lon, lonRef);
          if (latitude !== null && longitude !== null) {
            resolve({ latitude, longitude });
            return;
          }
        }
        resolve(null);
      });
    } catch (e) {
      console.error("Exif GPS parsing failed:", e);
      resolve(null);
    }
  });
}

// 写真をアップロードしてDBに追加
export async function uploadPhoto(albumId: string, file: File, uid: string): Promise<Photo> {
  // Exifから撮影日時および位置情報を抽出
  let takenAt = await getExifTakenAt(file);
  if (!takenAt) {
    takenAt = file.lastModified || Date.now();
  }
  const location = await getExifLocation(file);

  // 画像ファイルをアップロード前に圧縮 (最大1200px, 品質0.75)
  const compressedFile = await compressImage(file, 1200, 0.75);

  const storagePath = `albums/${albumId}/${Date.now()}_${compressedFile.name}`;
  const storageRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(storageRef, compressedFile);
  const url = await getDownloadURL(snapshot.ref);

  const photoData: Record<string, any> = {
    albumId,
    url,
    uid,
    createdAt: Date.now(),
    takenAt,
  };

  if (location) {
    photoData.latitude = location.latitude;
    photoData.longitude = location.longitude;
  }

  const refPhotos = collection(db, "photos");
  const docRef = await addDoc(refPhotos, photoData);

  return {
    id: docRef.id,
    albumId,
    url,
    uid,
    createdAt: Date.now(),
    takenAt,
    ...(location ? { latitude: location.latitude, longitude: location.longitude } : {}),
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

// 最近追加された写真を取得する
export async function getRecentPhotos(limitCount: number = 10): Promise<Photo[]> {
  const ref = collection(db, "photos");
  const q = query(ref, orderBy("createdAt", "desc"), limit(limitCount));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Photo);
}

// 写真のお気に入り状態をトグルする
export async function togglePhotoFavorite(photoId: string, uid: string, isFavorite: boolean) {
  const photoRef = doc(db, "photos", photoId);
  return await updateDoc(photoRef, {
    favoriteUids: isFavorite ? arrayUnion(uid) : arrayRemove(uid),
  });
}

// すべての写真を取得する
export async function getAllPhotos(): Promise<Photo[]> {
  const ref = collection(db, "photos");
  const snap = await getDocs(ref);
  return snap.docs.map((d) => toPlainObject(d) as Photo);
}

