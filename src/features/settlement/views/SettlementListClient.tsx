"use client";

import React, { useEffect, useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import Link from "next/link";
import styles from "./Settlement.module.css";
import EventModal from "../components/EventModal";
import { errorLog } from "@/src/lib/functions";
import {
  getSettlementEvents,
  createSettlementEvent,
} from "../api/settlement-client-service";
import type { SettlementEvent } from "@/src/lib/firestore/types";

export default function SettlementListClient() {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [events, setEvents] = useState<SettlementEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"unsettled" | "settled">("unsettled");
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ title: "ワリカン" }]);
  }, [setBreadcrumbs]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const data = await getSettlementEvents();
      setEvents(data);
    } catch (e) {
      console.error("Failed to load settlement events:", e);
      errorLog("清算イベント一覧読み込み", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadEvents();
    }
  }, [user]);

  const handleCreateEvent = async (data: {
    name: string;
    prefectureCode?: string;
    prefectureName?: string;
    municipalityCode?: string;
    municipalityName?: string;
    dateMode?: "single" | "range";
    startDate?: string;
    endDate?: string;
  }) => {
    if (!user) return;
    setIsSubmitting(true);
    try {
      await createSettlementEvent(
        data.name,
        user.uid,
        data.prefectureCode,
        data.prefectureName,
        data.municipalityCode,
        data.municipalityName,
        data.dateMode,
        data.startDate,
        data.endDate
      );
      setIsEventModalOpen(false);
      await loadEvents();
    } catch (e) {
      console.error("Failed to create event:", e);
      errorLog("清算イベント新規作成", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const unsettledEvents = events.filter((e) => !e.isSettled);
  const settledEvents = events.filter((e) => e.isSettled);
  const displayedEvents = activeTab === "unsettled" ? unsettledEvents : settledEvents;

  const formatDateDisplay = (evt: SettlementEvent) => {
    if (!evt.startDate) return null;
    const start = evt.startDate.replace(/-/g, "/");
    if (evt.dateMode === "range" && evt.endDate) {
      const end = evt.endDate.replace(/-/g, "/");
      return `${start} 〜 ${end}`;
    }
    return start;
  };

  return (
    <AuthGuard>
      <div className={`page-container ${styles.container}`}>
        <div className={styles.headerRow}>
          <h1 className={styles.pageTitle}>
            <i className={`fa-solid fa-hand-holding-dollar ${styles.titleIcon}`}></i>
            ワリカン（イベント清算）
          </h1>
          <button className={styles.createBtn} onClick={() => setIsEventModalOpen(true)}>
            <i className="fa-solid fa-plus"></i>
            <span>イベントを作成</span>
          </button>
        </div>

        {/* タブ切替 */}
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabBtn} ${activeTab === "unsettled" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("unsettled")}
          >
            <span>未清算のイベント</span>
            <span className={styles.tabBadge}>{unsettledEvents.length}</span>
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === "settled" ? styles.activeTab : ""}`}
            onClick={() => setActiveTab("settled")}
          >
            <span>清算完了済み</span>
            <span className={styles.tabBadge} style={{ background: "#81c784" }}>
              {settledEvents.length}
            </span>
          </button>
        </div>

        {/* 一覧グリッド */}
        {loading ? (
          <div className={styles.emptyState}>
            <i className={`fa-solid fa-spinner fa-spin ${styles.emptyIcon}`}></i>
            <p>データを読み込み中...</p>
          </div>
        ) : displayedEvents.length === 0 ? (
          <div className={styles.emptyState}>
            <i className={`fa-solid fa-receipt ${styles.emptyIcon}`}></i>
            <p>{activeTab === "unsettled" ? "未清算のイベントはありません🎉" : "清算完了済みのイベントはありません"}</p>
          </div>
        ) : (
          <div className={styles.eventGrid}>
            {displayedEvents.map((evt) => {
              const dateStr = formatDateDisplay(evt);
              const locationStr = [evt.prefectureName, evt.municipalityName].filter(Boolean).join(" ");

              return (
                <Link href={`/settlement/${evt.id}`} key={evt.id} className={styles.eventCard}>
                  <div>
                    <div className={styles.eventHeader}>
                      <span className={styles.eventName}>{evt.name}</span>
                      <span
                        className={`${styles.statusBadge} ${
                          evt.isSettled ? styles.badgeSettled : styles.badgeUnsettled
                        }`}
                      >
                        {evt.isSettled
                          ? `✓ 清算完了${
                              evt.settlementMode === "even"
                                ? " (均等割)"
                                : evt.settlementMode
                                ? " (希望割合)"
                                : ""
                            }`
                          : "未清算"}
                      </span>
                    </div>

                    {/* 日付・場所のサブメタ情報 */}
                    <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px", fontSize: "12px", color: "#666" }}>
                      {dateStr && (
                        <span>
                          <i className="fa-regular fa-calendar-days" style={{ color: "#ff758c", marginRight: "4px" }}></i>
                          {dateStr}
                        </span>
                      )}
                      {locationStr && (
                        <span>
                          <i className="fa-solid fa-location-dot" style={{ color: "#a0e7d2", marginRight: "4px" }}></i>
                          {locationStr}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={styles.eventFooter}>
                    <span style={{ fontSize: "11px" }}>詳細・計算を見る <i className="fa-solid fa-chevron-right"></i></span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        <EventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          onSave={handleCreateEvent}
          isSubmitting={isSubmitting}
        />
      </div>
    </AuthGuard>
  );
}
