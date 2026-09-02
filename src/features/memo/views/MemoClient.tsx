"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { getMemos } from "@/src/features/memo/api/memo-client-service";
import { User as FirestoreUser, Memo } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner, errorLog } from "@/src/lib/functions";
import BackToHome from "@/src/components/Common/BackToHome";
import styles from "./Memo.module.css";

export default function MemoClient() {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const [partnerUser, setPartnerUser] = useState<FirestoreUser | null>(null);
  const [coupleKey, setCoupleKey] = useState<string>("");
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
      errorLog("メモデータ読み込み", e);
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

  const formatDate = (ts: number) => {
    if (!ts) return "-";
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const handleCreateMemo = () => {
    router.push("/memo/new");
  };

  const handleOpenMemo = (memoId: string) => {
    router.push(`/memo/${memoId}`);
  };

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
          <button className={styles.addButton} onClick={handleCreateMemo}>
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
            <button className={styles.emptyAction} onClick={handleCreateMemo}>
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
                onClick={() => handleOpenMemo(memo.id)}
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

      </div>
      <BackToHome />
    </div>
  );
}
