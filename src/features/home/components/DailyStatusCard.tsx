"use client";

import { useState, useEffect } from "react";
import { User as FirestoreUser, DailyStatus } from "@/src/lib/firestore/types";
import styles from "./DailyStatus.module.css";
import { showDialog } from "@/src/components/CommonDialog";

interface DailyStatusCardProps {
  user: FirestoreUser | null;
  status: DailyStatus | null;
  isMe: boolean;
  onEdit?: () => void;
  onOpenHistory?: () => void;
  onSavePartnerComment?: (comment: string) => Promise<void>;
  titlePrefix?: string;
}

export default function DailyStatusCard({ user, status, isMe, onEdit, onOpenHistory, onSavePartnerComment, titlePrefix = "今日の" }: DailyStatusCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState(status?.partnerComment || "");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setCommentText(status?.partnerComment || "");
    setIsEditing(false);
  }, [status?.partnerComment]);

  const handleSaveComment = async () => {
    if (!onSavePartnerComment) return;
    setIsSaving(true);
    try {
      await onSavePartnerComment(commentText);
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteComment = async () => {
    if (!onSavePartnerComment) return;
    const ok = await showDialog("コメントを削除しますか？");
    if (!ok) return;

    setIsSaving(true);
    try {
      await onSavePartnerComment("");
      setCommentText("");
      setIsEditing(false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSaving(false);
    }
  };

  const renderStars = (value: number, type: "mood" | "health") => {
    const stars = [];
    const activeClass = type === "mood" ? styles.starActive : styles.starActiveHealth;
    const iconClass = type === "mood" ? "fa-heart" : "fa-star";
    
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <i
          key={i}
          className={`fa-solid ${iconClass} ${i <= value ? activeClass : ""}`}
        ></i>
      );
    }
    return <div className={styles.stars}>{stars}</div>;
  };

  if (!user) return null;

  const showCommentSection = status && (
    (!isMe && (onSavePartnerComment || status.partnerComment)) ||
    (isMe && status.partnerComment)
  );

  return (
    <div className={`${styles.cardContainer} ${!isMe ? styles.partnerCard : ""}`}>
      <div className={styles.cardHeader}>
        <div className={styles.userInfo}>
          <img src={user.pictureUrl || "/icon.png"} alt={user.nickname} className={styles.userIcon} />
          <span className={styles.title}>{titlePrefix}{user.nickname || (isMe ? "わたし" : "パートナー")}</span>
        </div>
        <div className={styles.actions}>
          {onOpenHistory && (
            <button className={styles.historyBtn} onClick={onOpenHistory} title="過去の履歴を見る">
              <i className="fa-solid fa-clock-rotate-left"></i>
            </button>
          )}
          {isMe && (
            <button className={styles.editBtn} onClick={onEdit}>
              <i className="fa-solid fa-pen"></i>
            </button>
          )}
        </div>
      </div>

      {status ? (
        <div className={styles.statusContent}>
          <div className={styles.statusRow}>
            <span className={styles.label}>気分</span>
            {renderStars(status.mood, "mood")}
          </div>
          <div className={styles.statusRow}>
            <span className={styles.label}>体調</span>
            {renderStars(status.health, "health")}
          </div>
          {status.comment && (
            <div className={styles.commentBox}>
              {status.comment}
            </div>
          )}

          {/* コメントセクション */}
          {showCommentSection && (
            <div className={styles.commentSection}>
              {!isMe ? (
                onSavePartnerComment ? (
                  isEditing || !status.partnerComment ? (
                    <div className={styles.commentInputRow}>
                      <textarea
                        className={styles.commentInputInlineTextarea}
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="コメントを返す..."
                        disabled={isSaving}
                        rows={2}
                        maxLength={200}
                      />
                      <div className={styles.commentInputActions}>
                        <button
                          className={styles.commentSendBtn}
                          onClick={handleSaveComment}
                          disabled={isSaving || !commentText.trim()}
                          title="送信"
                        >
                          {isSaving ? (
                            <i className="fa-solid fa-spinner fa-spin"></i>
                          ) : (
                            <i className="fa-solid fa-paper-plane"></i>
                          )}
                        </button>
                        {status.partnerComment && (
                          <button
                            className={styles.commentCancelBtn}
                            onClick={() => {
                              setCommentText(status.partnerComment || "");
                              setIsEditing(false);
                            }}
                            disabled={isSaving}
                            title="キャンセル"
                          >
                            <i className="fa-solid fa-xmark"></i>
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.partnerCommentBox}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>わたしのコメント</span>
                        <div className={styles.commentActions}>
                          <button className={styles.commentEditBtn} onClick={() => setIsEditing(true)} title="編集">
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className={styles.commentDeleteBtn} onClick={handleDeleteComment} title="削除">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </div>
                      </div>
                      <div className={styles.commentBody}>{status.partnerComment}</div>
                    </div>
                  )
                ) : (
                  status.partnerComment && (
                    <div className={styles.partnerCommentBox}>
                      <div className={styles.commentHeader}>
                        <span className={styles.commentAuthor}>わたしのコメント</span>
                      </div>
                      <div className={styles.commentBody}>{status.partnerComment}</div>
                    </div>
                  )
                )
              ) : (
                status.partnerComment && (
                  <div className={styles.myCommentBox}>
                    <div className={styles.commentHeader}>
                      <span className={styles.commentAuthor}>パートナーからのコメント</span>
                    </div>
                    <div className={styles.commentBody}>{status.partnerComment}</div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      ) : (
        <div className={styles.emptyState}>
          {isMe ? "今日の状態を記録しよう！" : "まだ記録されていません"}
        </div>
      )}
    </div>
  );
}
