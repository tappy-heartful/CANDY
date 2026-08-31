"use client";

import React, { useState, useEffect, useRef } from "react";
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

// 削除不可能な初期マスタID (空にしてすべての項目を編集可能にする)
const SYSTEM_CATEGORY_IDS: string[] = [];
const SYSTEM_TYPE_IDS: string[] = [];

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

  // インライン編集状態
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState<string>("");
  const [editingTypeId, setEditingTypeId] = useState<string | null>(null);
  const [editingTypeName, setEditingTypeName] = useState<string>("");

  // ドラッグ＆ドロップ状態 (PC HTML5)
  const [draggedCategoryIndex, setDraggedCategoryIndex] = useState<number | null>(null);
  const [draggedTypeIndex, setDraggedTypeIndex] = useState<number | null>(null);
  const [draggedTypeCategoryId, setDraggedTypeCategoryId] = useState<string | null>(null);

  // タッチ操作状態 (スマホ / PWA)
  const [touchCategoryIndex, setTouchCategoryIndex] = useState<number | null>(null);
  const [touchTypeState, setTouchTypeState] = useState<{ index: number; categoryId: string } | null>(null);

  // 最新の state を touch イベント内で参照するための ref
  const categoriesRef = useRef<BudgetCategory[]>([]);
  const typesRef = useRef<BudgetType[]>([]);
  categoriesRef.current = localCategories;
  typesRef.current = localTypes;

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
    const hasLinkedTypes = localTypes.some(t => t.categoryId === categoryId);
    if (hasLinkedTypes) {
      showDialog("この区分の中に登録されている種別があります。先に種別を整理（削除）してから区分を整理してください。✨");
      return;
    }

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
    if (window.confirm(`種別「${typeName}」を整理（削除）してもよろしいですか？\n※保存ボタンを押すまで確定しません。`)) {
      setLocalTypes(localTypes.filter(t => t.id !== typeId));
    }
  };

  // ----------------------------------------------------
  // 並び替え処理 (共通ヘルパー)
  // ----------------------------------------------------
  const moveCategory = (fromIndex: number, toIndex: number) => {
    const list = [...categoriesRef.current];
    if (toIndex < 0 || toIndex >= list.length || fromIndex === toIndex) return;
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    setLocalCategories(list);
  };

  const moveType = (fromIndex: number, toIndex: number, categoryId: string) => {
    const currentTypes = [...typesRef.current];
    const targetTypes = currentTypes.filter(t => t.categoryId === categoryId);
    if (toIndex < 0 || toIndex >= targetTypes.length || fromIndex === toIndex) return;
    const otherTypes = currentTypes.filter(t => t.categoryId !== categoryId);

    const item = targetTypes.splice(fromIndex, 1)[0];
    targetTypes.splice(toIndex, 0, item);

    setLocalTypes([...otherTypes, ...targetTypes]);
  };

  // ----------------------------------------------------
  // PC用 HTML5 Drag and Drop
  // ----------------------------------------------------
  const handleCategoryDragStart = (index: number) => {
    setDraggedCategoryIndex(index);
  };

  const handleCategoryDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleCategoryDrop = (index: number) => {
    if (draggedCategoryIndex === null) return;
    moveCategory(draggedCategoryIndex, index);
    setDraggedCategoryIndex(null);
  };

  const handleTypeDragStart = (index: number, categoryId: string) => {
    setDraggedTypeIndex(index);
    setDraggedTypeCategoryId(categoryId);
  };

  const handleTypeDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleTypeDrop = (targetIndex: number, categoryId: string) => {
    if (draggedTypeIndex === null || draggedTypeCategoryId !== categoryId) return;
    moveType(draggedTypeIndex, targetIndex, categoryId);
    setDraggedTypeIndex(null);
    setDraggedTypeCategoryId(null);
  };

  // ----------------------------------------------------
  // スマホ / PWA タッチ操作 (Touch Drag & Drop)
  // ----------------------------------------------------
  const handleCategoryTouchStart = (index: number) => {
    setTouchCategoryIndex(index);
  };

  const handleCategoryTouchMove = (e: React.TouchEvent) => {
    if (touchCategoryIndex === null) return;
    const touch = e.touches[0];
    const targetElem = document.elementFromPoint(touch.clientX, touch.clientY)?.closest("[data-category-index]");
    if (targetElem) {
      const targetIdx = Number(targetElem.getAttribute("data-category-index"));
      if (!isNaN(targetIdx) && targetIdx !== touchCategoryIndex) {
        moveCategory(touchCategoryIndex, targetIdx);
        setTouchCategoryIndex(targetIdx);
      }
    }
  };

  const handleCategoryTouchEnd = () => {
    setTouchCategoryIndex(null);
  };

  const handleTypeTouchStart = (index: number, categoryId: string) => {
    setTouchTypeState({ index, categoryId });
  };

  const handleTypeTouchMove = (e: React.TouchEvent) => {
    if (!touchTypeState) return;
    const touch = e.touches[0];
    const targetElem = document.elementFromPoint(touch.clientX, touch.clientY)?.closest("[data-type-index]");
    if (targetElem) {
      const targetIdx = Number(targetElem.getAttribute("data-type-index"));
      const targetCatId = targetElem.getAttribute("data-category-id");
      if (!isNaN(targetIdx) && targetCatId === touchTypeState.categoryId && targetIdx !== touchTypeState.index) {
        moveType(touchTypeState.index, targetIdx, touchTypeState.categoryId);
        setTouchTypeState({ index: targetIdx, categoryId: touchTypeState.categoryId });
      }
    }
  };

  const handleTypeTouchEnd = () => {
    setTouchTypeState(null);
  };

  // ----------------------------------------------------
  // インライン編集
  // ----------------------------------------------------
  const startEditCategory = (id: string, name: string) => {
    setEditingCategoryId(id);
    setEditingCategoryName(name);
  };

  const saveEditCategory = (id: string) => {
    const name = editingCategoryName.trim();
    if (!name) return;
    setLocalCategories(localCategories.map(c => c.id === id ? { ...c, name } : c));
    setEditingCategoryId(null);
  };

  const startEditType = (id: string, name: string) => {
    setEditingTypeId(id);
    setEditingTypeName(name);
  };

  const saveEditType = (id: string) => {
    const name = editingTypeName.trim();
    if (!name) return;
    setLocalTypes(localTypes.map(t => t.id === id ? { ...t, name } : t));
    setEditingTypeId(null);
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
            <br />
            ※項目をクリックして名前を変更できます。ハンドル（⋮⋮）のドラッグまたは矢印ボタン（◀▶ / ▲▼）で順番を並び替えられます。
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
                          {categoryTypes.map((type, idx) => {
                            const isTouching = touchTypeState?.categoryId === category.id && touchTypeState.index === idx;
                            return (
                              <div
                                key={type.id}
                                data-type-index={idx}
                                data-category-id={category.id}
                                className={`${styles.masterBadge} ${styles.customBadge} ${isTouching ? styles.draggingActive : ""}`}
                                draggable
                                onDragStart={() => handleTypeDragStart(idx, category.id)}
                                onDragOver={handleTypeDragOver}
                                onDrop={() => handleTypeDrop(idx, category.id)}
                              >
                                {editingTypeId === type.id ? (
                                  <input
                                    type="text"
                                    className={styles.inlineInput}
                                    value={editingTypeName}
                                    onChange={(e) => setEditingTypeName(e.target.value)}
                                    onBlur={() => saveEditType(type.id)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.preventDefault();
                                        saveEditType(type.id);
                                      } else if (e.key === "Escape") {
                                        setEditingTypeId(null);
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <>
                                    <span
                                      className={styles.dragHandle}
                                      onTouchStart={() => handleTypeTouchStart(idx, category.id)}
                                      onTouchMove={handleTypeTouchMove}
                                      onTouchEnd={handleTypeTouchEnd}
                                      title="ドラッグして並び替え"
                                    >
                                      <i className="fa-solid fa-grip-vertical"></i>
                                    </span>

                                    <span onClick={() => startEditType(type.id, type.name)} style={{ cursor: "pointer" }}>
                                      {type.name} <i className="fa-solid fa-pen" style={{ fontSize: "10px", marginLeft: "2px", opacity: 0.5 }}></i>
                                    </span>

                                    {/* モバイルでも使いやすい矢印並び替えボタン */}
                                    <span className={styles.typeOrderBtns}>
                                      <button
                                        type="button"
                                        className={styles.orderBtn}
                                        disabled={idx === 0}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveType(idx, idx - 1, category.id);
                                        }}
                                        title="前へ移動"
                                      >
                                        <i className="fa-solid fa-chevron-left"></i>
                                      </button>
                                      <button
                                        type="button"
                                        className={styles.orderBtn}
                                        disabled={idx === categoryTypes.length - 1}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          moveType(idx, idx + 1, category.id);
                                        }}
                                        title="次へ移動"
                                      >
                                        <i className="fa-solid fa-chevron-right"></i>
                                      </button>
                                    </span>

                                    <button
                                      className={styles.deleteBadgeBtn}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteType(type.id, type.name);
                                      }}
                                      title="整理（削除）する"
                                    >
                                      <i className="fa-solid fa-xmark"></i>
                                    </button>
                                  </>
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
                {localCategories.map((category, idx) => {
                  const isTouching = touchCategoryIndex === idx;
                  return (
                    <div
                      key={category.id}
                      data-category-index={idx}
                      className={`${styles.categoryListItem} ${isTouching ? styles.draggingActive : ""}`}
                      draggable
                      onDragStart={() => handleCategoryDragStart(idx)}
                      onDragOver={handleCategoryDragOver}
                      onDrop={() => handleCategoryDrop(idx)}
                    >
                      {editingCategoryId === category.id ? (
                        <input
                          type="text"
                          className={styles.inlineCategoryInput}
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          onBlur={() => saveEditCategory(category.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              saveEditCategory(category.id);
                            } else if (e.key === "Escape") {
                              setEditingCategoryId(null);
                            }
                          }}
                          autoFocus
                        />
                      ) : (
                        <>
                          <span className={styles.categoryNameDisplay}>
                            <span
                              className={styles.dragHandle}
                              onTouchStart={() => handleCategoryTouchStart(idx)}
                              onTouchMove={handleCategoryTouchMove}
                              onTouchEnd={handleCategoryTouchEnd}
                              title="ドラッグして並び替え"
                            >
                              <i className="fa-solid fa-grip-vertical"></i>
                            </span>
                            <i className={`fa-solid fa-folder-plus ${styles.folderIcon}`}></i>
                            <span onClick={() => startEditCategory(category.id, category.name)} style={{ cursor: "pointer" }}>
                              {category.name} <i className="fa-solid fa-pen" style={{ fontSize: "11px", marginLeft: "4px", opacity: 0.5 }}></i>
                            </span>
                          </span>

                          <div className={styles.categoryRightActions}>
                            <div className={styles.categoryOrderBtns}>
                              <button
                                type="button"
                                className={styles.orderBtn}
                                disabled={idx === 0}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveCategory(idx, idx - 1);
                                }}
                                title="上へ移動"
                              >
                                <i className="fa-solid fa-chevron-up"></i>
                              </button>
                              <button
                                type="button"
                                className={styles.orderBtn}
                                disabled={idx === localCategories.length - 1}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveCategory(idx, idx + 1);
                                }}
                                title="下へ移動"
                              >
                                <i className="fa-solid fa-chevron-down"></i>
                              </button>
                            </div>

                            <button
                              className={styles.deleteListItemBtn}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteCategory(category.id, category.name);
                              }}
                              title="整理（削除）する"
                            >
                              <i className="fa-solid fa-trash-can"></i> 整理する
                            </button>
                          </div>
                        </>
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
