"use client";

import { useEffect, useState } from "react";
import { CalendarEvent } from "@/src/lib/firestore/types";
import { showDialog, getJSTDate } from "@/src/lib/functions";
import styles from "./Calendar.module.css";

interface EventModalProps {
  event: Partial<CalendarEvent> | null; // Null means adding new event
  currentUserId: string;
  myNickname?: string;
  partnerNickname?: string;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
}

export default function EventModal({
  event,
  currentUserId,
  myNickname = "自分",
  partnerNickname = "パートナー",
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const isEdit = !!event?.id;
  const isEditable = !isEdit || event?.uid === currentUserId;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"personal" | "couple">("couple");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("11:00");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");

  useEffect(() => {
    const today = getJSTDate();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setTitle(event?.title || "");
    setType(event?.type || "couple");
    setIsAllDay(event?.isAllDay ?? true);
    setStartDate(event?.startDate || todayStr);
    setStartTime(event?.startTime || "10:00");
    setEndDate(event?.endDate || event?.startDate || todayStr);
    setEndTime(event?.endTime || "11:00");
    setNote(event?.note || "");
    setLink(event?.link || "");
  }, [event]);

  // Adjust end date if start date moves past it
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showDialog("タイトルを入力してください", true);
      return;
    }

    // Date/Time validation
    if (endDate < startDate) {
      showDialog("終了日は開始日以降に設定してください", true);
      return;
    }

    if (startDate === endDate && !isAllDay && endTime < startTime) {
      showDialog("終了時間は開始時間以降に設定してください", true);
      return;
    }

    const eventData: Partial<CalendarEvent> = {
      title: title.trim(),
      type,
      isAllDay,
      startDate,
      endDate,
      note: note.trim(),
      link: link.trim(),
      uid: event?.uid || currentUserId,
      ...(isAllDay ? {} : { startTime, endTime }),
    };

    await onSave(eventData);
  };

  const handleDeleteClick = async () => {
    if (!event?.id || !onDelete) return;
    const confirmed = await showDialog("本当にこの予定を削除しますか？");
    if (confirmed) {
      await onDelete(event.id);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.eventModal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.modalClose} onClick={onClose} aria-label="閉じる">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className={styles.modalTitle}>
          <i className="fa-solid fa-calendar-days"></i>{" "}
          {isEdit ? (isEditable ? "予定の編集" : "予定の詳細") : "予定の追加"}
        </div>

        {!isEditable && (
          <div className={styles.readOnlyNote}>
            {partnerNickname}の予定は編集できません (参照のみ)
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.modalScrollArea}>
            <div>
              <label className={styles.fieldLabel} htmlFor="event-title">
              タイトル
            </label>
            <input
              type="text"
              id="event-title"
              className={`${styles.inputField} ${styles.titleInput}`}
              placeholder="予定のタイトルを入力"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!isEditable}
              required
            />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="event-type">
              区分
            </label>
            <select
              id="event-type"
              className={styles.selectField}
              value={type}
              onChange={(e) => setType(e.target.value as "personal" | "couple")}
              disabled={!isEditable}
            >
              <option value="couple">2人の予定</option>
              <option value="personal">
                {isEditable ? myNickname : partnerNickname}の予定
              </option>
            </select>
          </div>

          <div className={styles.toggleRow}>
            <span className={styles.toggleLabel}>終日</span>
            <label className={styles.toggleSwitch}>
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                disabled={!isEditable}
              />
              <span className={styles.slider}></span>
            </label>
          </div>

          <div>
            <label className={styles.fieldLabel}>開始日時</label>
            <div className={styles.timeRow}>
              <input
                type="date"
                className={styles.dateInput}
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
                disabled={!isEditable}
                required
              />
              {!isAllDay && (
                <input
                  type="time"
                  className={styles.timeInput}
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={!isEditable}
                  required
                />
              )}
            </div>
          </div>

          <div>
            <label className={styles.fieldLabel}>終了日時</label>
            <div className={styles.timeRow}>
              <input
                type="date"
                className={styles.dateInput}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                disabled={!isEditable}
                required
              />
              {!isAllDay && (
                <input
                  type="time"
                  className={styles.timeInput}
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={!isEditable}
                  required
                />
              )}
            </div>
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="event-note">
              メモ
            </label>
            <textarea
              id="event-note"
              className={`${styles.inputField} ${styles.notesArea}`}
              placeholder="メモを入力"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={!isEditable}
            />
          </div>

          <div>
            <label className={styles.fieldLabel} htmlFor="event-link">
              リンク (URL)
            </label>
            <div className={styles.linkInputWrapper}>
              <input
                type="url"
                id="event-link"
                className={styles.inputField}
                placeholder="https://example.com"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                disabled={!isEditable}
              />
              {link && (
                <a
                  href={link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.linkOpenButton}
                  title="リンクを開く"
                >
                  <i className="fa-solid fa-external-link"></i>
                </a>
              )}
            </div>
          </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose}>
              閉じる
            </button>
            {isEdit && isEditable && onDelete && (
              <button type="button" className={styles.btnDelete} onClick={handleDeleteClick}>
                削除
              </button>
            )}
            {isEditable && (
              <button type="submit" className={styles.btnSave}>
                保存する
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
