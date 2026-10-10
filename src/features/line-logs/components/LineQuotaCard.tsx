"use client";

import React from "react";
import { MonthQuotaSummary, AccountQuotaInfo } from "../api/line-log-client-service";
import styles from "./LineQuotaCard.module.css";

interface LineQuotaCardProps {
  quotaSummary: MonthQuotaSummary;
  displayMonthLabel: string;
}

export default function LineQuotaCard({ quotaSummary, displayMonthLabel }: LineQuotaCardProps) {
  const { periodic, event } = quotaSummary;

  const renderCard = (info: AccountQuotaInfo, isPeriodic: boolean) => {
    const isSafe = info.statusLevel === "safe";
    const isWarning = info.statusLevel === "warning";

    const statusPillClass = isSafe
      ? styles.statusSafe
      : isWarning
      ? styles.statusWarning
      : styles.statusDanger;

    const numberColorClass = isSafe
      ? styles.numberSafe
      : isWarning
      ? styles.numberWarning
      : styles.numberDanger;

    const fillClass = isSafe
      ? styles.fillSafe
      : isWarning
      ? styles.fillWarning
      : styles.fillDanger;

    const statusText = isSafe
      ? "ゆったり配信中🍀"
      : isWarning
      ? "順調に配信中💡"
      : "たくさん配信中✨";

    return (
      <div className={styles.quotaCard} key={info.accountType}>
        <div className={styles.cardHeader}>
          <div className={styles.accountInfo}>
            <div
              className={`${styles.accountIcon} ${
                isPeriodic ? styles.periodicIcon : styles.eventIcon
              }`}
            >
              <i className={isPeriodic ? "fa-solid fa-sun" : "fa-solid fa-bell"}></i>
            </div>
            <div>
              <h3 className={styles.accountName}>{info.accountName}</h3>
              <p className={styles.accountDesc}>
                {isPeriodic ? "朝の定時通知・夜のおやすみ通知" : "予定の開始前リマインダー通知"}
              </p>
            </div>
          </div>
          <span className={`${styles.statusPill} ${statusPillClass}`}>
            {statusText}
          </span>
        </div>

        <div className={styles.remainingSection}>
          <span className={styles.remainingLabel}>今月の送信回数</span>
          <div className={styles.remainingValue}>
            <span className={`${styles.remainingNumber} ${numberColorClass}`}>
              {info.consumed}
            </span>
            <span className={styles.remainingUnit}>/ {info.limit} 通</span>
          </div>
        </div>

        <div className={styles.progressContainer}>
          <div className={styles.progressBarBg}>
            <div
              className={`${styles.progressBarFill} ${fillClass}`}
              style={{ width: `${info.usageRate}%` }}
            ></div>
          </div>
          <div className={styles.progressTextRow}>
            <span>
              残り枠: <strong>{info.remaining}</strong> 通
            </span>
            <span>月間上限: {info.limit} 通 ({info.usageRate}% 配信)</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.titleRow}>
        <div className={styles.sectionTitle}>
          <i className="fa-solid fa-chart-pie"></i>
          <span>LINE公式アカウント配信枠の状況</span>
        </div>
        <span className={styles.monthBadge}>{displayMonthLabel}の状況</span>
      </div>

      <div className={styles.cardGrid}>
        {renderCard(periodic, true)}
        {renderCard(event, false)}
      </div>

      <div className={styles.infoNote}>
        <p>
          <i className="fa-solid fa-circle-info" style={{ marginRight: "6px", color: "#0ea5e9" }}></i>
          LINE公式アカウントの無料メッセージ枠は1アカウントあたり<strong>月200通</strong>です。
          テキスト1通につき1カウント、写真が添付される場合は2カウント消費されます（毎月1日にリセット）。
        </p>
      </div>
    </div>
  );
}
