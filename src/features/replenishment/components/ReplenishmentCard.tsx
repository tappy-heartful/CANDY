"use client";

import React, { useState } from "react";
import { ReplenishmentItem } from "@/src/lib/firestore/types";
import {
  calculateItemStatus,
  markItemAsPurchasedToday,
} from "../api/replenishment-client-service";
import styles from "./ReplenishmentCard.module.css";

interface ReplenishmentCardProps {
  item: ReplenishmentItem;
  onEdit: () => void;
  onDelete: () => void;
  onUpdated: () => void;
}

export default function ReplenishmentCard({
  item,
  onEdit,
  onDelete,
  onUpdated,
}: ReplenishmentCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const status = calculateItemStatus(item);

  const handleMarkPurchased = async () => {
    setIsUpdating(true);
    try {
      await markItemAsPurchasedToday(item.id);
      onUpdated();
    } catch (err) {
      console.error("Failed to mark item as purchased:", err);
    } finally {
      setIsUpdating(false);
    }
  };

  const cardStatusClass =
    status.statusLevel === "danger"
      ? styles.cardDanger
      : status.statusLevel === "warning"
      ? styles.cardWarning
      : "";

  const textStatusClass =
    status.statusLevel === "danger"
      ? styles.textDanger
      : status.statusLevel === "warning"
      ? styles.textWarning
      : styles.textSafe;

  const fillClass =
    status.statusLevel === "danger"
      ? styles.fillDanger
      : status.statusLevel === "warning"
      ? styles.fillWarning
      : styles.fillSafe;

  return (
    <div className={`${styles.card} ${cardStatusClass}`}>
      {/* 上部：アイテム名とバッジ、アクション */}
      <div className={styles.topRow}>
        <div className={styles.titleArea}>
          <h3 className={styles.itemName}>{item.name}</h3>
          <div className={styles.badgeRow}>
            {item.categoryName && (
              <span className={styles.categoryBadge}>{item.categoryName}</span>
            )}
            {item.notifyEnabled !== false ? (
              <span className={styles.notifyBadge} title="朝のLINE通知でお知らせ">
                <i className="fa-solid fa-bell"></i> LINE通知ON
              </span>
            ) : (
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                <i className="fa-regular fa-bell-slash"></i> 通知OFF
              </span>
            )}
          </div>
        </div>

        <div className={styles.actionIcons}>
          <button className={styles.iconBtn} onClick={onEdit} title="編集">
            <i className="fa-solid fa-pen"></i>
          </button>
          <button
            className={`${styles.iconBtn} ${styles.deleteBtn}`}
            onClick={onDelete}
            title="削除"
          >
            <i className="fa-solid fa-trash-can"></i>
          </button>
        </div>
      </div>

      {/* メイン情報：経過日数 ＆ 残り日数 */}
      <div className={styles.statsRow}>
        <div className={styles.statItem}>
          <span className={styles.statLabel}>前回購入から</span>
          <span className={styles.statValuePassed}>
            <strong>{status.passedDays}</strong> 日経過
          </span>
        </div>
        <div className={styles.statItem} style={{ alignItems: "flex-end" }}>
          <span className={styles.statLabel}>目安サイクル: 約{item.cycleDays}日</span>
          <span className={`${styles.statValueRemaining} ${textStatusClass}`}>
            {status.statusText}
          </span>
        </div>
      </div>

      {/* プログレスバー */}
      <div className={styles.progressContainer}>
        <div className={styles.progressBarBg}>
          <div
            className={`${styles.progressBarFill} ${fillClass}`}
            style={{ width: `${status.progressPercent}%` }}
          ></div>
        </div>
        <div className={styles.cycleInfo}>
          <span>前回: {item.lastPurchasedDate}</span>
          <span>次回目安: {status.nextDateStr}</span>
        </div>
      </div>

      {/* メモ */}
      {item.note && <p className={styles.noteBlock}>{item.note}</p>}

      {/* 下部：「今日買った！」ボタン */}
      <div className={styles.cardFooter}>
        <span className={styles.lastPurchasedText}>
          {item.reminderDaysBefore ? `${item.reminderDaysBefore}日前から通知` : "3日前から通知"}
        </span>
        <button
          className={styles.buyNowBtn}
          onClick={handleMarkPurchased}
          disabled={isUpdating}
          title="前回購入日を本日の日付にリセット"
        >
          <i className={`fa-solid fa-cart-shopping ${isUpdating ? "fa-spin" : ""}`}></i>
          <span>今日買った！</span>
        </button>
      </div>
    </div>
  );
}
