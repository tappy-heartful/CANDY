"use client";

import { useEffect, useState } from "react";
import { DailyStatus, User as FirestoreUser } from "@/src/lib/firestore/types";
import { getDailyStatusHistory, saveDailyStatus } from "@/src/features/home/api/daily-status-client-service";
import DailyStatusCard from "@/src/features/home/components/DailyStatusCard";
import DailyStatusModal from "@/src/features/home/components/DailyStatusModal";
import styles from "./StatusHistory.module.css";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { showDialog, showSpinner, hideSpinner, errorLog } from "@/src/lib/functions";
import Link from "next/link";
import AuthGuard from "@/src/components/AuthGuard";
import BackToHome from "@/src/components/Common/BackToHome";

const DAYS = ["日", "月", "火", "水", "木", "金", "土"];
const formatDateStr = (dateStr: string) => {
  const parts = dateStr.split("-").map(Number);
  if (parts.length < 3 || parts.some(isNaN)) return dateStr;
  const d = new Date(parts[0], parts[1] - 1, parts[2]);
  return `${d.getMonth() + 1}月${d.getDate()}日(${DAYS[d.getDay()]})`;
};

export default function StatusHistoryClient() {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, DailyStatus[]>>({});
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStatus, setEditingStatus] = useState<DailyStatus | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchHistory = async () => {
    try {
      const data = await getDailyStatusHistory(60);
      const grouped: Record<string, DailyStatus[]> = {};
      data.forEach(status => {
        if (!grouped[status.date]) {
          grouped[status.date] = [];
        }
        grouped[status.date].push(status);
      });
      setHistoryData(grouped);
    } catch (err) {
      console.error("Failed to fetch history:", err);
      errorLog("今日の一言・体調履歴読み込み", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.uid) {
      getPartnerData(user.uid).then(setPartnerData);
    }
  }, [user]);

  useEffect(() => {
    setBreadcrumbs([{ title: "過去の私たち" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSaveDailyStatus = async (statusData: Partial<DailyStatus>) => {
    if (!user) return;
    setIsSubmitting(true);
    showSpinner();
    try {
      const submitData = {
        ...statusData,
        uid: user.uid,
        date: editingStatus?.date,
        ...(editingStatus?.id ? { id: editingStatus.id } : {})
      };
      await saveDailyStatus(submitData);
      await fetchHistory();
      setIsModalOpen(false);
    } catch (e) {
      console.error(e);
      errorLog("今日の一言保存 (履歴画面)", e);
      showDialog("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
      hideSpinner();
    }
  };

  const handleSavePartnerComment = async (statusId: string, comment: string) => {
    if (!statusId) return;
    try {
      const submitData = {
        id: statusId,
        partnerComment: comment,
      };
      await saveDailyStatus(submitData);
      
      setHistoryData(prev => {
        const updated = { ...prev };
        for (const dateStr in updated) {
          updated[dateStr] = updated[dateStr].map(status => {
            if (status.id === statusId) {
              return { ...status, partnerComment: comment };
            }
            return status;
          });
        }
        return updated;
      });
    } catch (e) {
      console.error("Failed to save partner comment in history", e);
      errorLog("パートナーコメント保存 (履歴画面)", e);
      showDialog("保存に失敗しました");
    }
  };

  const handleStatusUpdate = (updated: DailyStatus) => {
    setHistoryData(prev => {
      const next = { ...prev };
      if (next[updated.date]) {
        next[updated.date] = next[updated.date].map(s => s.id === updated.id ? updated : s);
      }
      return next;
    });
  };

  const dates = Object.keys(historyData).sort((a, b) => b.localeCompare(a)); // 降順

  // 年ごとにグループ化
  const groupedByYear: Record<string, string[]> = {};
  dates.forEach(dateStr => {
    const year = dateStr.split("-")[0];
    if (!isNaN(Number(year))) {
      if (!groupedByYear[year]) {
        groupedByYear[year] = [];
      }
      groupedByYear[year].push(dateStr);
    }
  });
  const years = Object.keys(groupedByYear).sort((a, b) => b.localeCompare(a)); // 降順

  return (
    <AuthGuard>
      <div className={`page-container ${styles.historyContainer}`}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <i className="fa-solid fa-clock-rotate-left"></i> 過去の私たち
          </h1>
        </div>

        {loading ? (
          <div className={styles.emptyState}>読み込み中...</div>
        ) : dates.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fa-regular fa-folder-open"></i>
            <p>まだ記録がありません</p>
          </div>
        ) : (
          <div className={styles.historyList}>
            {years.map(year => (
              <div key={year} className={styles.yearGroup}>
                <h2 className={styles.yearHeader}>{year}年</h2>
                <div className={styles.yearContent}>
                  {groupedByYear[year].map(dateStr => {
                    const statuses = historyData[dateStr];
                    const myStatus = statuses.find(s => s.uid === user?.uid) || null;
                    const partnerStatus = statuses.find(s => s.uid !== user?.uid) || null;

                    return (
                      <div key={dateStr} className={styles.dateBlock}>
                        <div className={styles.dateHeader}>{formatDateStr(dateStr)}</div>
                        <div className={styles.cardsRow}>
                          <DailyStatusCard
                            user={userData as FirestoreUser}
                            status={myStatus}
                            isMe={true}
                            currentUser={userData as FirestoreUser}
                            partnerUser={partnerData}
                            titlePrefix="" 
                            onEdit={() => {
                              setEditingStatus(myStatus);
                              setIsModalOpen(true);
                            }}
                            onStatusUpdate={handleStatusUpdate}
                          />
                          <DailyStatusCard
                            user={partnerData}
                            status={partnerStatus}
                            isMe={false}
                            currentUser={userData as FirestoreUser}
                            partnerUser={partnerData}
                            titlePrefix="" 
                            onSavePartnerComment={
                              partnerStatus
                                ? (comment) => handleSavePartnerComment(partnerStatus.id, comment)
                                : undefined
                            }
                            onStatusUpdate={handleStatusUpdate}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        <BackToHome />

        <DailyStatusModal
          isOpen={isModalOpen}
          status={editingStatus}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveDailyStatus}
          isSubmitting={isSubmitting}
        />
      </div>
    </AuthGuard>
  );
}
