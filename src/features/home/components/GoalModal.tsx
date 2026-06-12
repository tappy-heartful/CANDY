"use client";

import { useState, useEffect } from "react";
import styles from "./GoalModal.module.css";

interface GoalModalProps {
  isOpen: boolean;
  nickname: string;
  currentGoal: string;
  onClose: () => void;
  onSave: (goal: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function GoalModal({
  isOpen,
  nickname,
  currentGoal,
  onClose,
  onSave,
  isSubmitting,
}: GoalModalProps) {
  const [goalText, setGoalText] = useState("");

  useEffect(() => {
    if (isOpen) {
      setGoalText(currentGoal || "");
    }
  }, [isOpen, currentGoal]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(goalText.trim());
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalTitle}>
          <i className="fa-solid fa-bullseye" style={{ color: "#F7A8C4", marginRight: "8px" }}></i>
          {nickname}の目標を設定
        </div>

        <div className={styles.formGroup}>
          <label className={styles.formLabel}>目標</label>
          <textarea
            className={styles.goalInput}
            value={goalText}
            onChange={(e) => setGoalText(e.target.value.slice(0, 100))}
            placeholder="今週・今月の目標や、二人の約束ごとなど"
            maxLength={100}
            autoFocus
          ></textarea>
          <div className={styles.charCount}>
            {goalText.length} / 100 文字
          </div>
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
