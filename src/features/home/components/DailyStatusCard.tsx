"use client";

import { User as FirestoreUser, DailyStatus } from "@/src/lib/firestore/types";
import styles from "./DailyStatus.module.css";

interface DailyStatusCardProps {
  user: FirestoreUser | null;
  status: DailyStatus | null;
  isMe: boolean;
  onEdit?: () => void;
}

export default function DailyStatusCard({ user, status, isMe, onEdit }: DailyStatusCardProps) {
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
          <span className={styles.title}>今日の{user.nickname || "わたし"}</span>
        </div>
        {isMe && (
          <button className={styles.editBtn} onClick={onEdit}>
            <i className="fa-solid fa-pen"></i>
          </button>
        )}
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
