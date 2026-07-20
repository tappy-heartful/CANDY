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
  const { user, userData } = useAuth();
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

  // 清算完了フラグ切替
  const handleToggleSettled = async () => {
    if (!event) return;
    const nextState = !event.isSettled;
    showSpinner();
    try {
      await toggleSettlementEventSettled(eventId, nextState);
      setEvent({ ...event, isSettled: nextState });
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

  const partnerSelfRatio = partnerData?.splitRatio !== undefined ? partnerData.splitRatio : 50;
  const partnerPreferredMyRatio = 100 - partnerSelfRatio;

  const [activeResultTab, setActiveResultTab] = useState<"my" | "even" | "partner">("my");

  // 精算計算ヘルパー関数
  const calcSettlementForRatio = (ratioForMe: number) => {
    let myNet = 0;
    let partnerNet = 0;

    items.forEach((item) => {
      const val = item.type === "expense" ? item.amount : -item.amount;
      if (item.payerUid === user?.uid) {
        myNet += val;
      } else {
        partnerNet += val;
      }
    });

    const totalNet = myNet + partnerNet;
    const myShare = totalNet * (ratioForMe / 100);
    const partnerShare = totalNet - myShare;
    const diff = myNet - myShare;

    return {
      ratioForMe,
      ratioForPartner: 100 - ratioForMe,
      myNet,
      partnerNet,
      totalNet,
      myShare: Math.round(myShare),
      partnerShare: Math.round(partnerShare),
      diff: Math.round(diff),
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

          <div className={styles.headerActions}>
            <label className={styles.settleCheckboxLabel}>
              <input
                type="checkbox"
                checked={!!event?.isSettled}
                onChange={handleToggleSettled}
                className={styles.settleCheckbox}
              />
              <span>清算済み</span>
            </label>
          </div>
        </div>

        {/* 希望ワリカン率スライダー */}
        <div className={styles.sliderCard}>
          <div className={styles.sliderHeader}>
            <div className={styles.sliderTitle}>
              <i className="fa-solid fa-sliders" style={{ color: "#ff758c" }}></i>
              <span>{myNickname}の現在の調整希望比率</span>
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
              value={myRatio}
              onChange={(e) => setMyRatio(Number(e.target.value))}
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
              <span>{partnerNickname}の標準希望設定:</span>
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
                🎉 このイベントは清算済みです
              </span>
            )}
          </div>

          {/* 計算パターン切替タブ (2行構成) */}
          <div className={styles.resultTabContainer}>
            {/* 1行目: 均等割 */}
            <button
              className={`${styles.resultTabBtn} ${styles.resultTabBtnFull} ${
                activeResultTab === "even" ? styles.activeResultTab : ""
              }`}
              onClick={() => setActiveResultTab("even")}
            >
              ⚖️ 均等割 (50:50)
            </button>

            {/* 2行目左: 自分の希望 */}
            <button
              className={`${styles.resultTabBtn} ${
                activeResultTab === "my" ? styles.activeResultTab : ""
              }`}
              onClick={() => setActiveResultTab("my")}
            >
              🙋‍♂️ {myNickname}の希望 ({myRatio}:{100 - myRatio})
            </button>

            {/* 2行目右: 相手の希望 */}
            <button
              className={`${styles.resultTabBtn} ${
                activeResultTab === "partner" ? styles.activeResultTab : ""
              }`}
              onClick={() => setActiveResultTab("partner")}
            >
              🙋‍♀️ {partnerNickname}の希望 ({100 - partnerSelfRatio}:{partnerSelfRatio})
            </button>
          </div>

          <div
            className={`${styles.resultBox} ${
              event?.isSettled ? styles.settledResultBox : ""
            }`}
          >
            {settlement.diff === 0 ? (
              <div className={styles.evenState}>
                ⚖️ ちょうど半分ずつ支払っています！（精算なし）
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
            {items.map((item) => {
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
                            <span>領収書{ (item.receiptFileType === "application/pdf" || item.receiptFileName?.toLowerCase().endsWith(".pdf")) ? " (PDF)" : "" }</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className={styles.itemRight}>
                    <span
                      className={`${styles.itemAmount} ${
                        item.type === "expense" ? styles.amountExpense : styles.amountIncome
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
        )}

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
      </div>
    </AuthGuard>
  );
}
