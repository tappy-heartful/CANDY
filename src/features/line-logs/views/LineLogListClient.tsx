"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import BackToHome from "@/src/components/Common/BackToHome";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import {
  getLineNotificationLogsByMonth,
  calculateMonthQuotaSummary,
  MonthQuotaSummary,
} from "../api/line-log-client-service";
import LineQuotaCard from "../components/LineQuotaCard";
import LineLogItem from "../components/LineLogItem";
import LineLogDetailModal from "../components/LineLogDetailModal";
import styles from "./LineLogList.module.css";

// 現在の日本時間の年月文字列 "YYYY-MM" を生成する
const getInitialYearMonth = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

export default function LineLogListClient() {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [currentYearMonth, setCurrentYearMonth] = useState<string>(getInitialYearMonth());
  const [logs, setLogs] = useState<LineNotificationLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedLog, setSelectedLog] = useState<LineNotificationLog | null>(null);
  const [partnerNickname, setPartnerNickname] = useState<string>("パートナー");

  // フィルター状態
  const [accountFilter, setAccountFilter] = useState<"all" | "periodic" | "event">("all");
  const [recipientFilter, setRecipientFilter] = useState<string>("all");

  // パンくずリストの設定
  useEffect(() => {
    setBreadcrumbs([
      { title: "設定", href: "/settings" },
      { title: "LINE送信履歴" },
    ]);
  }, [setBreadcrumbs]);

  // パートナー情報の取得
  useEffect(() => {
    if (!user) return;
    getPartnerData(user.uid).then((partner) => {
      if (partner?.nickname) {
        setPartnerNickname(partner.nickname);
      }
    });
  }, [user]);

  // ログの取得関数
  const fetchLogs = useCallback(async (yearMonth: string) => {
    setIsLoading(true);
    try {
      const data = await getLineNotificationLogsByMonth(yearMonth);
      setLogs(data);
    } catch (err) {
      console.error("Failed to load logs:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 年月切り替え時にデータ取得
  useEffect(() => {
    fetchLogs(currentYearMonth);
  }, [currentYearMonth, fetchLogs]);

  // クォータ（配信枠）サマリーの計算
  const quotaSummary: MonthQuotaSummary = useMemo(() => {
    return calculateMonthQuotaSummary(currentYearMonth, logs);
  }, [currentYearMonth, logs]);

  // フィルタリングされたログリスト
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // アカウントフィルター
      if (accountFilter !== "all" && log.accountType !== accountFilter) {
        return false;
      }
      // 宛先フィルター
      if (recipientFilter !== "all") {
        if (recipientFilter === "me" && user && log.recipientUid !== user.uid) {
          return false;
        }
        if (recipientFilter === "partner" && user && log.recipientUid === user.uid) {
          return false;
        }
      }
      return true;
    });
  }, [logs, accountFilter, recipientFilter, user]);

  // 日付文字列のフォーマットヘルパー
  const formatLogDateHeader = useCallback((dateStr: string) => {
    const normalized = dateStr.replace(/\//g, "-");
    const [y, m, d] = normalized.split("-").map(Number);
    if (!y || !m || !d) return { text: dateStr, tag: "", isToday: false };

    const targetDate = new Date(y, m - 1, d);
    const days = ["日", "月", "火", "水", "木", "金", "土"];
    const dayOfWeek = days[targetDate.getDay()];

    const now = new Date();
    const isToday =
      now.getFullYear() === y &&
      now.getMonth() === m - 1 &&
      now.getDate() === d;

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      yesterday.getFullYear() === y &&
      yesterday.getMonth() === m - 1 &&
      yesterday.getDate() === d;

    let tag = "";
    if (isToday) tag = "本日";
    else if (isYesterday) tag = "昨日";

    return {
      text: `${m}月${d}日 (${dayOfWeek})`,
      tag,
      isToday,
    };
  }, []);

  // 日付ごとにグループ化されたログ
  const groupedLogs = useMemo(() => {
    const groups: {
      date: string;
      dateInfo: { text: string; tag: string; isToday: boolean };
      logs: LineNotificationLog[];
    }[] = [];
    const map = new Map<string, LineNotificationLog[]>();

    filteredLogs.forEach((log) => {
      let dKey = log.date;
      if (!dKey && log.sentAtFormatted) {
        dKey = log.sentAtFormatted.substring(0, 10).replace(/\//g, "-");
      }
      if (!dKey && log.sentAt) {
        const dt = new Date(log.sentAt);
        dKey = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
      }
      dKey = dKey || "日付未設定";

      if (!map.has(dKey)) {
        map.set(dKey, []);
      }
      map.get(dKey)!.push(log);
    });

    map.forEach((logList, dateKey) => {
      groups.push({
        date: dateKey,
        dateInfo: formatLogDateHeader(dateKey),
        logs: logList,
      });
    });

    return groups;
  }, [filteredLogs, formatLogDateHeader]);

  // 年月操作ヘルパー
  const handlePrevMonth = () => {
    const [y, m] = currentYearMonth.split("-").map(Number);
    const prevDate = new Date(y, m - 2, 1);
    const newY = prevDate.getFullYear();
    const newM = String(prevDate.getMonth() + 1).padStart(2, "0");
    setCurrentYearMonth(`${newY}-${newM}`);
  };

  const handleNextMonth = () => {
    const [y, m] = currentYearMonth.split("-").map(Number);
    const nextDate = new Date(y, m, 1);
    const newY = nextDate.getFullYear();
    const newM = String(nextDate.getMonth() + 1).padStart(2, "0");
    setCurrentYearMonth(`${newY}-${newM}`);
  };

  // 年月表示文字列（例: 2026年10月）
  const displayMonthLabel = useMemo(() => {
    const [y, m] = currentYearMonth.split("-").map(Number);
    return `${y}年${m}月`;
  }, [currentYearMonth]);

  return (
    <div className={styles.pageWrapper}>
      {/* ヘッダーエリア */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>
          <i className="fa-solid fa-paper-plane"></i>
          <span>LINE送信履歴</span>
        </h1>
        <div className={styles.headerActions}>
          <button
            className={styles.refreshBtn}
            onClick={() => fetchLogs(currentYearMonth)}
            disabled={isLoading}
            title="最新の情報に更新"
          >
            <i className={`fa-solid fa-rotate-right ${isLoading ? "fa-spin" : ""}`}></i>
            <span>更新</span>
          </button>
        </div>
      </div>

      {/* 年月セレクター */}
      <div className={styles.monthControlCard}>
        <button
          className={styles.monthNavBtn}
          onClick={handlePrevMonth}
          title="前月"
          aria-label="前月"
        >
          <i className="fa-solid fa-chevron-left"></i>
        </button>

        <div className={styles.monthDisplay}>
          <i className="fa-regular fa-calendar" style={{ color: "#10b981" }}></i>
          <span>{displayMonthLabel}</span>
        </div>

        <button
          className={styles.monthNavBtn}
          onClick={handleNextMonth}
          title="翌月"
          aria-label="翌月"
        >
          <i className="fa-solid fa-chevron-right"></i>
        </button>
      </div>

      {/* 残通数・配信状況ゲージカード */}
      <LineQuotaCard
        quotaSummary={quotaSummary}
        displayMonthLabel={displayMonthLabel}
      />

      {/* 絞り込みフィルターカード */}
      <div className={styles.filterCard}>
        <div className={styles.filterTabs}>
          <button
            className={`${styles.filterTab} ${
              accountFilter === "all" ? styles.filterTabActive : ""
            }`}
            onClick={() => setAccountFilter("all")}
          >
            すべて ({logs.length})
          </button>
          <button
            className={`${styles.filterTab} ${
              accountFilter === "periodic" ? styles.filterTabActive : ""
            }`}
            onClick={() => setAccountFilter("periodic")}
          >
            <i className="fa-solid fa-sun" style={{ fontSize: "0.75rem" }}></i>
            定期通知 ({logs.filter((l) => l.accountType === "periodic").length})
          </button>
          <button
            className={`${styles.filterTab} ${
              accountFilter === "event" ? styles.filterTabActive : ""
            }`}
            onClick={() => setAccountFilter("event")}
          >
            <i className="fa-solid fa-bell" style={{ fontSize: "0.75rem" }}></i>
            リマインダー ({logs.filter((l) => l.accountType === "event").length})
          </button>
        </div>

        <div className={styles.filterSubRow}>
          <div className={styles.userFilterGroup}>
            <i className="fa-solid fa-filter" style={{ color: "#94a3b8" }}></i>
            <span>宛先:</span>
            <select
              className={styles.userSelect}
              value={recipientFilter}
              onChange={(e) => setRecipientFilter(e.target.value)}
            >
              <option value="all">全員</option>
              <option value="me">自分あて</option>
              <option value="partner">{partnerNickname}あて</option>
            </select>
          </div>

          <div className={styles.logCountText}>
            表示中: <strong>{filteredLogs.length}</strong> 件
          </div>
        </div>
      </div>

      {/* ログ一覧 */}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>送信履歴を読み込み中...</p>
        </div>
      ) : groupedLogs.length > 0 ? (
        <div className={styles.logListContainer}>
          {groupedLogs.map((group) => (
            <div key={group.date} className={styles.dateGroupSection}>
              {/* 日付見出し */}
              <div className={styles.dateGroupHeader}>
                <div className={styles.dateGroupTitle}>
                  <span>{group.dateInfo.text}</span>
                  {group.dateInfo.tag && (
                    <span
                      className={`${styles.dateTag} ${
                        group.dateInfo.isToday ? styles.dateTagToday : ""
                      }`}
                    >
                      {group.dateInfo.tag}
                    </span>
                  )}
                </div>
                <span className={styles.dateGroupCountText}>
                  {group.logs.length}件
                </span>
              </div>

              {/* その日の送信履歴カード一覧 */}
              <div className={styles.dateGroupItems}>
                {group.logs.map((log) => (
                  <LineLogItem
                    key={log.id}
                    log={log}
                    onClick={() => setSelectedLog(log)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <i className="fa-regular fa-paper-plane"></i>
          </div>
          <h3 className={styles.emptyTitle}>
            {logs.length === 0
              ? `${displayMonthLabel}の送信履歴はありません`
              : "条件に一致する送信履歴がありません"}
          </h3>
          <p className={styles.emptyDesc}>
            {logs.length === 0
              ? "GASの定期通知や予定リマインダーが送信されると、ここに詳細なメッセージ内容や消費通数が記録されます。"
              : "フィルター条件を変更して再度ご確認ください。"}
          </p>
        </div>
      )}

      {/* 詳細モーダル */}
      <LineLogDetailModal
        log={selectedLog}
        onClose={() => setSelectedLog(null)}
      />

      {/* 下部ナビゲーション */}
      <div className={styles.navBottom}>
        <Link href="/settings" className={styles.backSettingsLink}>
          <i className="fa-solid fa-arrow-left"></i> 通知設定に戻る
        </Link>
      </div>

      <BackToHome />
    </div>
  );
}
