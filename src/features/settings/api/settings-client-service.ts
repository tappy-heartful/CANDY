import { db } from "@/src/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { NotificationSetting } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

// デフォルト値の定義
export const DEFAULT_NOTIFICATION_SETTING = {
  morningEnabled: true,
  morningTime: "08:00",
  eventReminderEnabled: true,
  eventReminderMinutes: [10],
  dailyStatusEnabled: true,
  dailyStatusCommentEnabled: true,
};

/**
 * ユーザーの通知設定を取得する
 * ドキュメントが存在しない場合はデフォルト値をマージしたものを返す
 */
export async function getNotificationSetting(uid: string): Promise<NotificationSetting> {
  const docRef = doc(db, "notificationSettings", uid);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return {
      id: uid,
      uid,
      ...DEFAULT_NOTIFICATION_SETTING,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    } as NotificationSetting;
  }

  const data = toPlainObject(snap) as NotificationSetting;
  return {
    ...DEFAULT_NOTIFICATION_SETTING,
    ...data,
    id: snap.id,
    uid: snap.id,
  };
}

/**
 * ユーザーの通知設定を保存する
 */
export async function saveNotificationSetting(uid: string, data: Partial<NotificationSetting>) {
  const docRef = doc(db, "notificationSettings", uid);
  const now = serverTimestamp();

  // 既存データがあるか確認
  const snap = await getDoc(docRef);
  if (!snap.exists()) {
    // 新規作成
    return await setDoc(docRef, {
      ...DEFAULT_NOTIFICATION_SETTING,
      ...data,
      uid,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    // 更新
    return await setDoc(docRef, {
      ...data,
      updatedAt: now,
    }, { merge: true });
  }
}
