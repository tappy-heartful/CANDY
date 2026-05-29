"use client";

import { useEffect, useState } from "react";
import { Wishlist, Group } from "@/src/lib/firestore/types";
import styles from "../views/Wishlist.module.css";

interface WishlistModalProps {
  wishlist: Wishlist | null;
  groups: Group[];
  onClose: () => void;
  onSave: (data: {
    title: string;
    groupId: string;
    type: "personal" | "couple";
    urgency: number;
    isAchieved: boolean;
  }) => Promise<void>;
  isSubmitting?: boolean;
  onAddGroup?: () => void;
}

export default function WishlistModal({
  wishlist,
  groups,
  onClose,
  onSave,
  isSubmitting,
  onAddGroup,
}: WishlistModalProps) {
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const [type, setType] = useState<"personal" | "couple">("personal");
  const [urgency, setUrgency] = useState(50);
  const [isAchieved, setIsAchieved] = useState(false);

  useEffect(() => {
    if (wishlist) {
      setTitle(wishlist.title);
      setGroupId(wishlist.groupId || "");
      setType(wishlist.type);
      setUrgency(wishlist.urgency ?? 50);
      setIsAchieved(wishlist.isAchieved);
    } else {
      setTitle("");
      setGroupId(groups.length > 0 ? groups[0].id : "");
      setType("personal");
      setUrgency(50);
      setIsAchieved(false);
    }
  }, [wishlist, groups]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    await onSave({
      title: title.trim(),
      groupId,
      type,
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
            {wishlist ? (
              <><i className="fa-solid fa-pen-to-square"></i> 願いごとの編集</>
            ) : (
              <><i className="fa-solid fa-plus"></i> 新しい願いごと</>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGroup}>
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

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="edit-group">
              グループ
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                id="edit-group"
                className={styles.groupSelect}
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                style={{ flex: 1 }}
              >
                <option value="">グループを選択</option>
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
              {!wishlist && onAddGroup && (
                <button type="button" className={styles.addGroupBtn} onClick={onAddGroup}>
                  + 追加
                </button>
              )}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>共有設定</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="wishType"
                  value="personal"
                  checked={type === "personal"}
                  onChange={() => setType("personal")}
                />
                自分の願い
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="wishType"
                  value="couple"
                  checked={type === "couple"}
                  onChange={() => setType("couple")}
                />
                2人の願い
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
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

          {wishlist && (
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
          )}

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </button>
            <button type="submit" className={styles.btnSave} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
