"use client";

import { User as FirestoreUser, DailyStatus } from "@/src/lib/firestore/types";
import styles from "./DailyStatus.module.css";

interface DailyStatusCardProps {
  user: FirestoreUser | null;
  status: DailyStatus | null;
  isMe: boolean;
  onEdit?: () => void;
  onOpenHistory?: () => void;
  titlePrefix?: string;
}

export default function DailyStatusCard({ user, status, isMe, onEdit, onOpenHistory, titlePrefix = "今日の" }: DailyStatusCardProps) {
  if (!user) return null;

  const renderStars = (value: number, type: "mood" | "health") => {
    const stars = [];
    const activeClass = type === "mood" ? styles.starActive : styles.starActiveHealth;
    const iconClass = type === "mood" ? "fa-heart" : "fa-star";
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fa-solid ${iconClass} ${i <= value ? activeClass : ""}`}
        ></i>
      );
    }
    return <div className={styles.stars}>{stars}</div>;
  };

  return (
    <div className={`${styles.cardContainer} ${!isMe ? styles.partnerCard : ""}`}>
      <div className={styles.cardHeader}>
        <div className={styles.userInfo}>
          <img src={user.pictureUrl || "/icon.png"} alt={user.nickname} className={styles.userIcon} />
          <span className={styles.title}>{titlePrefix}{user.nickname || (isMe ? "わたし" : "パートナー")}</span>
        </div>
        <div className={styles.actions}>
          {onOpenHistory && (
            <button className={styles.historyBtn} onClick={onOpenHistory} title="過去の履歴を見る">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </button>
          )}
          {isMe && (
            <button className={styles.editBtn} onClick={onEdit}>
              <i className="fa-solid fa-pen"></i>
            </button>
          )}
        </div>
      </div>

      {status ? (
        <div className={styles.statusContent}>
          <div className={styles.statusRow}>
            <span className={styles.label}>気分</span>
            {renderStars(status.mood, "mood")}
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>体調</span>
            {renderStars(status.health, "health")}
          </div>
          {status.comment && (
            <div className={styles.commentBox}>
              {status.comment}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.emptyState}>
          {isMe ? "今日の状態を記録しよう！" : "まだ記録されていません"}
        </div>
      )}
    </div>
  );
}
