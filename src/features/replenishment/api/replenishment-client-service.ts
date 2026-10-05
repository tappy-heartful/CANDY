import { db } from "@/src/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";
import { ReplenishmentCategory, ReplenishmentItem } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

// デフォルトのジャンル一覧
export const DEFAULT_CATEGORIES = [
  "日用品",
  "バス・洗面",
  "キッチン",
  "ヘルスケア",
  "食品・調味料",
  "その他",
];

// 日本時間基準の今日の日付文字列 "YYYY-MM-DD"
export function getTodayDateStr(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// 2つの日付文字列 ("YYYY-MM-DD") の差分日数を計算
export function calculateDaysBetween(startDateStr: string, endDateStr: string): number {
  if (!startDateStr || !endDateStr) return 0;
  const d1 = new Date(startDateStr.replace(/-/g, "/"));
  const d2 = new Date(endDateStr.replace(/-/g, "/"));
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

// 指定日付に日数を足した日付文字列 ("YYYY-MM-DD") を取得
export function addDaysToDateStr(dateStr: string, days: number): string {
  const d = new Date(dateStr.replace(/-/g, "/"));
  d.setDate(d.getDate() + days);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export interface ItemStatusInfo {
  passedDays: number; // 前回購入からの経過日数
  remainingDays: number; // 使い切り目安までの残り日数 (cycleDays - passedDays)
  nextDateStr: string; // 次回購入目安日 ("YYYY-MM-DD")
  isOverdue: boolean; // 目安日を超過しているか
  isDueSoon: boolean; // 通知対象期間に入っているか (remainingDays <= reminderDaysBefore)
  statusLevel: "safe" | "warning" | "danger";
  statusText: string;
  progressPercent: number; // 0〜100% (経過割合)
}

/**
 * アイテムの消費・買い足し状態を計算する
 */
export function calculateItemStatus(item: ReplenishmentItem, todayStr?: string): ItemStatusInfo {
  const today = todayStr || getTodayDateStr();
  const passedDays = Math.max(0, calculateDaysBetween(item.lastPurchasedDate, today));
  const cycle = Math.max(1, item.cycleDays || 30);
  const remainingDays = cycle - passedDays;
  const reminderBefore = item.reminderDaysBefore !== undefined ? item.reminderDaysBefore : 3;
  const nextDateStr = addDaysToDateStr(item.lastPurchasedDate, cycle);

  const isOverdue = remainingDays <= 0;
  const isDueSoon = remainingDays <= reminderBefore;

  let statusLevel: "safe" | "warning" | "danger" = "safe";
  let statusText = "余裕あり🍀";

  if (isOverdue) {
    statusLevel = "danger";
    statusText = `買い足し時期です（目安+${Math.abs(remainingDays)}日）`;
  } else if (isDueSoon) {
    statusLevel = "warning";
    statusText = `そろそろ買い足し時期（あと${remainingDays}日）`;
  } else {
    statusLevel = "safe";
    statusText = `あと${remainingDays}日（余裕あり）`;
  }

  const progressPercent = Math.min(100, Math.round((passedDays / cycle) * 100));

  return {
    passedDays,
    remainingDays,
    nextDateStr,
    isOverdue,
    isDueSoon,
    statusLevel,
    statusText,
    progressPercent,
  };
}

// ==========================================
// ジャンル（カテゴリ）API
// ==========================================

export async function getReplenishmentCategories(): Promise<ReplenishmentCategory[]> {
  const colRef = collection(db, "replenishmentCategories");
  const q = query(colRef, orderBy("order", "asc"));
  const snap = await getDocs(q);
  const list: ReplenishmentCategory[] = [];
  snap.forEach((doc) => {
    list.push(toPlainObject(doc) as ReplenishmentCategory);
  });
  return list;
}

export async function initDefaultCategoriesIfEmpty(uid: string): Promise<ReplenishmentCategory[]> {
  const existing = await getReplenishmentCategories();
  if (existing.length > 0) return existing;

  const colRef = collection(db, "replenishmentCategories");
  const now = Date.now();
  const created: ReplenishmentCategory[] = [];

  for (let i = 0; i < DEFAULT_CATEGORIES.length; i++) {
    const name = DEFAULT_CATEGORIES[i];
    const docRef = await addDoc(colRef, {
      name,
      order: i,
      uid,
      createdAt: now,
      updatedAt: now,
    });
    created.push({
      id: docRef.id,
      name,
      order: i,
      uid,
      createdAt: now,
      updatedAt: now,
    });
  }

  return created;
}

export async function addReplenishmentCategory(name: string, uid: string, order?: number): Promise<string> {
  const colRef = collection(db, "replenishmentCategories");
  const now = Date.now();
  const docRef = await addDoc(colRef, {
    name: name.trim(),
    order: order ?? now,
    uid,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateReplenishmentCategory(id: string, name: string): Promise<void> {
  const docRef = doc(db, "replenishmentCategories", id);
  await updateDoc(docRef, {
    name: name.trim(),
    updatedAt: Date.now(),
  });
}

export async function deleteReplenishmentCategory(id: string): Promise<void> {
  const docRef = doc(db, "replenishmentCategories", id);
  await deleteDoc(docRef);
}

// ==========================================
// アイテムAPI
// ==========================================

export async function getReplenishmentItems(): Promise<ReplenishmentItem[]> {
  const colRef = collection(db, "replenishments");
  const snap = await getDocs(colRef);
  const list: ReplenishmentItem[] = [];
  snap.forEach((doc) => {
    list.push(toPlainObject(doc) as ReplenishmentItem);
  });
  // 作成日時降順でソート
  list.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
  return list;
}

export async function addReplenishmentItem(
  data: Omit<ReplenishmentItem, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const colRef = collection(db, "replenishments");
  const now = Date.now();
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updateReplenishmentItem(
  id: string,
  data: Partial<ReplenishmentItem>
): Promise<void> {
  const docRef = doc(db, "replenishments", id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: Date.now(),
  });
}

export async function deleteReplenishmentItem(id: string): Promise<void> {
  const docRef = doc(db, "replenishments", id);
  await deleteDoc(docRef);
}

/**
 * 「今日買った！」アクション: 前回購入日を本日の日付に更新する
 */
export async function markItemAsPurchasedToday(id: string): Promise<void> {
  const docRef = doc(db, "replenishments", id);
  await updateDoc(docRef, {
    lastPurchasedDate: getTodayDateStr(),
    updatedAt: Date.now(),
  });
}
