"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { getMemo, deleteMemo } from "@/src/features/memo/api/memo-client-service";
import { User as FirestoreUser, Memo } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner, errorLog } from "@/src/lib/functions";
import BackToHome from "@/src/components/Common/BackToHome";
import styles from "./MemoConfirm.module.css";

interface MemoConfirmClientProps {
  id: string;
}

export default function MemoConfirmClient({ id }: MemoConfirmClientProps) {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [partnerUser, setPartnerUser] = useState<FirestoreUser | null>(null);
  const [memo, setMemo] = useState<Memo | null>(null);

  const loadData = useCallback(async () => {
    if (!user) return;
    try {
      showSpinner();
      const [partner, memoData] = await Promise.all([
        getPartnerData(user.uid),
        getMemo(id),
      ]);
      setPartnerUser(partner);

      if (!memoData) {
        showDialog("対象のメモを確認できませんでした。");
        router.push("/memo");
        return;
      }

      setMemo(memoData);
      setBreadcrumbs([
        { title: "メモ", href: "/memo" },
        { title: memoData.title || "メモの確認" },
      ]);
    } catch (e) {
      console.error(e);
      errorLog("メモ詳細読み込み", e);
      showDialog("データの読み込み中に問題が発生したようです。");
      router.push("/memo");
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  }, [user, id, router, setBreadcrumbs]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (isLoading || !memo) {
    return <div className="page-container" />;
  }

  const myName = userData?.nickname || "自分";
  const partnerName = partnerUser?.nickname || "パートナー";
  const isMyMemo = memo.uid === user?.uid;
  const canEdit = isMyMemo || memo.partnerEditable;
  const canDelete = isMyMemo;

  const formatDate = (ts: number) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const handleDelete = async () => {
    const confirmed = await showDialog("このメモを削除してもよろしいですか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteMemo(memo.id);
      showDialog("メモを削除しました。");
      router.push("/memo");
      router.refresh();
    } catch (e) {
      console.error(e);
      errorLog("メモ確認画面削除", e);
      showDialog("削除できませんでした。恐れ入りますが、もう一度お試しください。");
    } finally {
      hideSpinner();
    }
  };

  return (
    <div className="page-container">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <i className={`fa-solid fa-note-sticky ${styles.titleIcon}`}></i>
            メモの確認
          </h1>
          <Link href="/memo" className={styles.backLink}>
            <i className="fa-solid fa-arrow-left"></i> 一覧に戻る
          </Link>
        </div>

        <div className={styles.card}>
          <h2 className={styles.memoTitle}>{memo.title}</h2>

          <div className={styles.metaContainer}>
            <span
              className={`${styles.badge} ${
                isMyMemo ? styles.badgeMine : styles.badgePartner
              }`}
            >
              <i className="fa-solid fa-user"></i>
              {isMyMemo ? myName : partnerName}
            </span>

            {memo.partnerEditable ? (
              <span className={`${styles.badge} ${styles.badgeEditable}`}>
                <i className="fa-solid fa-unlock"></i> パートナー編集OK
              </span>
            ) : (
              <span className={`${styles.badge} ${styles.badgeLocked}`}>
                <i className="fa-solid fa-lock"></i> 作成者のみ編集可
              </span>
            )}

            <span className={styles.metaItem}>
              <i className="fa-regular fa-calendar"></i>
              作成: {formatDate(memo.createdAt)}
            </span>

            <span className={styles.metaItem}>
              <i className="fa-regular fa-clock"></i>
              更新: {formatDate(memo.updatedAt)}
            </span>
          </div>

          <div className={styles.contentBody}>
            {memo.content ? (
              memo.content
            ) : (
              <span className={styles.emptyContent}>（メモの本文はありません）</span>
            )}
          </div>
        </div>

        <div className={styles.actionSection}>
          {canEdit ? (
            <div className={styles.mainActions}>
              <Link href={`/memo/edit/${memo.id}`} className={styles.editButton}>
                <i className="fa-solid fa-pen"></i> 編集する
              </Link>
              {canDelete && (
                <button className={styles.deleteButton} onClick={handleDelete}>
                  <i className="fa-solid fa-trash"></i> 削除する
                </button>
              )}
            </div>
          ) : (
            <div className={styles.readonlyNotice}>
              <i className="fa-solid fa-lock"></i>
              こちらのメモは作成者のみが編集できるように設定されています。
            </div>
          )}
        </div>
      </div>
      <BackToHome />
    </div>
  );
}
