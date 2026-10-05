"use client";

import React, { useState, useEffect } from "react";
import { ReplenishmentCategory, ReplenishmentItem } from "@/src/lib/firestore/types";
import {
  getTodayDateStr,
  addReplenishmentItem,
  updateReplenishmentItem,
} from "../api/replenishment-client-service";
import { showDialog } from "@/src/lib/functions";
import styles from "./ReplenishmentModal.module.css";

interface ReplenishmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ReplenishmentCategory[];
  currentUid: string;
  initialItem?: ReplenishmentItem | null;
  onSaved: () => void;
  onOpenCategoryManager: () => void;
}

export default function ReplenishmentModal({
  isOpen,
  onClose,
  categories,
  currentUid,
  initialItem,
  onSaved,
  onOpenCategoryManager,
}: ReplenishmentModalProps) {
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [lastPurchasedDate, setLastPurchasedDate] = useState(getTodayDateStr());
  const [cycleDays, setCycleDays] = useState(30);
  const [reminderDaysBefore, setReminderDaysBefore] = useState(3);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [note, setNote] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialItem) {
      setName(initialItem.name);
      setCategoryId(initialItem.categoryId);
      setLastPurchasedDate(initialItem.lastPurchasedDate || getTodayDateStr());
      setCycleDays(initialItem.cycleDays || 30);
      setReminderDaysBefore(initialItem.reminderDaysBefore !== undefined ? initialItem.reminderDaysBefore : 3);
      setNotifyEnabled(initialItem.notifyEnabled !== false);
      setNote(initialItem.note || "");
    } else {
      setName("");
      setCategoryId(categories.length > 0 ? categories[0].id : "");
      setLastPurchasedDate(getTodayDateStr());
      setCycleDays(30);
      setReminderDaysBefore(3);
      setNotifyEnabled(true);
      setNote("");
    }
  }, [initialItem, categories, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showDialog("品名を入力してください。");
      return;
    }
    if (!categoryId) {
      showDialog("ジャンルを選択してください。");
      return;
    }

    const selectedCategory = categories.find((c) => c.id === categoryId);
    const categoryName = selectedCategory ? selectedCategory.name : "";

    setIsSubmitting(true);
    try {
      if (initialItem) {
        await updateReplenishmentItem(initialItem.id, {
          name: name.trim(),
          categoryId,
          categoryName,
          lastPurchasedDate,
          cycleDays: Number(cycleDays) || 30,
          reminderDaysBefore: Number(reminderDaysBefore) || 3,
          notifyEnabled,
          note: note.trim(),
        });
      } else {
        await addReplenishmentItem({
          name: name.trim(),
          categoryId,
          categoryName,
          lastPurchasedDate,
          cycleDays: Number(cycleDays) || 30,
          reminderDaysBefore: Number(reminderDaysBefore) || 3,
          notifyEnabled,
          note: note.trim(),
          uid: currentUid,
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      console.error("Failed to save replenishment item:", err);
      showDialog("アイテムの保存に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            <i className="fa-solid fa-cart-shopping" style={{ color: "#10b981" }}></i>
            <span>{initialItem ? "買い足しアイテムの編集" : "新しい買い足しアイテム"}</span>
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {/* 品名 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>品名</span>
              <span className={styles.requiredBadge}>必須</span>
            </label>
            <input
              type="text"
              className={styles.input}
              placeholder="例: トイレットペーパー、洗濯洗剤"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* ジャンル */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>ジャンル（カテゴリ）</span>
              <span className={styles.requiredBadge}>必須</span>
            </label>
            <div className={styles.selectRow}>
              <select
                className={styles.select}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                required
              >
                {categories.length === 0 && <option value="">ジャンルがありません</option>}
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={styles.manageCategoryBtn}
                onClick={onOpenCategoryManager}
                title="ジャンルを追加・編集"
              >
                <i className="fa-solid fa-gear"></i> 管理
              </button>
            </div>
          </div>

          {/* 前回購入日 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>前回購入日</span>
              <span className={styles.requiredBadge}>必須</span>
            </label>
            <input
              type="date"
              className={styles.input}
              value={lastPurchasedDate}
              onChange={(e) => setLastPurchasedDate(e.target.value)}
              required
            />
          </div>

          {/* 使い切り目安日数 */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>大体何日で使い切る？（消費目安）</span>
              <span className={styles.requiredBadge}>必須</span>
            </label>
            <div className={styles.unitInputRow}>
              <input
                type="number"
                min="1"
                max="365"
                className={styles.input}
                value={cycleDays}
                onChange={(e) => setCycleDays(Number(e.target.value))}
                required
                style={{ flex: 1 }}
              />
              <span className={styles.unitText}>日間</span>
            </div>
            <div className={styles.chipsRow}>
              {[
                { label: "1週間 (7日)", days: 7 },
                { label: "2週間 (14日)", days: 14 },
                { label: "1ヶ月 (30日)", days: 30 },
                { label: "2ヶ月 (60日)", days: 60 },
                { label: "3ヶ月 (90日)", days: 90 },
              ].map((chip) => (
                <button
                  type="button"
                  key={chip.days}
                  className={`${styles.chip} ${cycleDays === chip.days ? styles.chipActive : ""}`}
                  onClick={() => setCycleDays(chip.days)}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          {/* 何日前から通知するか */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>何日前から通知する？</span>
            </label>
            <div className={styles.unitInputRow}>
              <input
                type="number"
                min="0"
                max="30"
                className={styles.input}
                value={reminderDaysBefore}
                onChange={(e) => setReminderDaysBefore(Number(e.target.value))}
                style={{ flex: 1 }}
              />
              <span className={styles.unitText}>日前から（デフォルト3日）</span>
            </div>
          </div>

          {/* LINE定期通知設定 */}
          <div className={styles.switchContainer}>
            <div className={styles.switchLabelBlock}>
              <span className={styles.switchMainLabel}>朝のLINE通知でお知らせ</span>
              <span className={styles.switchSubLabel}>
                買い足し時期を迎えたら、毎朝の定期通知に含めます
              </span>
            </div>
            <label className={styles.switch}>
              <input
                type="checkbox"
                checked={notifyEnabled}
                onChange={(e) => setNotifyEnabled(e.target.checked)}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          {/* メモ */}
          <div className={styles.formGroup}>
            <label className={styles.label}>
              <span>メモ・ストック場所</span>
            </label>
            <textarea
              className={styles.textarea}
              placeholder="例: 洗面台下の奥、〇〇ドラッグストアが一番安い など"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className={styles.footer}>
            <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              <i className="fa-solid fa-check"></i>
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
