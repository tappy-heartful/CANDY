import { db } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, getDocs, query, orderBy, where } from "firebase/firestore";
import { CalendarEvent, Todo } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * 指定した年月のカレンダーグリッド（42日分）をカバーする日付範囲（前月1日〜翌月末日）を算出
 * @param year 対象年 (例: 2026)
 * @param month 対象月 (1〜12)
 */
export function getMonthDateRange(year: number, month: number): { startDate: string; endDate: string } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const prevMonthDate = new Date(year, month - 2, 1);
  const nextMonthLastDate = new Date(year, month + 1, 0);

  const startYear = prevMonthDate.getFullYear();
  const startMonth = pad(prevMonthDate.getMonth() + 1);
  const startDay = "01";

  const endYear = nextMonthLastDate.getFullYear();
  const endMonth = pad(nextMonthLastDate.getMonth() + 1);
  const endDay = pad(nextMonthLastDate.getDate());

  return {
    startDate: `${startYear}-${startMonth}-${startDay}`,
    endDate: `${endYear}-${endMonth}-${endDay}`,
  };
}

/**
 * クライアント認証済みSDKで日付範囲を指定してイベントを取得
 * @param startDate 開始日 (YYYY-MM-DD)
 * @param endDate 終了日 (YYYY-MM-DD)
 */
export async function getEventsByDateRange(startDate: string, endDate: string): Promise<CalendarEvent[]> {
  const ref = collection(db, "events");
  const q = query(
    ref,
    where("startDate", ">=", startDate),
    where("startDate", "<=", endDate),
    orderBy("startDate", "asc")
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as CalendarEvent);
}

/**
 * クライアント認証済みSDKで指定月（カレンダーグリッドに表示される前月・翌月含む）のイベントを取得
 * @param year 年 (例: 2026)
 * @param month 月 (1〜12)
 */
export async function getEventsByMonth(year: number, month: number): Promise<CalendarEvent[]> {
  const { startDate, endDate } = getMonthDateRange(year, month);
  return getEventsByDateRange(startDate, endDate);
}

/** クライアント認証済みSDKでイベントを取得（全件） */
export async function getEvents(): Promise<CalendarEvent[]> {
  const ref = collection(db, "events");
  const q = query(ref, orderBy("startDate", "asc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as CalendarEvent);
}

/** クライアント認証済みSDKでtodosを取得（全件） */
export async function getTodosForCalendar(): Promise<Todo[]> {
  const ref = collection(db, "todos");
  const q = query(ref, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);
  return snap.docs.map((d) => toPlainObject(d) as Todo);
}

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
