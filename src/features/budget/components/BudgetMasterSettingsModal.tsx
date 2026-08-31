"use client";

import React, { useState, useEffect } from "react";
import { BudgetCategory, BudgetType } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import styles from "./BudgetMasterSettingsModal.module.css";

interface BudgetMasterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: BudgetCategory[];
  types: BudgetType[];
  onSave: (newCategories: BudgetCategory[], newTypes: BudgetType[]) => Promise<void>;
}

// 削除不可能な初期マスタID
const SYSTEM_CATEGORY_IDS = ["fixed", "variable", "income"];
const SYSTEM_TYPE_IDS = [
  "rent", "telecom", "tax", "loan", "food", "entertainment", 
  "daily", "medical", "salary", "other_expense", "other_income"
];

export default function BudgetMasterSettingsModal({
  isOpen,
  onClose,
  categories,
  types,
  onSave
}: BudgetMasterSettingsModalProps) {
  const [localCategories, setLocalCategories] = useState<BudgetCategory[]>([]);
  const [localTypes, setLocalTypes] = useState<BudgetType[]>([]);

  // 選択中のアクティブカテゴリ (種別追加用)
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");

  // 新規追加用入力値
  const [newCategoryName, setNewCategoryName] = useState<string>("");
  const [newTypeName, setNewTypeName] = useState<string>("");

  // 編集モードやタブの管理
  const [activeSettingsTab, setActiveSettingsTab] = useState<"type" | "category">("type");

  useEffect(() => {
    if (isOpen) {
      setLocalCategories([...categories]);
      setLocalTypes([...types]);
      if (categories.length > 0) {
        setSelectedCategoryId(categories[0].id);
      }
      setNewCategoryName("");
      setNewTypeName("");
    }
  }, [isOpen, categories, types]);

  if (!isOpen) return null;

  // 区分（カテゴリ）の追加
  const handleAddCategory = () => {
    const name = newCategoryName.trim();
    if (!name) {
      showDialog("区分の名前を入力してください。🌸");
      return;
    }

    // 重複チェック
    const isDuplicate = localCategories.some(c => c.name === name);
    if (isDuplicate) {
      showDialog("その区分はすでに登録されているようです。✨");
      return;
    }

    const newId = `custom_c_${Date.now()}`;
    const newCategory: BudgetCategory = {
      id: newId,
      name: name
    };

    setLocalCategories([...localCategories, newCategory]);
    setNewCategoryName("");
    // 追加した区分をそのまま選択状態にする
    setSelectedCategoryId(newId);
    showDialog(`新しい区分「${name}」を一時追加しました。下部の「保存する」ボタンを押すと確定します。🌱`);
  };

  // 種別（項目）の追加
  const handleAddType = () => {
    const name = newTypeName.trim();
    if (!selectedCategoryId) {
      showDialog("追加先の区分を選択してください。🌸");
      return;
    }
    if (!name) {
      showDialog("種別の名前を入力してください。🌸");
      return;
    }

    // 同一区分内での重複チェック
    const isDuplicate = localTypes.some(t => t.categoryId === selectedCategoryId && t.name === name);
    if (isDuplicate) {
      showDialog("選択した区分の中に、同じ名前の種別がすでに登録されているようです。✨");
      return;
    }

    const newId = `custom_t_${Date.now()}`;
    const newType: BudgetType = {
      id: newId,
      categoryId: selectedCategoryId,
      name: name
    };

    setLocalTypes([...localTypes, newType]);
    setNewTypeName("");
    showDialog(`新しい種別「${name}」を一時追加しました。下部の「保存する」ボタンを押すと確定します。🌱`);
  };

  // 区分の削除
  const handleDeleteCategory = (categoryId: string, categoryName: string) => {
    if (SYSTEM_CATEGORY_IDS.includes(categoryId)) {
      showDialog("こちらの初期区分は、家計簿の基本構成に必要なため整理（削除）できません。🌸");
      return;
    }

    // 紐づく種別があるかチェック
    const hasLinkedTypes = localTypes.some(t => t.categoryId === categoryId);
    if (hasLinkedTypes) {
      showDialog("この区分の中に登録されている種別があります。先に種別を整理（削除）してから区分を整理してください。✨");
      return;
    }

    // 削除確認
    if (window.confirm(`区分「${categoryName}」を整理（削除）してもよろしいですか？\n※保存ボタンを押すまで確定しません。`)) {
      const updated = localCategories.filter(c => c.id !== categoryId);
      setLocalCategories(updated);
      if (selectedCategoryId === categoryId && updated.length > 0) {
        setSelectedCategoryId(updated[0].id);
      }
    }
  };

  // 種別の削除
  const handleDeleteType = (typeId: string, typeName: string) => {
    if (SYSTEM_TYPE_IDS.includes(typeId)) {
      showDialog("こちらの初期種別は、家計簿の基本項目のため整理（削除）できません。🌸");
      return;
    }

    // 削除確認
    if (window.confirm(`種別「${typeName}」を整理（削除）してもよろしいですか？\n※保存ボタンを押すまで確定しません。`)) {
      setLocalTypes(localTypes.filter(t => t.id !== typeId));
    }
  };

  // マスタ保存の実行
  const handleSaveMaster = async () => {
    try {
      showSpinner();
      await onSave(localCategories, localTypes);
      hideSpinner();
      showDialog("家計簿の区分・種別設定を更新しました！💖");
      onClose();
    } catch (e) {
      console.error(e);
      hideSpinner();
      showDialog("設定の保存中に問題が発生したようです。もう一度お試しください。");
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.settingsModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <i className="fa-solid fa-sliders"></i> 区分・種別の設定
          </h2>
          <button className={styles.modalClose} onClick={onClose}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.leadText}>
            家計簿で入力する「区分（カテゴリ）」や「種別（項目名）」を使いやすいようにカスタマイズできます。🌱
          </p>

          {/* タブ切り替え */}
          <div className={styles.subTabContainer}>
            <button
              className={`${styles.subTabBtn} ${activeSettingsTab === "type" ? styles.subTabActive : ""}`}
              onClick={() => setActiveSettingsTab("type")}
            >
              <i className="fa-solid fa-tags"></i> 種別の管理
            </button>
            <button
              className={`${styles.subTabBtn} ${activeSettingsTab === "category" ? styles.subTabActive : ""}`}
              onClick={() => setActiveSettingsTab("category")}
            >
              <i className="fa-solid fa-folder-open"></i> 区分の管理
            </button>
          </div>

          {/* 種別管理コンテンツ */}
          {activeSettingsTab === "type" && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>
                <i className="fa-solid fa-circle-plus"></i> 新しい種別（項目）の追加
              </div>
              <div className={styles.addForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>対象の区分</label>
                  <select
                    className={styles.appSelect}
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                  >
                    {localCategories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>種別名（項目名）</label>
                  <div className={styles.inputWithBtn}>
                    <input
                      type="text"
                      className={styles.appInput}
                      placeholder="例: ペット費、美容代、サブスク"
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddType();
                        }
                      }}
                    />
                    <button className={styles.addBtn} onClick={handleAddType}>
                      追加
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.sectionTitle}>
                <i className="fa-solid fa-list-ul"></i> 登録済みの種別一覧
              </div>
              <div className={styles.listContainer}>
                {localCategories.map(category => {
                  const categoryTypes = localTypes.filter(t => t.categoryId === category.id);
                  return (
                    <div key={category.id} className={styles.categoryBlock}>
                      <h4 className={styles.categoryBlockTitle}>{category.name}</h4>
                      {categoryTypes.length === 0 ? (
                        <p className={styles.emptyText}>この区分には種別が登録されていません。</p>
                      ) : (
                        <div className={styles.badgeGrid}>
                          {categoryTypes.map(type => {
                            const isSystem = SYSTEM_TYPE_IDS.includes(type.id);
                            return (
                              <div key={type.id} className={`${styles.masterBadge} ${isSystem ? styles.systemBadge : styles.customBadge}`}>
                                <span>{type.name}</span>
                                {!isSystem && (
                                  <button
                                    className={styles.deleteBadgeBtn}
                                    onClick={() => handleDeleteType(type.id, type.name)}
                                    title="整理（削除）する"
                                  >
                                    <i className="fa-solid fa-xmark"></i>
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 区分管理コンテンツ */}
          {activeSettingsTab === "category" && (
            <div className={styles.tabContent}>
              <div className={styles.sectionTitle}>
                <i className="fa-solid fa-circle-plus"></i> 新しい区分（カテゴリ）の追加
              </div>
              <div className={styles.addForm}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>区分名（大分類）</label>
                  <div className={styles.inputWithBtn}>
                    <input
                      type="text"
                      className={styles.appInput}
                      placeholder="例: 特別支出、貯蓄"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                    />
                    <button className={styles.addBtn} onClick={handleAddCategory}>
                      追加
                    </button>
                  </div>
                </div>
              </div>

              <div className={styles.sectionTitle}>
                <i className="fa-solid fa-list-ul"></i> 登録済みの区分一覧
              </div>
              <div className={styles.categoryList}>
                {localCategories.map(category => {
                  const isSystem = SYSTEM_CATEGORY_IDS.includes(category.id);
                  return (
                    <div key={category.id} className={styles.categoryListItem}>
                      <span className={styles.categoryNameDisplay}>
                        <i className={`fa-solid ${isSystem ? "fa-folder" : "fa-folder-plus"} ${styles.folderIcon}`}></i>
                        {category.name}
                        {isSystem && <span className={styles.systemTag}>初期区分</span>}
                      </span>
                      {!isSystem && (
                        <button
                          className={styles.deleteListItemBtn}
                          onClick={() => handleDeleteCategory(category.id, category.name)}
                          title="整理（削除）する"
                        >
                          <i className="fa-solid fa-trash-can"></i> 整理する
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button className={styles.saveBtn} onClick={handleSaveMaster}>
            <i className="fa-solid fa-floppy-disk"></i> 設定を保存する
          </button>
          <button className={styles.cancelBtn} onClick={onClose}>
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
}
