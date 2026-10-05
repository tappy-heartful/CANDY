"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import BackToHome from "@/src/components/Common/BackToHome";
import { ReplenishmentCategory, ReplenishmentItem } from "@/src/lib/firestore/types";
import {
  getReplenishmentCategories,
  initDefaultCategoriesIfEmpty,
  getReplenishmentItems,
  deleteReplenishmentItem,
  calculateItemStatus,
} from "../api/replenishment-client-service";
import ReplenishmentCard from "../components/ReplenishmentCard";
import ReplenishmentModal from "../components/ReplenishmentModal";
import CategoryManageModal from "../components/CategoryManageModal";
import { showDialog } from "@/src/lib/functions";
import styles from "./ReplenishmentList.module.css";

export default function ReplenishmentListClient() {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [categories, setCategories] = useState<ReplenishmentCategory[]>([]);
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // フィルター
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<string>("all");
  const [onlyAlerts, setOnlyAlerts] = useState<boolean>(false);

  // モーダル状態
  const [isItemModalOpen, setIsItemModalOpen] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<ReplenishmentItem | null>(null);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState<boolean>(false);

  // パンくずリスト
  useEffect(() => {
    setBreadcrumbs([{ title: "買い足しリマインド" }]);
  }, [setBreadcrumbs]);

  // データ取得
  const loadData = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      // カテゴリが未登録ならデフォルトを自動作成
      let catList = await getReplenishmentCategories();
      if (catList.length === 0) {
        catList = await initDefaultCategoriesIfEmpty(user.uid);
      }
      setCategories(catList);

      const itemList = await getReplenishmentItems();
      setItems(itemList);
    } catch (err) {
      console.error("Failed to load replenishment data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // アイテム削除
  const handleDeleteItem = async (item: ReplenishmentItem) => {
    if (!confirm(`「${item.name}」を削除してもよろしいですか？`)) {
      return;
    }
    try {
      await deleteReplenishmentItem(item.id);
      loadData();
    } catch (err) {
      console.error("Failed to delete item:", err);
      showDialog("アイテムの削除に失敗しました。");
    }
  };

  // サマリー計算（全登録数・買い足し時期数）
  const alertCount = useMemo(() => {
    return items.filter((item) => {
      const status = calculateItemStatus(item);
      return status.isDueSoon || status.isOverdue;
    }).length;
  }, [items]);

  // フィルタリング
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // ジャンル
      if (selectedCategoryTab !== "all" && item.categoryId !== selectedCategoryTab) {
        return false;
      }
      // 買い足し時期のみ
      if (onlyAlerts) {
        const status = calculateItemStatus(item);
        if (!status.isDueSoon && !status.isOverdue) {
          return false;
        }
      }
      return true;
    });
  }, [items, selectedCategoryTab, onlyAlerts]);

  return (
    <div className={styles.pageWrapper}>
      {/* ヘッダーエリア */}
      <div className={styles.headerRow}>
        <h1 className={styles.pageTitle}>
          <i className="fa-solid fa-cart-shopping"></i>
          <span>買い足しリマインド</span>
        </h1>
        <div className={styles.headerActions}>
          <button
            className={styles.addBtn}
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
          >
            <i className="fa-solid fa-plus"></i> アイテムを追加
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.summaryIconAll}`}>
            <i className="fa-solid fa-boxes-stacked"></i>
          </div>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>登録アイテム</span>
            <div className={styles.summaryValue}>
              {items.length}
              <span className={styles.summaryUnit}>品目</span>
            </div>
          </div>
        </div>

        <div className={styles.summaryCard}>
          <div className={`${styles.summaryIcon} ${styles.summaryIconAlert}`}>
            <i className="fa-solid fa-triangle-exclamation"></i>
          </div>
          <div className={styles.summaryContent}>
            <span className={styles.summaryLabel}>そろそろ買い足し時期</span>
            <div className={styles.summaryValue} style={{ color: alertCount > 0 ? "#d97706" : "#059669" }}>
              {alertCount}
              <span className={styles.summaryUnit}>品目</span>
            </div>
          </div>
        </div>
      </div>

      {/* 絞り込みフィルターカード */}
      <div className={styles.filterCard}>
        {/* ジャンルタブ */}
        <div className={styles.categoryScroll}>
          <button
            className={`${styles.categoryTab} ${
              selectedCategoryTab === "all" ? styles.categoryTabActive : ""
            }`}
            onClick={() => setSelectedCategoryTab("all")}
          >
            すべて ({items.length})
          </button>
          {categories.map((cat) => {
            const count = items.filter((i) => i.categoryId === cat.id).length;
            return (
              <button
                key={cat.id}
                className={`${styles.categoryTab} ${
                  selectedCategoryTab === cat.id ? styles.categoryTabActive : ""
                }`}
                onClick={() => setSelectedCategoryTab(cat.id)}
              >
                {cat.name} ({count})
              </button>
            );
          })}
          <button
            className={styles.manageCategoryTab}
            onClick={() => setIsCategoryModalOpen(true)}
            title="ジャンルの追加・編集・削除"
          >
            <i className="fa-solid fa-gear"></i> ジャンル管理
          </button>
        </div>

        {/* サブフィルター（買い足し時期のみ / 件数表示） */}
        <div className={styles.subFilterRow}>
          <label className={styles.onlyAlertLabel}>
            <input
              type="checkbox"
              className={styles.onlyAlertCheckbox}
              checked={onlyAlerts}
              onChange={(e) => setOnlyAlerts(e.target.checked)}
            />
            <span>買い足し時期のアイテムのみ表示</span>
          </label>

          <span className={styles.itemCountText}>
            表示中: <strong>{filteredItems.length}</strong> 件
          </span>
        </div>
      </div>

      {/* アイテム一覧 */}
      {isLoading ? (
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinner}></div>
          <p>アイテムを読み込み中...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className={styles.itemsGrid}>
          {filteredItems.map((item) => (
            <ReplenishmentCard
              key={item.id}
              item={item}
              onEdit={() => {
                setEditingItem(item);
                setIsItemModalOpen(true);
              }}
              onDelete={() => handleDeleteItem(item)}
              onUpdated={loadData}
            />
          ))}
        </div>
      ) : (
        <div className={styles.emptyCard}>
          <div className={styles.emptyIcon}>
            <i className="fa-solid fa-cart-shopping"></i>
          </div>
          <h3 className={styles.emptyTitle}>
            {items.length === 0
              ? "買い足しアイテムを登録してみましょう！"
              : "条件に一致するアイテムはありません"}
          </h3>
          <p className={styles.emptyDesc}>
            {items.length === 0
              ? "日用品や調味料、消耗品などを登録しておくと、前回の購入日や使い切り目安から買い足し時期を自動計算してお知らせします🍀"
              : "フィルター条件を解除して再度ご確認ください。"}
          </p>
          {items.length === 0 && (
            <button
              className={styles.emptyAddBtn}
              onClick={() => {
                setEditingItem(null);
                setIsItemModalOpen(true);
              }}
            >
              <i className="fa-solid fa-plus"></i> 最初のアイテムを追加
            </button>
          )}
        </div>
      )}

      {/* アイテム追加・編集モーダル */}
      <ReplenishmentModal
        isOpen={isItemModalOpen}
        onClose={() => setIsItemModalOpen(false)}
        categories={categories}
        currentUid={user?.uid || ""}
        initialItem={editingItem}
        onSaved={loadData}
        onOpenCategoryManager={() => setIsCategoryModalOpen(true)}
      />

      {/* ジャンル管理モーダル */}
      <CategoryManageModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        categories={categories}
        currentUid={user?.uid || ""}
        onCategoriesChanged={loadData}
      />

      <BackToHome />
    </div>
  );
}
