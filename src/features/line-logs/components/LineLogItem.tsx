"use client";

import React from "react";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import styles from "./LineLogItem.module.css";

interface LineLogItemProps {
  log: LineNotificationLog;
  onClick: () => void;
}

export default function LineLogItem({ log, onClick }: LineLogItemProps) {
  const isPeriodic = log.accountType === "periodic";
  const isSuccess = log.status === "success";
  const count = log.messageCount || (log.messages?.length || 1);
  const hasImage = log.messages?.some((m) => m.type === "image");

  return (
    <div className={styles.itemCard} onClick={onClick}>
      <div className={styles.topRow}>
        <div className={styles.badges}>
          <span
            className={`${styles.accountBadge} ${
              isPeriodic ? styles.accountPeriodic : styles.accountEvent
            }`}
          >
            {isPeriodic ? "定期通知アカウント" : "イベント通知アカウント"}
          </span>
          <span className={styles.typeBadge}>
            {log.notificationTitle || "LINE通知"}
          </span>
        </div>
        <span
          className={styles.timeText}
          title={log.sentAtFormatted || log.date}
        >
          <i className="fa-regular fa-clock"></i>
          {log.sentAtFormatted && log.sentAtFormatted.length >= 16
            ? log.sentAtFormatted.substring(11, 16)
            : log.sentAtFormatted ? log.sentAtFormatted.substring(5, 16) : log.date}
        </span>
      </div>

      <div className={styles.mainRow}>
        <div className={styles.contentBlock}>
          <h4 className={styles.titleText}>
            {isPeriodic ? (
              <i className="fa-solid fa-sun" style={{ color: "#f59e0b" }}></i>
            ) : (
              <i className="fa-solid fa-bell" style={{ color: "#8b5cf6" }}></i>
            )}
            <span>{log.notificationTitle}</span>
          </h4>
          <p className={styles.summaryText}>{log.summary || "詳細をタップして確認"}</p>
        </div>

        <div className={styles.rightBlock}>
          <span
            className={`${styles.quotaCostBadge} ${
              hasImage ? styles.quotaCostBadgeWithImage : ""
            }`}
          >
            {hasImage ? (
              <>
                <i className="fa-regular fa-images"></i> 2通消費 (画像含)
              </>
            ) : (
              <>
                <i className="fa-regular fa-comment"></i> {count}通消費
              </>
            )}
          </span>
        </div>
      </div>

      <div className={styles.bottomRow}>
        <span className={styles.recipientText}>
          <i className="fa-regular fa-user"></i>
          宛先: {log.recipientName}
        </span>
        <div>
          {!isSuccess ? (
            <span className={styles.errorTag}>
              <i className="fa-solid fa-triangle-exclamation"></i> 送信エラー
            </span>
          ) : (
            <span className={styles.detailLink}>
              詳細を見る <i className="fa-solid fa-chevron-right" style={{ fontSize: "0.7rem" }}></i>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
