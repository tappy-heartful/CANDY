"use client";

import React, { useEffect, useState } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { useRouter } from "next/navigation";
import { getPartnerData, updateProfile } from "@/src/features/user/api/user-client-service";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import styles from "./Settlement.module.css";
import EventModal from "../components/EventModal";
import ExpenseItemModal from "../components/ExpenseItemModal";
import {
  getSettlementEventById,
  updateSettlementEvent,
  toggleSettlementEventSettled,
  deleteSettlementEvent,
  getSettlementItems,
  addSettlementItem,
  updateSettlementItem,
  deleteSettlementItem,
  uploadReceipt,
  uploadSettlementProof,
  removeSettlementProof,
} from "../api/settlement-client-service";
import type {
  SettlementEvent,
  SettlementItem,
  User as FirestoreUser,
} from "@/src/lib/firestore/types";

interface SettlementDetailClientProps {
  eventId: string;
}

export default function SettlementDetailClient({ eventId }: SettlementDetailClientProps) {
  const { user, userData, refreshUserData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const [event, setEvent] = useState<SettlementEvent | null>(null);
  const [items, setItems] = useState<SettlementItem[]>([]);
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);
  const [loading, setLoading] = useState(true);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [isItemModalOpen, setIsItemModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SettlementItem | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const proofInputRef = React.useRef<HTMLInputElement | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState(false);

  const myNickname = userData?.nickname || userData?.displayName || "自分";
  const myPictureUrl = userData?.pictureUrl || "/icon.png";

  const partnerNickname = partnerData?.nickname || partnerData?.displayName || "パートナー";
  const partnerPictureUrl = partnerData?.pictureUrl || "/icon.png";
  const partnerUid = partnerData?.id || "";

  useEffect(() => {
    setBreadcrumbs([
      { title: "ワリカン", href: "/settlement" },
      { title: event?.name || "詳細" },
    ]);
  }, [setBreadcrumbs, event, eventId]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [evtData, itemsData, partner] = await Promise.all([
        getSettlementEventById(eventId),
        getSettlementItems(eventId),
        getPartnerData(user.uid),
      ]);

      if (!evtData) {
        await showDialog("イベントが見つかりませんでした", true);
        router.push("/settlement");
        return;
      }

      setEvent(evtData);
      setItems(itemsData);
      setPartnerData(partner);
    } catch (e) {
      console.error("Failed to load settlement detail:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, eventId]);

  // イベント編集
  const handleUpdateEvent = async (data: {
    name: string;
    prefectureCode?: string;
    prefectureName?: string;
    municipalityCode?: string;
    municipalityName?: string;
    dateMode?: "single" | "range";
    startDate?: string;
    endDate?: string;
  }) => {
    setIsSubmitting(true);
    try {
      await updateSettlementEvent(
        eventId,
        data.name,
        data.prefectureCode,
        data.prefectureName,
        data.municipalityCode,
        data.municipalityName,
        data.dateMode,
        data.startDate,
        data.endDate
      );
      await loadData();
      setIsEventModalOpen(false);
    } catch (e) {
      console.error("Failed to update event:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 送金証明画像 (PayPay等) のアップロード処理
  const handleProofFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !event) return;

    showSpinner();
    try {
      const uploaded = await uploadSettlementProof(
        eventId,
        file,
        activeResultTab,
        settlement.ratioForMe
      );
      setEvent((prev) =>
        prev
          ? {
            ...prev,
            isSettled: true,
            proofUrl: uploaded.proofUrl,
            proofFileName: uploaded.proofFileName,
            proofUploadedAt: Date.now(),
            settlementMode: activeResultTab,
            settledRatio: settlement.ratioForMe,
          }
          : null
      );
      await showDialog("送金完了画面（PayPay等）の画像を保存し、清算完了としました！🎉", true);
    } catch (err) {
      console.error("Failed to upload proof image:", err);
      await showDialog("画像のアップロードに失敗しました", true);
    } finally {
      hideSpinner();
      if (proofInputRef.current) proofInputRef.current.value = "";
    }
  };

  // 送金証明画像の削除 (未清算に戻す)
  const handleRemoveProof = async () => {
    if (!event) return;
    const confirm = await showDialog(
      "送金証明画像を削除して、未清算状態に戻しますか？",
      false
    );
    if (!confirm) return;

    showSpinner();
    try {
      await removeSettlementProof(eventId);
      setEvent((prev) =>
        prev
          ? {
            ...prev,
            isSettled: false,
            proofUrl: undefined,
            proofFileName: undefined,
            proofUploadedAt: undefined,
            settlementMode: undefined,
            settledRatio: undefined,
          }
          : null
      );
      setIsProofModalOpen(false);
      await showDialog("未清算状態に戻しました", true);
    } catch (err) {
      console.error("Failed to remove proof image:", err);
      await showDialog("削除に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  // 清算完了フラグ切替 (現在のモード・希望割合もデータ保持)
  const handleToggleSettled = async () => {
    if (!event) return;
    const nextState = !event.isSettled;
    showSpinner();
    try {
      await toggleSettlementEventSettled(
        eventId,
        nextState,
        nextState ? activeResultTab : undefined,
        nextState ? settlement.ratioForMe : undefined
      );
      setEvent({
        ...event,
        isSettled: nextState,
        settlementMode: nextState ? activeResultTab : undefined,
        settledRatio: nextState ? settlement.ratioForMe : undefined,
      });
    } catch (e) {
      console.error(e);
    } finally {
      hideSpinner();
    }
  };

  // イベント削除
  const handleDeleteEvent = async () => {
    if (!event) return;
    const confirm = await showDialog(
      `イベント「${event.name}」を削除しますか？\n登録されているすべての明細も削除されます。`,
      false
    );
    if (!confirm) return;

    showSpinner();
    try {
      await deleteSettlementEvent(eventId);
      router.push("/settlement");
    } catch (e) {
      console.error(e);
      hideSpinner();
    }
  };

  const [previewModalUrl, setPreviewModalUrl] = useState<string | null>(null);

  // 明細保存 (新規 or 編集)
  const handleSaveItem = async (data: {
    title: string;
    amount: number;
    type: "expense" | "income";
    payerUid: string;
    date: string;
    time: string;
    receiptFile?: File | null;
    clearReceipt?: boolean;
  }) => {
    if (!user) return;
    setIsSubmitting(true);
    showSpinner();
    try {
      let receiptUrl: string | undefined = editingItem?.receiptUrl;
      let receiptFileName: string | undefined = editingItem?.receiptFileName;
      let receiptFileType: string | undefined = editingItem?.receiptFileType;

      if (data.clearReceipt) {
        receiptUrl = undefined;
        receiptFileName = undefined;
        receiptFileType = undefined;
      } else if (data.receiptFile) {
        const uploaded = await uploadReceipt(eventId, data.receiptFile);
        receiptUrl = uploaded.receiptUrl;
        receiptFileName = uploaded.receiptFileName;
        receiptFileType = uploaded.receiptFileType;
      }

      if (editingItem) {
        // 自分のデータのみ編集可能
        if (editingItem.uid !== user.uid) {
          hideSpinner();
          await showDialog("自分が登録したデータのみ編集できます", true);
          return;
        }
        await updateSettlementItem(
          editingItem.id,
          data.title,
          data.amount,
          data.type,
          data.payerUid,
          data.date,
          data.time,
          receiptUrl,
          receiptFileName,
          receiptFileType
        );
      } else {
        await addSettlementItem(
          eventId,
          data.title,
          data.amount,
          data.type,
          data.payerUid,
          user.uid,
          data.date,
          data.time,
          receiptUrl,
          receiptFileName,
          receiptFileType
        );
      }
      setIsItemModalOpen(false);
      setEditingItem(null);
      await loadData();
    } catch (e) {
      console.error("Failed to save item:", e);
    } finally {
      hideSpinner();
      setIsSubmitting(false);
    }
  };

  // 明細削除
  const handleDeleteItem = async (item: SettlementItem) => {
    if (!user) return;
    if (item.uid !== user.uid) {
      await showDialog("自分が登録したデータのみ削除できます", true);
      return;
    }

    const confirm = await showDialog(`明細「${item.title}」を削除しますか？`, false);
    if (!confirm) return;

    showSpinner();
    try {
      await deleteSettlementItem(item.id);
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      hideSpinner();
    }
  };

  const [myRatio, setMyRatio] = useState<number>(50);

  useEffect(() => {
    if (userData?.splitRatio !== undefined) {
      setMyRatio(userData.splitRatio);
    }
  }, [userData]);

  const handleSaveDefaultRatio = async () => {
    if (!user) return;
    showSpinner();
    try {
      await updateProfile(user.uid, { splitRatio: myRatio });
      await refreshUserData();
      hideSpinner();
      await showDialog(
        `希望ワリカン率 (${myRatio}% : ${100 - myRatio}%) を自分の標準設定として保存しました！`,
        true
      );
    } catch (e) {
      console.error("Failed to save preferred ratio:", e);
      hideSpinner();
      await showDialog("保存に失敗しました", true);
    } finally {
      hideSpinner();
    }
  };

  // 各ユーザーの支払い・収入小計の算出
  const myExpenses = items
    .filter((i) => i.payerUid === user?.uid && i.type === "expense")
    .reduce((sum, i) => sum + i.amount, 0);

  const myIncomes = items
    .filter((i) => i.payerUid === user?.uid && i.type === "income")
    .reduce((sum, i) => sum + i.amount, 0);

  const myNetPaid = myExpenses - myIncomes;

  const partnerExpenses = items
    .filter((i) => i.payerUid !== user?.uid && i.type === "expense")
    .reduce((sum, i) => sum + i.amount, 0);

  const partnerIncomes = items
    .filter((i) => i.payerUid !== user?.uid && i.type === "income")
    .reduce((sum, i) => sum + i.amount, 0);

  const partnerNetPaid = partnerExpenses - partnerIncomes;

  const totalExpenses = myExpenses + partnerExpenses;
  const totalIncomes = myIncomes + partnerIncomes;
  const totalNetPaid = myNetPaid + partnerNetPaid;

  const partnerSelfRatio = partnerData?.splitRatio !== undefined ? partnerData.splitRatio : 50;
  const partnerPreferredMyRatio = 100 - partnerSelfRatio;

  const [activeResultTab, setActiveResultTab] = useState<"my" | "even" | "partner">("my");

  useEffect(() => {
    if (event?.isSettled && event.settlementMode) {
      setActiveResultTab(event.settlementMode);
    }
  }, [event?.isSettled, event?.settlementMode]);

  // 精算計算ヘルパー関数
  const calcSettlementForRatio = (ratioForMe: number) => {
    const ratioForPartner = 100 - ratioForMe;

    const myTargetShare = Math.round(totalNetPaid * (ratioForMe / 100));
    const partnerTargetShare = totalNetPaid - myTargetShare;
    const diff = Math.round(myNetPaid - myTargetShare);

    return {
      ratioForMe,
      ratioForPartner,
      myNetPaid,
      partnerNetPaid,
      totalNetPaid,
      myTargetShare,
      partnerTargetShare,
      diff,
    };
  };

  const evenSettlement = calcSettlementForRatio(50);
  const mySettlement = calcSettlementForRatio(myRatio);
  const partnerSettlement = calcSettlementForRatio(partnerPreferredMyRatio);

  const settlement =
    activeResultTab === "my"
      ? mySettlement
      : activeResultTab === "partner"
        ? partnerSettlement
        : evenSettlement;

  // 日付フォーマットヘルパー
  const getFormattedDate = (item: SettlementItem) => {
    if (item.date) return item.date;
    const d = new Date(item.createdAt);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // 時間フォーマットヘルパー
  const getFormattedTime = (item: SettlementItem) => {
    if (item.time) return item.time;
    const d = new Date(item.createdAt);
    const hh = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${min}`;
  };

  // dateとtimeでソート
  const sortedItems = [...items].sort((a, b) => {
    const dateA = getFormattedDate(a);
    const dateB = getFormattedDate(b);
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    const timeA = getFormattedTime(a);
    const timeB = getFormattedTime(b);
    if (timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }
    return a.createdAt - b.createdAt; // 同一時間なら作成順
  });

  // 日付ごとにグループ化
  const groupedItems: { [date: string]: SettlementItem[] } = {};
  sortedItems.forEach((item) => {
    const dateKey = getFormattedDate(item);
    if (!groupedItems[dateKey]) {
      groupedItems[dateKey] = [];
    }
    groupedItems[dateKey].push(item);
  });

  // 日付キーをソート
  const sortedDateKeys = Object.keys(groupedItems).sort();

  return (
    <AuthGuard>
      <div className={`page-container ${styles.container}`}>
        {/* ヘッダー */}
        <div className={styles.headerRow}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <h1 className={styles.pageTitle}>
                <i className="fa-solid fa-receipt" style={{ color: "#ff758c" }}></i>
                {event?.name}
              </h1>
              <button
                className={styles.iconBtn}
                onClick={() => setIsEventModalOpen(true)}
                title="イベント情報を編集"
              >
                <i className="fa-solid fa-pen"></i>
              </button>
              <button
                className={styles.iconBtn}
                onClick={handleDeleteEvent}
                title="イベントを削除"
                style={{ color: "#e53935" }}
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>

            {/* 日付・場所のサブメタ情報 */}
            <div style={{ display: "flex", alignItems: "center", gap: "12px", marginTop: "4px", fontSize: "13px", color: "#666", flexWrap: "wrap" }}>
              {event?.startDate && (
                <span>
                  <i className="fa-regular fa-calendar-days" style={{ color: "#ff758c", marginRight: "4px" }}></i>
                  {event.startDate.replace(/-/g, "/")}
                  {event.dateMode === "range" && event.endDate ? ` 〜 ${event.endDate.replace(/-/g, "/")}` : ""}
                </span>
              )}
              {(event?.prefectureName || event?.municipalityName) && (
                <span>
                  <i className="fa-solid fa-location-dot" style={{ color: "#a0e7d2", marginRight: "4px" }}></i>
                  {[event.prefectureName, event.municipalityName].filter(Boolean).join(" ")}
                </span>
              )}
            </div>
          </div>

          {/* 送金画面アップロード用隠しファイルインプット */}
          <input
            type="file"
            ref={proofInputRef}
            accept="image/*"
            onChange={handleProofFileSelect}
            style={{ display: "none" }}
          />

          <div className={styles.headerActions}>
            <span
              className={styles.proofBadgeBtn}
              onClick={() => event?.isSettled && setIsProofModalOpen(true)}
              style={{
                background: event?.isSettled ? "#e8f5e9" : "#f8f9fa",
                color: event?.isSettled ? "#2e7d32" : "#666",
                borderColor: event?.isSettled ? "#a5d6a7" : "#e0e0e0",
                cursor: event?.isSettled ? "pointer" : "default",
              }}
            >
              <i
                className={event?.isSettled ? "fa-solid fa-circle-check" : "fa-solid fa-clock"}
                style={{ color: event?.isSettled ? "#2e7d32" : "#888" }}
              ></i>
              <span>{event?.isSettled ? "清算完了" : "未清算"}</span>
            </span>
          </div>
        </div>

        {/* 希望ワリカン率スライダー */}
        <div className={styles.sliderCard}>
          <div className={styles.sliderHeader}>
            <div className={styles.sliderTitle}>
              <i className="fa-solid fa-sliders" style={{ color: "#ff758c" }}></i>
              <span>{myNickname}の希望調整比率</span>
            </div>
          </div>

          {/* 1行目: ユーザー表示（自分 ── 相手） */}
          <div className={styles.sliderUsersRow}>
            <div className={styles.sliderUserLabel}>
              <img src={myPictureUrl} alt={myNickname} className={styles.sliderAvatar} />
              <span>{myNickname} ({myRatio}%)</span>
            </div>
            <div className={`${styles.sliderUserLabel} ${styles.sliderUserLabelRight}`}>
              <span>({100 - myRatio}%) {partnerNickname}</span>
              <img src={partnerPictureUrl} alt={partnerNickname} className={styles.sliderAvatar} />
            </div>
          </div>

          {/* 2行目: 全幅スライダー (スマホで押しやすい) */}
          <div className={styles.rangeContainer}>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={100 - myRatio}
              onChange={(e) => setMyRatio(100 - Number(e.target.value))}
              className={styles.rangeInput}
            />
          </div>

          {/* 3行目: 中央揃えアクションボタン (リセット & 保存) */}
          <div className={styles.sliderActionsRow}>
            <button
              type="button"
              className={styles.actionResetBtn}
              onClick={() => setMyRatio(50)}
              disabled={myRatio === 50}
            >
              リセット
            </button>
            <button
              type="button"
              className={styles.actionSaveBtn}
              onClick={handleSaveDefaultRatio}
            >
              保存
            </button>
          </div>

          {/* 相手（パートナー）の希望設定表示 */}
          <div className={styles.partnerSettingBox}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <img src={partnerPictureUrl} alt={partnerNickname} style={{ width: "20px", height: "20px", borderRadius: "50%", objectFit: "cover" }} />
              <span>{partnerNickname}の希望調整比率:</span>
            </div>
            <span>
              {partnerNickname} {partnerSelfRatio}% : {myNickname} {100 - partnerSelfRatio}%
            </span>
          </div>
        </div>

        {/* 精算サマリーカード */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryTitle}>
            <span>💰 精算結果</span>
            {event?.isSettled && (
              <span style={{ fontSize: "13px", color: "#4caf50", fontWeight: "bold" }}>
                🎉「
                {event.settlementMode === "even"
                  ? "均等割 (50:50)"
                  : event.settlementMode === "partner"
                    ? `${partnerNickname}の希望`
                    : `${myNickname}の希望`}
                」で清算完了済
              </span>
            )}
          </div>

          {/* 計算パターン切替タブ (2行構成) */}
          <div className={styles.resultTabContainer}>
            {/* 1行目: 均等割 */}
            <button
              className={`${styles.resultTabBtn} ${styles.resultTabBtnFull} ${activeResultTab === "even" ? styles.activeResultTab : ""
                }`}
              onClick={() => setActiveResultTab("even")}
            >
              ⚖️ 均等割 (50:50)
            </button>

            {/* 2行目左: 自分の希望 */}
            <button
              className={`${styles.resultTabBtn} ${activeResultTab === "my" ? styles.activeResultTab : ""
                }`}
              onClick={() => setActiveResultTab("my")}
            >
              🙋‍♂️ {myNickname}の希望 ({myRatio}:{100 - myRatio})
            </button>

            {/* 2行目右: 相手の希望 */}
            <button
              className={`${styles.resultTabBtn} ${activeResultTab === "partner" ? styles.activeResultTab : ""
                }`}
              onClick={() => setActiveResultTab("partner")}
            >
              🙋‍♀️ {partnerNickname}の希望 ({100 - partnerSelfRatio}:{partnerSelfRatio})
            </button>
          </div>

          <div
            className={`${styles.resultBox} ${event?.isSettled ? styles.settledResultBox : ""
              }`}
          >
            {settlement.diff === 0 ? (
              <div className={styles.evenState}>
                ⚖️ 精算なし
              </div>
            ) : settlement.diff < 0 ? (
              // 自分が払う
              <div>
                <div className={styles.settlementFlow}>
                  {/* 送金元：自分 */}
                  <div className={styles.userNode}>
                    <img src={myPictureUrl} alt={myNickname} className={styles.userAvatar} />
                    <span className={styles.userName}>{myNickname}</span>
                  </div>

                  {/* 矢印 & 金額 */}
                  <div className={styles.flowArrow}>
                    <span className={styles.amountHighlight}>
                      {Math.abs(settlement.diff).toLocaleString()}円
                    </span>
                    <i
                      className="fa-solid fa-arrow-right-long"
                      style={{ fontSize: "24px" }}
                    ></i>
                  </div>

                  {/* 送金先：パートナー */}
                  <div className={styles.userNode}>
                    <img
                      src={partnerPictureUrl}
                      alt={partnerNickname}
                      className={styles.userAvatar}
                    />
                    <span className={styles.userName}>{partnerNickname}</span>
                  </div>
                </div>
                <div style={{ fontSize: "14px", color: "#e91e63", fontWeight: "bold", marginTop: "6px" }}>
                  {myNickname} から {partnerNickname} へ {Math.abs(settlement.diff).toLocaleString()}円 送金しましょう
                </div>
              </div>
            ) : (
              // パートナーが払う
              <div>
                <div className={styles.settlementFlow}>
                  {/* 送金元：パートナー */}
                  <div className={styles.userNode}>
                    <img
                      src={partnerPictureUrl}
                      alt={partnerNickname}
                      className={styles.userAvatar}
                    />
                    <span className={styles.userName}>{partnerNickname}</span>
                  </div>

                  {/* 矢印 & 金額 */}
                  <div className={styles.flowArrow}>
                    <span className={styles.amountHighlight}>
                      {settlement.diff.toLocaleString()}円
                    </span>
                    <i
                      className="fa-solid fa-arrow-right-long"
                      style={{ fontSize: "24px" }}
                    ></i>
                  </div>

                  {/* 送金先：自分 */}
                  <div className={styles.userNode}>
                    <img src={myPictureUrl} alt={myNickname} className={styles.userAvatar} />
                    <span className={styles.userName}>{myNickname}</span>
                  </div>
                </div>
                <div style={{ fontSize: "14px", color: "#e91e63", fontWeight: "bold", marginTop: "6px" }}>
                  {partnerNickname} から {myNickname} へ {settlement.diff.toLocaleString()}円 送金しましょう
                </div>
              </div>
            )}

            {/* アップロードされた送金証明画像 (PayPay等) のプレビュー表示 */}
            {event?.proofUrl && (
              <div className={styles.proofPreviewCard}>
                <div className={styles.proofThumbContainer}>
                  <img
                    src={event.proofUrl}
                    alt="送金完了画面"
                    className={styles.proofThumb}
                    onClick={() => setIsProofModalOpen(true)}
                  />
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "bold", color: "#166534" }}>
                      📸 送金完了証明画像あり
                    </div>
                    <div style={{ fontSize: "11px", color: "#666" }}>
                      {event.proofFileName || "PayPay送金完了画面"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsProofModalOpen(true)}
                  style={{
                    background: "#fff",
                    border: "1px solid #86efac",
                    color: "#166534",
                    fontSize: "12px",
                    fontWeight: "bold",
                    padding: "4px 10px",
                    borderRadius: "12px",
                    cursor: "pointer",
                  }}
                >
                  画像を拡大表示
                </button>
              </div>
            )}

            {/* 未清算時の送金完了画面アップロードボタン (resultBox下部) */}
            {!event?.isSettled && (
              <div style={{ marginTop: "16px", paddingTop: "12px", borderTop: "1.5px dashed #ffd1dc", textAlign: "center" }}>
                <button
                  type="button"
                  className={styles.uploadProofBtn}
                  onClick={() => proofInputRef.current?.click()}
                  style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: "14px" }}
                >
                  <i className="fa-solid fa-camera"></i>
                  <span>送金完了画面 (PayPay等) をアップロードして清算</span>
                </button>
              </div>
            )}
          </div>

          {/* 全パターンの送金比較リスト */}
          <div className={styles.comparisonBox}>
            <div className={styles.comparisonTitle}>📊 各パターンの精算送金額の比較</div>

            {/* 1. 自分の希望 */}
            <div
              className={`${styles.comparisonRow} ${activeResultTab === "my" ? styles.comparisonRowActive : ""}`}
              onClick={() => setActiveResultTab("my")}
            >
              <span>🙋‍♂️ {myNickname}の希望 ({myRatio}:{100 - myRatio})</span>
              <span>
                {mySettlement.diff === 0
                  ? "精算なし (0円)"
                  : mySettlement.diff > 0
                    ? `${partnerNickname} ➔ ${myNickname}へ ${mySettlement.diff.toLocaleString()}円`
                    : `${myNickname} ➔ ${partnerNickname}へ ${Math.abs(mySettlement.diff).toLocaleString()}円`}
              </span>
            </div>

            {/* 2. 均等 */}
            <div
              className={`${styles.comparisonRow} ${activeResultTab === "even" ? styles.comparisonRowActive : ""}`}
              onClick={() => setActiveResultTab("even")}
            >
              <span>⚖️ 均等割 (50:50)</span>
              <span>
                {evenSettlement.diff === 0
                  ? "精算なし (0円)"
                  : evenSettlement.diff > 0
                    ? `${partnerNickname} ➔ ${myNickname}へ ${evenSettlement.diff.toLocaleString()}円`
                    : `${myNickname} ➔ ${partnerNickname}へ ${Math.abs(evenSettlement.diff).toLocaleString()}円`}
              </span>
            </div>

            {/* 3. 相手の希望 */}
            <div
              className={`${styles.comparisonRow} ${activeResultTab === "partner" ? styles.comparisonRowActive : ""}`}
              onClick={() => setActiveResultTab("partner")}
            >
              <span>🙋‍♀️ {partnerNickname}の希望 ({100 - partnerSelfRatio}:{partnerSelfRatio})</span>
              <span>
                {partnerSettlement.diff === 0
                  ? "精算なし (0円)"
                  : partnerSettlement.diff > 0
                    ? `${partnerNickname} ➔ ${myNickname}へ ${partnerSettlement.diff.toLocaleString()}円`
                    : `${myNickname} ➔ ${partnerNickname}へ ${Math.abs(partnerSettlement.diff).toLocaleString()}円`}
              </span>
            </div>
          </div>
        </div>

        {/* 明細一覧セクション */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>
            <i className="fa-solid fa-list" style={{ color: "#a0e7d2" }}></i>
            支払い・収入明細 ({items.length}件)
          </h2>
          <button
            className={styles.createBtn}
            onClick={() => {
              setEditingItem(null);
              setIsItemModalOpen(true);
            }}
          >
            <i className="fa-solid fa-plus"></i>
            <span>明細を追加</span>
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <i className="fa-solid fa-spinner fa-spin"></i>
            <p>明細を読み込み中...</p>
          </div>
        ) : items.length === 0 ? (
          <div className={styles.emptyState}>
            <i className="fa-solid fa-receipt" style={{ fontSize: "36px", color: "#ccc" }}></i>
            <p>まだ明細が登録されていません。「明細を追加」から登録してください。</p>
          </div>
        ) : (
          <div className={styles.itemList}>
            {sortedDateKeys.map((dateKey) => (
              <div key={dateKey} className={styles.dateGroup}>
                <div className={styles.dateHeader}>
                  <i className="fa-regular fa-calendar" style={{ marginRight: "6px", color: "#ff758c" }}></i>
                  {dateKey.replace(/-/g, "/")}
                </div>
                <div className={styles.groupItems}>
                  {groupedItems[dateKey].map((item) => {
                    const isPayerMe = item.payerUid === user?.uid;
                    const payerName = isPayerMe ? myNickname : partnerNickname;
                    const payerPic = isPayerMe ? myPictureUrl : partnerPictureUrl;
                    const isMyItem = item.uid === user?.uid;

                    return (
                      <div key={item.id} className={styles.itemCard}>
                        <div className={styles.itemLeft}>
                          {/* LINEアイコン + ニックネーム */}
                          <img src={payerPic} alt={payerName} className={styles.payerAvatar} />
                          <div className={styles.itemInfo}>
                            <span className={styles.itemTitle}>{item.title}</span>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                              <span className={styles.itemMeta}>
                                {item.time && (
                                  <span style={{ marginRight: "6px", display: "inline-flex", alignItems: "center", gap: "4px", color: "#666" }}>
                                    <i className="fa-regular fa-clock" style={{ color: "#ff758c" }}></i>
                                    {item.time}
                                  </span>
                                )}
                                <span>{payerName}が{item.type === "expense" ? "支払" : "受取"}</span>
                                {!isMyItem && (
                                  <span className={styles.lockBadge} title="相手が登録した明細のため編集不可">
                                    <i className="fa-solid fa-lock"></i> 相手の登録
                                  </span>
                                )}
                              </span>
                              {item.receiptUrl && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const isPdf =
                                      item.receiptFileType === "application/pdf" ||
                                      (item.receiptFileName && item.receiptFileName.toLowerCase().endsWith(".pdf"));
                                    if (isPdf) {
                                      window.open(item.receiptUrl, "_blank");
                                    } else {
                                      setPreviewModalUrl(item.receiptUrl || null);
                                    }
                                  }}
                                  style={{
                                    background: "#fff0f3",
                                    color: "#ff5e7e",
                                    border: "1px solid #ffccd5",
                                    borderRadius: "12px",
                                    padding: "2px 8px",
                                    fontSize: "11px",
                                    fontWeight: "bold",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "4px",
                                  }}
                                >
                                  <i className={
                                    (item.receiptFileType === "application/pdf" || item.receiptFileName?.toLowerCase().endsWith(".pdf"))
                                      ? "fa-solid fa-file-pdf"
                                      : "fa-solid fa-receipt"
                                  }></i>
                                  <span>領収書{(item.receiptFileType === "application/pdf" || item.receiptFileName?.toLowerCase().endsWith(".pdf")) ? " (PDF)" : ""}</span>
                                </button>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className={styles.itemRight}>
                          <span
                            className={`${styles.itemAmount} ${item.type === "expense" ? styles.amountExpense : styles.amountIncome
                              }`}
                          >
                            {item.type === "expense" ? "-" : "+"}
                            {item.amount.toLocaleString()}円
                          </span>

                          {/* 自分が登録したデータのみ編集・削除ボタンを表示 */}
                          {isMyItem ? (
                            <div className={styles.actionBtns}>
                              <button
                                className={styles.iconBtn}
                                onClick={() => {
                                  setEditingItem(item);
                                  setIsItemModalOpen(true);
                                }}
                                title="編集"
                              >
                                <i className="fa-solid fa-pen-to-square"></i>
                              </button>
                              <button
                                className={styles.iconBtn}
                                onClick={() => handleDeleteItem(item)}
                                title="削除"
                                style={{ color: "#e53935" }}
                              >
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "12px", color: "#ccc" }}>
                              <i className="fa-solid fa-lock" title="登録者のみ編集可能"></i>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 明細集計サマリー (ユーザーごとの小計・合計 & 計算式) */}
        <div className={styles.subtotalSummaryCard}>
          <div style={{ overflowX: "auto", width: "100%", marginBottom: "16px" }}>
            <table className={styles.subtotalTable}>
              <thead>
                <tr>
                  <th>項目</th>
                  <th>
                    <div className={styles.avatarCell}>
                      <img src={myPictureUrl} alt={myNickname} className={styles.subtotalAvatar} />
                      <span>{myNickname}</span>
                    </div>
                  </th>
                  <th>
                    <div className={styles.avatarCell}>
                      <img src={partnerPictureUrl} alt={partnerNickname} className={styles.subtotalAvatar} />
                      <span>{partnerNickname}</span>
                    </div>
                  </th>
                  <th>全体合計</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>支払い小計</td>
                  <td className={styles.expenseText}>{myExpenses.toLocaleString()}円</td>
                  <td className={styles.expenseText}>{partnerExpenses.toLocaleString()}円</td>
                  <td className={styles.expenseText}>{totalExpenses.toLocaleString()}円</td>
                </tr>
                {(myIncomes > 0 || partnerIncomes > 0) && (
                  <tr>
                    <td>収入・返金小計</td>
                    <td className={styles.incomeText}>-{myIncomes.toLocaleString()}円</td>
                    <td className={styles.incomeText}>-{partnerIncomes.toLocaleString()}円</td>
                    <td className={styles.incomeText}>-{totalIncomes.toLocaleString()}円</td>
                  </tr>
                )}
                <tr className={styles.totalRow}>
                  <td>純支払額</td>
                  <td>{myNetPaid.toLocaleString()}円</td>
                  <td>{partnerNetPaid.toLocaleString()}円</td>
                  <td>{totalNetPaid.toLocaleString()}円</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* 精算額の計算プロセス (計算式) */}
          <div className={styles.formulaBox}>
            <div className={styles.formulaTitle}>
              <i className="fa-solid fa-calculator"></i>
              <span>精算額の計算プロセス ({settlement.ratioForMe}% : {settlement.ratioForPartner}%)</span>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>1</span>
              <div>
                <span>全体の純支払合計額 = <strong>{totalNetPaid.toLocaleString()}円</strong></span>
                <div style={{ fontSize: "11px", color: "#666", marginTop: "2px" }}>
                  (内訳：{myNickname}の実支払 {myNetPaid.toLocaleString()}円 / {partnerNickname}の実支払 {partnerNetPaid.toLocaleString()}円)
                </div>
              </div>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>2</span>
              <div>
                <span>本来支払うべき金額 (目標負担額):</span>
                <div style={{ paddingLeft: "12px", marginTop: "4px", fontSize: "11px", color: "#666" }}>
                  • {myNickname} ({settlement.ratioForMe}%): <strong>{totalNetPaid.toLocaleString()}円 × {settlement.ratioForMe}% = {settlement.myTargetShare.toLocaleString()}円</strong>
                  <br />
                  • {partnerNickname} ({settlement.ratioForPartner}%): <strong>{totalNetPaid.toLocaleString()}円 × {settlement.ratioForPartner}% = {settlement.partnerTargetShare.toLocaleString()}円</strong>
                </div>
              </div>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>3</span>
              <div>
                <span>実支払額との差額 (過不足):</span>
                <div style={{ paddingLeft: "12px", marginTop: "4px", fontSize: "11px", color: "#666" }}>
                  • {myNickname}: {myNetPaid.toLocaleString()}円 (実支払) - {settlement.myTargetShare.toLocaleString()}円 (目標) = <strong>{settlement.diff > 0 ? `+${settlement.diff.toLocaleString()}` : settlement.diff.toLocaleString()}円</strong>
                  <br />
                  • {partnerNickname}: {partnerNetPaid.toLocaleString()}円 (実支払) - {settlement.partnerTargetShare.toLocaleString()}円 (目標) = <strong>{-settlement.diff > 0 ? `+${(-settlement.diff).toLocaleString()}` : (-settlement.diff).toLocaleString()}円</strong>
                </div>
              </div>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>4</span>
              <div>
                <span><strong>精算のアクション:</strong></span>
                <div style={{ paddingLeft: "12px", marginTop: "4px", fontSize: "11px", color: "#e91e63", fontWeight: "bold" }}>
                  {settlement.diff === 0 ? (
                    <span>ちょうど目標通りに支払われているため、送金は不要です。⚖️</span>
                  ) : settlement.diff < 0 ? (
                    <span>
                      目標の負担額に合わせるため、{myNickname} から {partnerNickname} へ <strong>{Math.abs(settlement.diff).toLocaleString()}円</strong> を送って調整します。💸
                      <br />
                      <span style={{ fontSize: "10px", color: "#666", fontWeight: "normal" }}>
                        👉 送金先 ({partnerNickname}) の PayPay ID: <strong>{partnerData?.paypayId || "（未設定）"}</strong>
                      </span>
                    </span>
                  ) : (
                    <span>
                      目標の負担額に合わせるため、{partnerNickname} から {myNickname} へ <strong>{settlement.diff.toLocaleString()}円</strong> を送って調整します。💰
                      <br />
                      <span style={{ fontSize: "10px", color: "#666", fontWeight: "normal" }}>
                        👉 送金先 ({myNickname}) の PayPay ID: <strong>{userData?.paypayId || "（未設定）"}</strong>
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <EventModal
          isOpen={isEventModalOpen}
          event={event}
          onClose={() => setIsEventModalOpen(false)}
          onSave={handleUpdateEvent}
          isSubmitting={isSubmitting}
        />

        <ExpenseItemModal
          isOpen={isItemModalOpen}
          item={editingItem}
          currentUserId={user?.uid || ""}
          partnerData={partnerData}
          currentUserData={userData as FirestoreUser}
          onClose={() => {
            setIsItemModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveItem}
          isSubmitting={isSubmitting}
        />

        {/* 領収書画像プレビューモーダル */}
        {previewModalUrl && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(4px)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              boxSizing: "border-box",
            }}
            onClick={() => setPreviewModalUrl(null)}
          >
            <div style={{ position: "relative", maxWidth: "90vw", maxHeight: "90vh" }}>
              <img
                src={previewModalUrl}
                alt="領収書プレビュー"
                style={{
                  maxWidth: "100%",
                  maxHeight: "85vh",
                  borderRadius: "16px",
                  objectFit: "contain",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.5)",
                }}
              />
              <button
                onClick={() => setPreviewModalUrl(null)}
                style={{
                  position: "absolute",
                  top: "-16px",
                  right: "-16px",
                  background: "#fff",
                  color: "#333",
                  border: "none",
                  borderRadius: "50%",
                  width: "38px",
                  height: "38px",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: "bold",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* 送金画面 (PayPay等) 拡大閲覧＆管理モーダル */}
        {isProofModalOpen && (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              background: "rgba(0,0,0,0.85)",
              backdropFilter: "blur(4px)",
              zIndex: 10000,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
        padding: "20px",
        boxSizing: "border-box",
            }}
        onClick={() => setIsProofModalOpen(false)}
          >
        <div
          style={{
            background: "#fff",
            borderRadius: "20px",
            padding: "20px",
            maxWidth: "450px",
            width: "100%",
            maxHeight: "90vh",
            overflowY: "auto",
            boxSizing: "border-box",
            position: "relative",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", color: "#333", display: "flex", alignItems: "center", gap: "6px" }}>
              <i className="fa-solid fa-circle-check" style={{ color: "#4caf50" }}></i>
              送金完了証明画像 (PayPay等)
            </h3>
            <button
              onClick={() => setIsProofModalOpen(false)}
              style={{ background: "none", border: "none", fontSize: "20px", color: "#888", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          {event?.proofUrl ? (
            <div style={{ textAlign: "center" }}>
              <img
                src={event.proofUrl}
                alt="送金完了証明画像"
                style={{
                  width: "100%",
                  maxHeight: "380px",
                  objectFit: "contain",
                  borderRadius: "12px",
                  border: "1px solid #eee",
                  marginBottom: "16px",
                }}
              />
              <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsProofModalOpen(false);
                    proofInputRef.current?.click();
                  }}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "1px solid #ff758c",
                    background: "#fff0f3",
                    color: "#ff5e7e",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  画像を差し替える
                </button>
                <button
                  type="button"
                  onClick={handleRemoveProof}
                  style={{
                    padding: "8px 16px",
                    borderRadius: "20px",
                    border: "1px solid #e53935",
                    background: "#ffebee",
                    color: "#e53935",
                    fontWeight: "bold",
                    fontSize: "13px",
                    cursor: "pointer",
                  }}
                >
                  画像を削除して未清算に戻す
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <p style={{ color: "#666", marginBottom: "16px" }}>まだ送金証明画像が登録されていません。</p>
              <button
                type="button"
                onClick={() => {
                  setIsProofModalOpen(false);
                  proofInputRef.current?.click();
                }}
                className={styles.uploadProofBtn}
              >
                <i className="fa-solid fa-camera"></i>
                <span>送金画面をアップロード</span>
              </button>
            </div>
          )}
        </div>
      </div>
        )}
    </div>
    </AuthGuard >
  );
}
