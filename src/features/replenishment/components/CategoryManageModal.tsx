"use client";

import React, { useState } from "react";
import { ReplenishmentCategory } from "@/src/lib/firestore/types";
import {
  addReplenishmentCategory,
  updateReplenishmentCategory,
  deleteReplenishmentCategory,
} from "../api/replenishment-client-service";
import { showDialog } from "@/src/lib/functions";
import styles from "./CategoryManageModal.module.css";

interface CategoryManageModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: ReplenishmentCategory[];
  currentUid: string;
  onCategoriesChanged: () => void;
}

export default function CategoryManageModal({
  isOpen,
  onClose,
  categories,
  currentUid,
  onCategoriesChanged,
}: CategoryManageModalProps) {
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setIsSubmitting(true);
    try {
      await addReplenishmentCategory(newCatName.trim(), currentUid, categories.length);
      setNewCatName("");
      onCategoriesChanged();
    } catch (err) {
      console.error("Failed to add category:", err);
      showDialog("ジャンルの追加に失敗しました。");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartEdit = (cat: ReplenishmentCategory) => {
    setEditingId(cat.id);
    setEditingName(cat.name);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingName.trim()) return;
    try {
      await updateReplenishmentCategory(id, editingName.trim());
      setEditingId(null);
      setEditingName("");
      onCategoriesChanged();
    } catch (err) {
      console.error("Failed to update category:", err);
      showDialog("ジャンルの更新に失敗しました。");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`ジャンル「${name}」を削除してもよろしいですか？\n※登録済みのアイテムはそのまま残ります。`)) {
      return;
    }
    try {
      await deleteReplenishmentCategory(id);
      onCategoriesChanged();
    } catch (err) {
      console.error("Failed to delete category:", err);
      showDialog("ジャンルの削除に失敗しました。");
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.headerTitle}>
            <i className="fa-solid fa-tags" style={{ color: "#10b981" }}></i>
            <span>ジャンル（カテゴリ）の管理</span>
          </h2>
          <button className={styles.closeButton} onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className={styles.body}>
          {/* 新規追加フォーム */}
          <form className={styles.addForm} onSubmit={handleAdd}>
            <input
              type="text"
              className={styles.input}
              placeholder="新しいジャンル名（例: 文房具）"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              disabled={isSubmitting}
            />
            <button
              type="submit"
              className={styles.addBtn}
              disabled={isSubmitting || !newCatName.trim()}
            >
              <i className="fa-solid fa-plus"></i> 追加
            </button>
          </form>

          {/* ジャンル一覧 */}
          <div className={styles.categoryList}>
            {categories.map((cat) => {
              const isEditing = editingId === cat.id;

              return (
                <div key={cat.id} className={styles.categoryItem}>
                  {isEditing ? (
                    <div className={styles.editRow}>
                      <input
                        type="text"
                        className={styles.editInput}
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        autoFocus
                      />
                      <button
                        className={styles.saveIconBtn}
                        onClick={() => handleSaveEdit(cat.id)}
                        title="保存"
                      >
                        <i className="fa-solid fa-check"></i>
                      </button>
                      <button
                        className={styles.cancelIconBtn}
                        onClick={() => setEditingId(null)}
                        title="キャンセル"
                      >
                        <i className="fa-solid fa-xmark"></i>
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className={styles.categoryName}>{cat.name}</span>
                      <div className={styles.itemActions}>
                        <button
                          className={styles.iconBtn}
                          onClick={() => handleStartEdit(cat)}
                          title="名前を変更"
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.deleteIconBtn}`}
                          onClick={() => handleDelete(cat.id, cat.name)}
                          title="削除"
                        >
                          <i className="fa-solid fa-trash-can"></i>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.closeFooterBtn} onClick={onClose}>
            完了
          </button>
        </div>
      </div>
    </div>
  );
}
