import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs, orderBy, limit } from "firebase/firestore";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

export const MONTHLY_QUOTA_LIMIT = 200; // LINE公式アカウント無料プランの月間上限通数（吹き出し数）

export interface AccountQuotaInfo {
  accountType: "periodic" | "event";
  accountName: string;
  consumed: number; // 使用通数
  remaining: number; // 残り通数
  limit: number; // 上限 (200)
  usageRate: number; // 使用率 (0〜100%)
  statusLevel: "safe" | "warning" | "danger"; // safe (<60%), warning (60-85%), danger (>85%)
}

export interface MonthQuotaSummary {
  yearMonth: string;
  periodic: AccountQuotaInfo;
  event: AccountQuotaInfo;
  totalConsumed: number;
}

/**
 * 指定した年月のLINE送信ログ一覧を取得する
 * @param yearMonth "YYYY-MM" (例: "2026-10")
 */
export async function getLineNotificationLogsByMonth(yearMonth: string): Promise<LineNotificationLog[]> {
  try {
    const logsRef = collection(db, "lineNotificationLogs");
    const q = query(
      logsRef,
      where("yearMonth", "==", yearMonth)
    );
    const snap = await getDocs(q);
    const logs: LineNotificationLog[] = [];

    snap.forEach((doc) => {
      logs.push(toPlainObject(doc) as LineNotificationLog);
    });

    // 送信日時の降順（新しい順）でソート
    logs.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));

    return logs;
  } catch (err) {
    console.error("Failed to fetch line notification logs for month:", yearMonth, err);
    // where句でのエラー（インデックス等）のフォールバックとして全件取得からフィルタ
    try {
      const logsRef = collection(db, "lineNotificationLogs");
      const fallbackSnap = await getDocs(logsRef);
      const allLogs: LineNotificationLog[] = [];
      fallbackSnap.forEach((doc) => {
        const item = toPlainObject(doc) as LineNotificationLog;
        if (item.yearMonth === yearMonth) {
          allLogs.push(item);
        }
      });
      allLogs.sort((a, b) => (b.sentAt || 0) - (a.sentAt || 0));
      return allLogs;
    } catch (fallbackErr) {
      console.error("Fallback fetch also failed:", fallbackErr);
      return [];
    }
  }
}

/**
 * 送信ログ一覧から各公式アカウントの残通数・使用状況サマリーを計算する
 */
export function calculateMonthQuotaSummary(yearMonth: string, logs: LineNotificationLog[]): MonthQuotaSummary {
  let periodicConsumed = 0;
  let eventConsumed = 0;

  logs.forEach((log) => {
    // 成功または送信試行された吹き出し数を合算（LINEは試行/配信でカウント）
    const count = log.messageCount || (log.messages?.length || 1);
    if (log.accountType === "event") {
      eventConsumed += count;
    } else {
      // "periodic" またはその他（デフォルトは定期通知アカウント）
      periodicConsumed += count;
    }
  });

  const getStatusLevel = (rate: number): "safe" | "warning" | "danger" => {
    if (rate >= 85) return "danger";
    if (rate >= 60) return "warning";
    return "safe";
  };

  const periodicRate = Math.min(100, Math.round((periodicConsumed / MONTHLY_QUOTA_LIMIT) * 100));
  const eventRate = Math.min(100, Math.round((eventConsumed / MONTHLY_QUOTA_LIMIT) * 100));

  return {
    yearMonth,
    periodic: {
      accountType: "periodic",
      accountName: "定期通知公式アカウント",
      consumed: periodicConsumed,
      remaining: Math.max(0, MONTHLY_QUOTA_LIMIT - periodicConsumed),
      limit: MONTHLY_QUOTA_LIMIT,
      usageRate: periodicRate,
      statusLevel: getStatusLevel(periodicRate),
    },
    event: {
      accountType: "event",
      accountName: "イベント通知公式アカウント",
      consumed: eventConsumed,
      remaining: Math.max(0, MONTHLY_QUOTA_LIMIT - eventConsumed),
      limit: MONTHLY_QUOTA_LIMIT,
      usageRate: eventRate,
      statusLevel: getStatusLevel(eventRate),
    },
    totalConsumed: periodicConsumed + eventConsumed,
  };
}
