"use client";

import { useState, useEffect } from "react";
import { User as FirestoreUser, DailyStatus } from "@/src/lib/firestore/types";
import styles from "./DailyStatus.module.css";
import { showDialog } from "@/src/components/CommonDialog";
import { saveDailyStatus } from "@/src/features/home/api/daily-status-client-service";

interface DailyStatusCardProps {
  user: FirestoreUser | null;
  status: DailyStatus | null;
  isMe: boolean;
  onEdit?: () => void;
  onOpenHistory?: () => void;
  onSavePartnerComment?: (comment: string) => Promise<void>;
  titlePrefix?: string;
  currentUser?: FirestoreUser | null;
  partnerUser?: FirestoreUser | null;
  onStatusUpdate?: (updated: DailyStatus) => void;
}

export default function DailyStatusCard({ user, status, isMe, onEdit, onOpenHistory, onSavePartnerComment, titlePrefix = "今日の", currentUser, partnerUser, onStatusUpdate }: DailyStatusCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [commentText, setCommentText] = useState(status?.partnerComment || "");
  const [isSaving, setIsSaving] = useState(false);

  const [currentStatus, setCurrentStatus] = useState<DailyStatus | null>(status);
  const [pickerTarget, setPickerTarget] = useState<"commentReactions" | "partnerCommentReactions" | null>(null);

  const PRESET_EMOJIS = ["😊", "❤️", "🎉", "😭", "👏", "😮", "🫂", "‼️", "✨"];

  useEffect(() => {
    setCurrentStatus(status);
  }, [status]);

  useEffect(() => {
    setCommentText(status?.partnerComment || "");
    setIsEditing(false);
  }, [status?.partnerComment]);

  useEffect(() => {
    const handleGlobalClick = () => {
      setPickerTarget(null);
    };
    if (pickerTarget) {
      window.addEventListener("click", handleGlobalClick);
    }
    return () => {
      window.removeEventListener("click", handleGlobalClick);
    };
  }, [pickerTarget]);

  const handleToggleReaction = async (
    targetField: "commentReactions" | "partnerCommentReactions",
    emoji: string
  ) => {
    if (!currentUser || !currentStatus?.id) return;
    const userId = currentUser.id;

    const reactions = { ...(currentStatus[targetField] || {}) };
    const currentList = reactions[emoji] ? [...reactions[emoji]] : [];

    const index = currentList.indexOf(userId);
    if (index >= 0) {
      currentList.splice(index, 1);
    } else {
      currentList.push(userId);
    }

    if (currentList.length === 0) {
      delete reactions[emoji];
    } else {
      reactions[emoji] = currentList;
    }

    const updatedStatus = {
      ...currentStatus,
      [targetField]: reactions,
    };

    setCurrentStatus(updatedStatus);
    if (onStatusUpdate) {
      onStatusUpdate(updatedStatus);
    }

    try {
      await saveDailyStatus({
        id: currentStatus.id,
        [targetField]: reactions,
      });
    } catch (e) {
      console.error("Failed to save reaction", e);
      setCurrentStatus(currentStatus);
      if (onStatusUpdate) {
        onStatusUpdate(currentStatus);
      }
    }
  };

  const renderReactions = (targetField: "commentReactions" | "partnerCommentReactions", className?: string) => {
    if (!currentStatus) return null;
    const reactions = currentStatus[targetField] || {};
    const userId = currentUser?.id;

    return (
      <div className={`${styles.reactionsContainer} ${className || ""}`} onClick={(e) => e.stopPropagation()}>
        {Object.entries(reactions).map(([emoji, uids]) => {
          if (!uids || uids.length === 0) return null;
          const isActive = userId ? uids.includes(userId) : false;
          return (
            <button
              key={emoji}
              className={`${styles.reactionBadge} ${isActive ? styles.reactionBadgeActive : ""}`}
              onClick={() => handleToggleReaction(targetField, emoji)}
            >
              <span>{emoji}</span>
              <span>{uids.length}</span>
            </button>
          );
        })}

        <button
          className={styles.addReactionBtn}
          onClick={() => setPickerTarget(pickerTarget === targetField ? null : targetField)}
          title="リアクションを追加"
        >
          <i className="fa-regular fa-face-smile"></i>
        </button>

        {pickerTarget === targetField && (
          <div className={styles.pickerPopover}>
            {PRESET_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                className={styles.pickerEmoji}
                onClick={() => {
                  handleToggleReaction(targetField, emoji);
                  setPickerTarget(null);
                }}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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

  const commentAuthorName = isMe
    ? (partnerUser?.nickname || "パートナー")
    : (currentUser?.nickname || "わたし");

  const commentAuthorIcon = isMe
    ? (partnerUser?.pictureUrl || "/icon.png")
    : (currentUser?.pictureUrl || "/icon.png");

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
            <div>
              <div className={styles.commentBox}>
                {status.comment}
              </div>
              {renderReactions("commentReactions")}
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
                    <>
                      <div className={`${styles.commentBubbleContainer} ${styles.partnerCommentBg}`}>
                        <img src={commentAuthorIcon} alt={commentAuthorName} className={styles.commentAvatar} />
                        <div className={styles.commentBubbleContent}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthorName}>{commentAuthorName}</span>
                            <div className={styles.commentActions}>
                              <button className={styles.commentEditBtn} onClick={() => setIsEditing(true)} title="編集">
                                <i className="fa-solid fa-pen"></i>
                              </button>
                              <button className={styles.commentDeleteBtn} onClick={handleDeleteComment} title="削除">
                                <i className="fa-solid fa-trash-can"></i>
                              </button>
                            </div>
                          </div>
                          <div className={styles.commentBubbleBody}>{status.partnerComment}</div>
                        </div>
                      </div>
                      {renderReactions("partnerCommentReactions")}
                    </>
                  )
                ) : (
                  status.partnerComment && (
                    <>
                      <div className={`${styles.commentBubbleContainer} ${styles.partnerCommentBg}`}>
                        <img src={commentAuthorIcon} alt={commentAuthorName} className={styles.commentAvatar} />
                        <div className={styles.commentBubbleContent}>
                          <div className={styles.commentHeader}>
                            <span className={styles.commentAuthorName}>{commentAuthorName}</span>
                          </div>
                          <div className={styles.commentBubbleBody}>{status.partnerComment}</div>
                        </div>
                      </div>
                      {renderReactions("partnerCommentReactions")}
                    </>
                  )
                )
              ) : (
                status.partnerComment && (
                  <>
                    <div className={`${styles.commentBubbleContainer} ${styles.myCommentBg}`}>
                      <img src={commentAuthorIcon} alt={commentAuthorName} className={styles.commentAvatar} />
                      <div className={styles.commentBubbleContent}>
                        <div className={styles.commentHeader}>
                          <span className={styles.commentAuthorName}>{commentAuthorName}</span>
                        </div>
                        <div className={styles.commentBubbleBody}>{status.partnerComment}</div>
                      </div>
                    </div>
                    {renderReactions("partnerCommentReactions")}
                  </>
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
