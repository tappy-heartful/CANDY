"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { getMemo, addMemo, updateMemo, deleteMemo } from "@/src/features/memo/api/memo-client-service";
import { User as FirestoreUser, Memo } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner, errorLog } from "@/src/lib/functions";
import BackToHome from "@/src/components/Common/BackToHome";
import styles from "./MemoEdit.module.css";
import Link from "next/link";

interface MemoEditClientProps {
  id?: string;
}

export default function MemoEditClient({ id }: MemoEditClientProps) {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [partnerUser, setPartnerUser] = useState<FirestoreUser | null>(null);
  const [coupleKey, setCoupleKey] = useState<string>("");
  const [memo, setMemo] = useState<Memo | null>(null);

  // フォーム状態
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [partnerEditable, setPartnerEditable] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // パンくずリストの設定
  useEffect(() => {
    if (id) {
      setBreadcrumbs([
        { title: "メモ", href: "/memo" },
        { title: memo?.title || "確認", href: `/memo/${id}` },
        { title: "編集" }
      ]);
    } else {
      setBreadcrumbs([
        { title: "メモ", href: "/memo" },
        { title: "新しいメモ" }
      ]);
    }
  }, [id, memo, setBreadcrumbs]);

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

      if (id) {
        // 編集モード：メモデータを読み込む
        const data = await getMemo(id);
        if (data) {
          // 権限チェック
          // 作成者本人、またはパートナー編集許可されている場合のみ編集可能
          const isOwner = data.uid === user.uid;
          const isAllowed = isOwner || data.partnerEditable;
          
          if (!isAllowed) {
            showDialog("こちらのメモを編集する権限がないようです。");
            router.push("/memo");
            return;
          }

          setMemo(data);
          setTitle(data.title);
          setContent(data.content);
          setPartnerEditable(data.partnerEditable);
        } else {
          showDialog("対象のメモを確認できませんでした。");
          router.push("/memo");
          return;
        }
      }
    } catch (e) {
      console.error(e);
      errorLog("メモ詳細・パートナー読み込み", e);
      showDialog("データの読み込み中に問題が発生したようです。");
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  }, [user, id, router]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isMyMemo = memo ? memo.uid === user?.uid : true;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showDialog("タイトルを入力してください。");
      return;
    }
    if (!coupleKey || !user) return;

    setIsSubmitting(true);
    showSpinner();
    try {
      if (!id) {
        // 新規作成
        await addMemo({
          coupleKey,
          title: title.trim(),
          content,
          uid: user.uid,
          partnerEditable,
        });
        showDialog("メモを保存しました✨");
        router.push("/memo");
      } else {
        // 編集
        const updateData: Partial<Omit<Memo, "id" | "createdAt">> = {
          title: title.trim(),
          content,
        };
        // パートナーの場合、partnerEditable の変更は許可しない（作成者のみ変更可能）
        if (isMyMemo) {
          updateData.partnerEditable = partnerEditable;
        }
        await updateMemo(id, updateData);
        showDialog("メモを更新しました✨");
        router.push(`/memo/${id}`);
      }
      
      router.refresh();
    } catch (e) {
      console.error(e);
      errorLog("メモ保存", e);
      showDialog("保存できませんでした。恐れ入りますが、もう一度お試しいただけますか？");
    } finally {
      setIsSubmitting(false);
      hideSpinner();
    }
  };

  const handleDelete = async () => {
    if (!id || !memo) return;
    
    // 作成者本人のみ削除可能
    if (!isMyMemo) {
      showDialog("削除権限はありません。作成者のみ削除可能です。");
      return;
    }

    const confirmed = await showDialog("このメモを削除してもよろしいですか？");
    if (!confirmed) return;

    showSpinner();
    try {
      await deleteMemo(id);
      showDialog("メモを削除しました。");
      router.push("/memo");
      router.refresh();
    } catch (e) {
      console.error(e);
      errorLog("メモ編集画面削除", e);
      showDialog("削除できませんでした。恐れ入りますが、もう一度お試しください。");
    } finally {
      hideSpinner();
    }
  };

  if (isLoading) {
    return <div className="page-container" />;
  }

  return (
    <div className="page-container">
      <div className={styles.container}>
        <div className={styles.header}>
          <h1 className={styles.title}>
            <i className={`fa-solid ${id ? "fa-pen-to-square" : "fa-plus"} ${styles.titleIcon}`}></i>
            {id ? "メモの編集" : "新しいメモを作成"}
          </h1>
          <Link href={id ? `/memo/${id}` : "/memo"} className={styles.backLink}>
            <i className="fa-solid fa-arrow-left"></i> {id ? "確認に戻る" : "一覧に戻る"}
          </Link>
        </div>

        <div className={styles.formCard}>
          <form onSubmit={handleSave}>
            <div className={styles.formGroup}>
              <label className={styles.formLabel}>タイトル</label>
              <input
                type="text"
                className={styles.formInput}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="メモのタイトルを入力"
                required
                autoFocus
              />
            </div>

            <div className={styles.formGroup}>
              <label className={styles.formLabel}>内容</label>
              <textarea
                className={styles.formTextarea}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="メモの内容を自由に書いてください"
                rows={18}
              />
            </div>

            {/* パートナー編集許可トグル（作成者のみ、または新規作成時のみ変更可能） */}
            {isMyMemo && (
              <div className={styles.formGroup}>
                <div className={styles.toggleGroup}>
                  <div className={styles.toggleLabel}>
                    <span className={styles.toggleLabelText}>
                      <i className="fa-solid fa-user-group"></i> パートナーの編集を許可
                    </span>
                    <span className={styles.toggleLabelHint}>
                      許可すると、パートナーもこのメモを編集できます
                    </span>
                  </div>
                  <label className={styles.toggleSwitch}>
                    <input
                      type="checkbox"
                      className={styles.toggleSwitchInput}
                      checked={partnerEditable}
                      onChange={(e) => setPartnerEditable(e.target.checked)}
                    />
                    <span className={styles.toggleSwitchSlider}></span>
                  </label>
                </div>
              </div>
            )}

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  "保存中..."
                ) : (
                  <>
                    <i className="fa-solid fa-check"></i> 保存する
                  </>
                )}
              </button>
              
              {id && isMyMemo && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={handleDelete}
                >
                  <i className="fa-solid fa-trash"></i> 削除する
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
      <BackToHome />
    </div>
  );
}
