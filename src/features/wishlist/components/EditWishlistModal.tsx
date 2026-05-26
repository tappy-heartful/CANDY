"use client";

import { useEffect, useState } from "react";
import { Wishlist, Group } from "@/src/lib/firestore/types";
import styles from "../views/Wishlist.module.css";

interface EditWishlistModalProps {
  wishlist: Wishlist;
  groups: Group[];
  onClose: () => void;
  onSave: (updatedFields: Partial<Wishlist>) => Promise<void>;
}

export default function EditWishlistModal({
  wishlist,
  groups,
  onClose,
  onSave,
}: EditWishlistModalProps) {
  const [title, setTitle] = useState(wishlist.title);
  const [groupId, setGroupId] = useState(wishlist.groupId || "");
  const [urgency, setUrgency] = useState(wishlist.urgency ?? 50);
  const [isAchieved, setIsAchieved] = useState(wishlist.isAchieved);

  // Sync state if the wishlist item changes
  useEffect(() => {
    setTitle(wishlist.title);
    setGroupId(wishlist.groupId || "");
    setUrgency(wishlist.urgency ?? 50);
    setIsAchieved(wishlist.isAchieved);
  }, [wishlist]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      groupId,
      urgency,
      isAchieved,
    });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.editModal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="閉じる">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <i className="fa-solid fa-pen-to-square"></i> 願いごとの編集
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div>
            <label className={styles.fieldLabel} htmlFor="edit-title">
              願いごと
            </label>
            <input
              type="text"
              id="edit-title"
              className={styles.wishInput}
              placeholder="例: 北海道旅行に行きたい"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="edit-group">
              グループ
            </label>
            <select
              id="edit-group"
              className={styles.groupSelect}
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
            >
              <option value="">グループを選択</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className={styles.urgencyLabel}>早くやりたい度: {urgency}</div>
            <input
              type="range"
              min="1"
              max="100"
              className={styles.urgencySlider}
              value={urgency}
              onChange={(e) => setUrgency(Number(e.target.value))}
            />
          </div>

          <div className={styles.achievedRow}>
            <input
              type="checkbox"
              id="edit-achieved"
              className={styles.achievedCheckbox}
              checked={isAchieved}
              onChange={(e) => setIsAchieved(e.target.checked)}
            />
            <label htmlFor="edit-achieved" className={styles.achievedLabel}>
              達成した！
            </label>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              キャンセル
            </button>
            <button type="submit" className={styles.btnSave}>
              保存する
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
