"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { getMemos, addMemo, updateMemo, deleteMemo } from "@/src/features/memo/api/memo-client-service";
import { User as FirestoreUser, Memo } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import BackToHome from "@/src/components/Common/BackToHome";
import styles from "./Memo.module.css";

type ModalMode = "closed" | "detail";

export default function MemoClient() {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const [partnerUser, setPartnerUser] = useState<FirestoreUser | null>(null);
  const [coupleKey, setCoupleKey] = useState<string>("");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // モーダル
  const [modalMode, setModalMode] = useState<ModalMode>("closed");
  const [selectedMemo, setSelectedMemo] = useState<Memo | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ title: "メモ" }]);
  }, [setBreadcrumbs]);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      showSpinner();
      const partner = await getPartnerData(user.uid);
      setPartnerUser(partner);

      let cKey = user.uid;
      if (partner) {
        cKey =
          user.uid < partner.id
            ? `${user.uid}_${partner.id}`
            : `${partner.id}_${user.uid}`;
      }
      setCoupleKey(cKey);

      const data = await getMemos(cKey);
      setMemos(data);
    } catch (e) {
      console.error(e);
      showDialog("データの読み込み中に問題が発生したようです。");
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // --- ヘルパー ---
  const myName = userData?.nickname || "自分";
  const partnerName = partnerUser?.nickname || "パートナー";

  const isMyMemo = (memo: Memo) => memo.uid === user?.uid;

  const canEdit = (memo: Memo) => {
    if (isMyMemo(memo)) return true;
    return memo.partnerEditable;
  };

  const canDelete = (memo: Memo) => isMyMemo(memo);

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  // --- 画面遷移およびモーダル操作 ---
  const openCreateModal = () => {
    router.push("/memo/new");
  };

  const openDetailModal = (memo: Memo) => {
    setSelectedMemo(memo);
    setModalMode("detail");
  };

  const openEditModal = (memo: Memo) => {
    router.push(`/memo/edit/${memo.id}`);
  };

  const closeModal = () => {
    setModalMode("closed");
    setSelectedMemo(null);
  };

  const handleDelete = async () => {
    if (!selectedMemo) return;
    const confirmed = await showDialog(
      "このメモを削除してもよろしいですか？"
    );
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteMemo(selectedMemo.id);
      setMemos((prev) => prev.filter((m) => m.id !== selectedMemo.id));
      closeModal();
      showDialog("メモを削除しました。");
    } catch (e) {
      console.error(e);
      showDialog("削除できませんでした。恐れ入りますが、もう一度お試しください。");
    } finally {
      hideSpinner();
    }
  };

  // --- レンダリング ---
  if (isLoading) {
    return <div className="page-container" />;
  }

  return (
    <div className="page-container">
      <div className={styles.container}>

        <div className={styles.header}>
          <h1 className={styles.title}>
            <i className={`fa-solid fa-note-sticky ${styles.titleIcon}`}></i>
            メモ
          </h1>
          <button className={styles.addButton} onClick={openCreateModal}>
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {memos.length === 0 ? (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>📝</span>
            <p className={styles.emptyText}>
              お二人のメモはまだありません。
              <br />
              新しくメモを書いてみましょう✨
            </p>
            <button className={styles.emptyAction} onClick={openCreateModal}>
              <i className="fa-solid fa-plus"></i>
              メモを作成する
            </button>
          </div>
        ) : (
          <div className={styles.memoList}>
            {memos.map((memo) => (
              <div
                key={memo.id}
                className={`${styles.memoCard} ${
                  isMyMemo(memo) ? styles.memoCardMine : styles.memoCardPartner
                }`}
                onClick={() => openDetailModal(memo)}
              >
                <div className={styles.memoCardHeader}>
                  <span className={styles.memoCardTitle}>{memo.title}</span>
                  <div className={styles.memoCardBadges}>
                    <span
                      className={`${styles.badge} ${
                        isMyMemo(memo) ? styles.badgeMine : styles.badgePartner
                      }`}
                    >
                      {isMyMemo(memo) ? myName : partnerName}
                    </span>
                    {!memo.partnerEditable && (
                      <span className={`${styles.badge} ${styles.badgeLocked}`}>
                        <i className="fa-solid fa-lock"></i>
                      </span>
                    )}
                  </div>
                </div>
                {memo.content && (
                  <div className={styles.memoCardPreview}>{memo.content}</div>
                )}
                <div className={styles.memoCardDate}>
                  <i className="fa-regular fa-clock"></i>
                  {formatDate(memo.updatedAt)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* モーダル: 詳細表示 */}
        {modalMode === "detail" && selectedMemo && (
          <div className={styles.modalOverlay} onClick={closeModal}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2 className={styles.modalTitle}>
                  <i className="fa-solid fa-note-sticky"></i>
                  {selectedMemo.title}
                </h2>
                <button className={styles.modalClose} onClick={closeModal}>
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>

              <div className={styles.detailContent}>
                {selectedMemo.content || "（内容はまだありません）"}
              </div>

              <div className={styles.detailMeta}>
                <span className={styles.detailMetaItem}>
                  <i className="fa-solid fa-user"></i>
                  {isMyMemo(selectedMemo) ? myName : partnerName}
                </span>
                <span className={styles.detailMetaItem}>
                  <i className="fa-regular fa-calendar"></i>
                  作成: {formatDate(selectedMemo.createdAt)}
                </span>
                <span className={styles.detailMetaItem}>
                  <i className="fa-regular fa-clock"></i>
                  更新: {formatDate(selectedMemo.updatedAt)}
                </span>
                <span className={styles.detailMetaItem}>
                  {selectedMemo.partnerEditable ? (
                    <>
                      <i className="fa-solid fa-unlock"></i>
                      パートナー編集OK
                    </>
                  ) : (
                    <>
                      <i className="fa-solid fa-lock"></i>
                      作成者のみ編集可
                    </>
                  )}
                </span>
              </div>

              {canEdit(selectedMemo) ? (
                <div className={styles.detailActions}>
                  <button
                    className={styles.editButton}
                    onClick={() => openEditModal(selectedMemo)}
                  >
                    <i className="fa-solid fa-pen"></i> 編集する
                  </button>
                  {canDelete(selectedMemo) && (
                    <button
                      className={styles.deleteButton}
                      onClick={handleDelete}
                    >
                      <i className="fa-solid fa-trash"></i>
                    </button>
                  )}
                </div>
              ) : (
                <div className={styles.readonlyNotice}>
                  <i className="fa-solid fa-lock"></i>
                  こちらのメモは作成者のみが編集できるように設定されています
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      <BackToHome />
    </div>
  );
}
