"use client";

import React, { useEffect } from "react";
import { LineNotificationLog } from "@/src/lib/firestore/types";
import styles from "./LineLogDetailModal.module.css";

interface LineLogDetailModalProps {
  log: LineNotificationLog | null;
  onClose: () => void;
}

// URLを検知してクリック可能なリンクに変換するヘルパー関数
const renderMessageTextWithLinks = (text: string) => {
  if (!text) return null;
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const lines = text.split("\n");

  return lines.map((line, lineIdx) => {
    const parts = line.split(urlRegex);
    return (
      <React.Fragment key={lineIdx}>
        {parts.map((part, partIdx) => {
          if (part.match(/^https?:\/\//)) {
            return (
              <a
                key={partIdx}
                href={part}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.bubbleUrlLink}
                onClick={(e) => e.stopPropagation()}
              >
                <span>{part}</span>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: "0.75em" }}></i>
              </a>
            );
          }
          return part;
        })}
        {lineIdx < lines.length - 1 && "\n"}
      </React.Fragment>
    );
  });
};

export default function LineLogDetailModal({ log, onClose }: LineLogDetailModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!log) return null;

  const isSuccess = log.status === "success";
  const details = log.details || {};

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            <i className="fa-solid fa-message" style={{ color: "#06c755" }}></i>
            <span>{log.notificationTitle} の詳細</span>
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* ボディ */}
        <div className={styles.body}>
          {/* メタ情報サマリー */}
          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信日時</span>
              <span className={styles.metaValue}>{log.sentAtFormatted || log.date}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信ステータス</span>
              <span className={styles.metaValue}>
                {isSuccess ? (
                  <span className={styles.badgeSuccess}>
                    <i className="fa-solid fa-circle-check"></i> 送信成功
                  </span>
                ) : (
                  <span className={styles.badgeError}>
                    <i className="fa-solid fa-circle-exclamation"></i> 送信エラー ({log.statusCode || "不明"})
                  </span>
                )}
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信元アカウント</span>
              <span className={styles.metaValue}>{log.accountName}</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>送信先</span>
              <span className={styles.metaValue}>
                {log.recipientName} ({log.recipientUid.substring(0, 6)}...)
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>消費吹き出し数</span>
              <span className={styles.metaValue}>
                <strong>{log.messageCount || 1}</strong> 通
              </span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>LINE User ID</span>
              <span className={styles.metaValue} style={{ fontSize: "0.75rem", color: "#64748b" }}>
                {log.recipientLineId ? `${log.recipientLineId.substring(0, 10)}...` : "未設定"}
              </span>
            </div>
          </div>

          {/* エラーメッセージ（あれば表示） */}
          {log.errorMessage && (
            <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", padding: "12px", borderRadius: "10px", color: "#991b1b", fontSize: "0.85rem" }}>
              <i className="fa-solid fa-triangle-exclamation" style={{ marginRight: "6px" }}></i>
              {log.errorMessage}
            </div>
          )}

          {/* LINEトーク画面風プレビュー */}
          <div className={styles.previewSection}>
            <div className={styles.previewLabel}>
              <i className="fa-brands fa-line" style={{ color: "#06c755", fontSize: "1.1rem" }}></i>
              <span>送信されたメッセージ（LINEトーク再現）</span>
            </div>
            <div className={styles.chatContainer}>
              {log.messages && log.messages.length > 0 ? (
                log.messages.map((msg, index) => {
                  if (msg.type === "image" && (msg.originalContentUrl || msg.previewImageUrl)) {
                    const imgUrl = msg.originalContentUrl || msg.previewImageUrl;
                    return (
                      <div key={index} className={styles.imageBubble}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={imgUrl} alt="LINE添付画像" />
                        <div className={styles.imageCaption}>
                          <i className="fa-regular fa-image" style={{ marginRight: "4px" }}></i>
                          添付画像
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={index} className={styles.messageBubble}>
                      {renderMessageTextWithLinks(msg.text || "") || "（テキストなし）"}
                    </div>
                  );
                })
              ) : (
                <div className={styles.messageBubble}>
                  {renderMessageTextWithLinks(log.summary || "") || "（メッセージデータなし）"}
                </div>
              )}
            </div>
          </div>

          {/* 送信にあたっての詳細情報（コンテキスト） */}
          {Object.keys(details).length > 0 && (
            <div className={styles.detailsSection}>
              <div className={styles.previewLabel}>
                <i className="fa-solid fa-circle-info" style={{ color: "#3b82f6" }}></i>
                <span>送信判定時の詳細情報</span>
              </div>
              <div className={styles.detailsContainer}>
                {details.areaLabel && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>地域情報</span>
                    <span className={styles.detailContent}>{details.areaLabel}</span>
                  </div>
                )}
                {details.weather && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>天気予報データ</span>
                    <span className={styles.detailContent}>
                      最高気温: {details.weather.tempMax}℃ / 最低気温: {details.weather.tempMin}℃
                      {details.weather.pop !== undefined ? ` / 降水確率: ${details.weather.pop}%` : ""}
                    </span>
                  </div>
                )}
                {details.todayEventsCount !== undefined && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>判定された今日の予定</span>
                    <span className={styles.detailContent}>
                      {details.todayEventsCount} 件
                      {details.todayEvents && details.todayEvents.length > 0 && (
                        <ul className={styles.subList}>
                          {details.todayEvents.map((e: any, i: number) => (
                            <li key={i}>{e.label}{e.title} ({e.isAllDay ? "終日" : e.startTime || "時間未定"})</li>
                          ))}
                        </ul>
                      )}
                    </span>
                  </div>
                )}
                {details.tomorrowEventsCount !== undefined && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>判定された明日の予定</span>
                    <span className={styles.detailContent}>
                      {details.tomorrowEventsCount} 件
                      {details.tomorrowEvents && details.tomorrowEvents.length > 0 && (
                        <ul className={styles.subList}>
                          {details.tomorrowEvents.map((e: any, i: number) => (
                            <li key={i}>{e.label}{e.title} ({e.isAllDay ? "終日" : e.startTime || "時間未定"})</li>
                          ))}
                        </ul>
                      )}
                    </span>
                  </div>
                )}
                {details.eventTitle && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>リマインド対象の予定</span>
                    <span className={styles.detailContent}>
                      {details.label}{details.eventTitle} ({details.eventStartTime}〜)
                      {details.reminderMinutes !== undefined && (
                        <span style={{ marginLeft: "6px", color: "#64748b" }}>
                          [{details.reminderMinutes === 0 ? "直前" : `${details.reminderMinutes}分前`}通知]
                        </span>
                      )}
                    </span>
                  </div>
                )}
                {details.tomorrowGarbageCount !== undefined && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>明日のごみ出し情報</span>
                    <span className={styles.detailContent}>
                      {details.tomorrowGarbageCount > 0 ? (
                        <ul className={styles.subList}>
                          {details.tomorrowGarbage.map((g: any, i: number) => (
                            <li key={i}>
                              {g.name} {g.note ? `(${g.note})` : ""} {g.hasImage ? "📸分別写真あり" : ""}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        "明日のごみ収集はありません"
                      )}
                    </span>
                  </div>
                )}
                {details.hasDailyPhoto && (
                  <div className={styles.detailRow}>
                    <span className={styles.detailTitle}>今日の一枚</span>
                    <span className={styles.detailContent}>
                      アルバム「{details.dailyPhotoAlbumName || "アルバム"}」の写真をお届け
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className={styles.footer}>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
