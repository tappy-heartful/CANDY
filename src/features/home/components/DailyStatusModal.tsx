"use client";

import { useState, useEffect } from "react";
import { DailyStatus } from "@/src/lib/firestore/types";
import styles from "./DailyStatus.module.css";

interface DailyStatusModalProps {
  isOpen: boolean;
  status: DailyStatus | null;
  onClose: () => void;
  onSave: (data: Partial<DailyStatus>) => Promise<void>;
  isSubmitting: boolean;
}

export default function DailyStatusModal({ isOpen, status, onClose, onSave, isSubmitting }: DailyStatusModalProps) {
  const [mood, setMood] = useState(3);
  const [health, setHealth] = useState(3);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (status) {
        setMood(status.mood);
        setHealth(status.health);
        setComment(status.comment || "");
      } else {
        setMood(3);
        setHealth(3);
        setComment("");
      }
    }
  }, [isOpen, status]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      mood,
      health,
      comment
    });
  };

  const renderStars = (value: number, setValue: (val: number) => void, type: "mood" | "health") => {
    const stars = [];
    const activeClass = type === "mood" ? styles.starActive : styles.starActiveHealth;
    const iconClass = type === "mood" ? "fa-heart" : "fa-star";
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <button
          key={i}
          type="button"
          className={`${styles.ratingBtn} ${i <= value ? activeClass : ""}`}
          onClick={() => setValue(i)}
        >
          <i className={`fa-solid ${iconClass}`}></i>
        </button>
      );
    }
    return <div className={styles.ratingSelect}>{stars}</div>;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
        <div className={styles.modalTitle}>今日のわたし</div>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>気分</label>
          {renderStars(mood, setMood, "mood")}
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>体調</label>
          {renderStars(health, setHealth, "health")}
        </div>
        
        <div className={styles.formGroup}>
          <label className={styles.formLabel}>ひとこと</label>
          <textarea
            className={styles.commentInput}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="今日はどんな日だった？"
          ></textarea>
        </div>

        <div className={styles.modalActions}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </button>
          <button className={styles.btnSave} onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
