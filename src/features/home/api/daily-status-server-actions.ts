"use server";

import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { DailyStatus } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

import { adminDb } from "@/src/lib/firebase-admin";
import { sendLinePushMessage } from "@/src/lib/line";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://candy-life.vercel.app";

export async function getDailyStatuses(dateStr: string) {
  const ref = collection(db, "daily_statuses");
  const q = query(ref, where("date", "==", dateStr));
  const snap = await getDocs(q);
  
  return snap.docs.map(doc => toPlainObject(doc) as DailyStatus);
}

/**
 * 自分が「今日のひとこと」を設定した時にパートナーにLINE通知を送る
 */
export async function notifyDailyStatusSaved(uid: string, comment: string) {
  try {
    // 自分のユーザー情報を取得してニックネームとパートナーのUIDを調べる
    const userDoc = await adminDb.collection("users").doc(uid).get();
    if (!userDoc.exists) return;
    
    const userData = userDoc.data();
    const nickname = userData?.nickname || "パートナー";
    const partnerUid = userData?.partnerUid;
    if (!partnerUid) return;

    // パートナーの通知設定を確認
    const settingsDoc = await adminDb.collection("notificationSettings").doc(partnerUid).get();
    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data();
      const dailyStatusEnabled = settingsData?.dailyStatusEnabled !== false; // デフォルト true
      if (!dailyStatusEnabled) {
        console.log(`Skipping daily status notification: Partner has disabled it.`);
        return;
      }
    }

    // パートナーのLINE UIDを取得
    const lineDoc = await adminDb.collection("lineMessagingIds").doc(partnerUid).get();
    if (!lineDoc.exists) return;
    
    const lineUid = lineDoc.data()?.lineUid;
    if (!lineUid) return;

    // メッセージ構築
    const text = `${nickname}ちゃんが今日のひとことを設定したよ！📝\n\n『${comment}』\n\n▼ CANDYでチェックする🍬\n${BASE_URL}/home`;

    await sendLinePushMessage(lineUid, [{ type: "text", text }]);
  } catch (e) {
    console.error("Failed to notifyDailyStatusSaved", e);
  }
}

/**
 * パートナーのひとことにコメントした時にパートナーにLINE通知を送る
 */
export async function notifyDailyStatusCommented(commenterUid: string, targetUid: string, comment: string) {
  try {
    // コメントした本人（自分）のニックネームを取得
    const commenterDoc = await adminDb.collection("users").doc(commenterUid).get();
    if (!commenterDoc.exists) return;
    
    const commenterData = commenterDoc.data();
    const nickname = commenterData?.nickname || "パートナー";

    // コメントされた相手（ターゲット）の通知設定を確認
    const settingsDoc = await adminDb.collection("notificationSettings").doc(targetUid).get();
    if (settingsDoc.exists) {
      const settingsData = settingsDoc.data();
      const dailyStatusCommentEnabled = settingsData?.dailyStatusCommentEnabled !== false; // デフォルト true
      if (!dailyStatusCommentEnabled) {
        console.log(`Skipping comment notification: Partner has disabled it.`);
        return;
      }
    }

    // 通知先（パートナー）のLINE UIDを取得
    const lineDoc = await adminDb.collection("lineMessagingIds").doc(targetUid).get();
    if (!lineDoc.exists) return;
    
    const lineUid = lineDoc.data()?.lineUid;
    if (!lineUid) return;

    // メッセージ構築
    const text = `${nickname}ちゃんから今日のひとことにコメントが届いたよ！💌\n\n『${comment}』\n\n▼ CANDYでチェックする🍬\n${BASE_URL}/home`;

    await sendLinePushMessage(lineUid, [{ type: "text", text }]);
  } catch (e) {
    console.error("Failed to notifyDailyStatusCommented", e);
  }
}
