"use client";

import { useEffect } from "react";
import styles from "./GarbageImageViewerModal.module.css";

interface GarbageImageViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string;
  title?: string;
  note?: string;
  color?: string;
}

export default function GarbageImageViewerModal({
  isOpen,
  onClose,
  imageUrl,
  title = "ごみの出し方画像",
  note,
  color,
}: GarbageImageViewerModalProps) {
  // ESCキーで閉じる
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !imageUrl) return null;

  return (
    <div className={styles.viewerOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.viewerContent} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={styles.viewerHeader}>
          <div className={styles.viewerTitleGroup}>
            {color && <span className={styles.colorIndicator} style={{ backgroundColor: color }} />}
            <h3 className={styles.viewerTitle}>{title}</h3>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="閉じる"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* 画像エリア */}
        <div className={styles.imageScrollContainer}>
          <img
            src={imageUrl}
            alt={title}
            className={styles.viewerImage}
          />
        </div>

        {/* メモ・注意点（ある場合） */}
        {note && (
          <div className={styles.viewerFooter}>
            <div className={styles.noteContent}>
              <i className="fa-regular fa-lightbulb" style={{ color: "#f59e0b" }}></i>
              <span>{note}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
