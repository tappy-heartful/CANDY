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
  partnerUid?: string;
  onClose: () => void;
  onSave: (eventData: Partial<CalendarEvent>, targetRange?: "only" | "all") => Promise<void>;
  onDelete?: (id: string, targetRange?: "only" | "all") => Promise<void>;
}

const calculateDefaultEndDate = (start: string, unit: "day" | "week" | "month" | "year"): string => {
  if (!start) return "";
  const [y, m, d] = start.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  if (unit === "day") {
    date.setDate(date.getDate() + 7);
  } else if (unit === "week") {
    date.setMonth(date.getMonth() + 1);
  } else if (unit === "month") {
    date.setFullYear(date.getFullYear() + 1);
  } else if (unit === "year") {
    date.setFullYear(date.getFullYear() + 5);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export default function EventModal({
  event,
  currentUserId,
  myNickname = "自分",
  partnerNickname = "パートナー",
  partnerUid,
  onClose,
  onSave,
  onDelete,
}: EventModalProps) {
  const isEdit = !!event?.id;
  const isEditable = true;
  const isOwnEvent = !isEdit || event?.uid === currentUserId;

  const [title, setTitle] = useState("");
  const [type, setType] = useState<"personal" | "couple">("couple");
  const [uid, setUid] = useState("");
  const [isAllDay, setIsAllDay] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("10:00");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("11:00");
  const [note, setNote] = useState("");
  const [link, setLink] = useState("");

  // 繰り返し用ステート
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceUnit, setRecurrenceUnit] = useState<"day" | "week" | "month" | "year">("week");
  const [monthlyOption, setMonthlyOption] = useState<"dayOfMonth" | "dayOfWeek">("dayOfMonth");
  const [yearlyOption, setYearlyOption] = useState<"dayOfYear" | "dayOfWeekOfYear">("dayOfYear");
  const [recurrenceEndDate, setRecurrenceEndDate] = useState("");

  // 保存・削除時の適用範囲確認ポップアップの表示制御
  const [confirmMode, setConfirmMode] = useState<"save" | "delete" | null>(null);

  useEffect(() => {
    const today = getJSTDate();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setTitle(event?.title || "");
    setType(event?.type || "couple");
    setUid(event?.uid || currentUserId);
    setIsAllDay(event?.isAllDay ?? true);
    setStartDate(event?.startDate || todayStr);
    setStartTime(event?.startTime || "10:00");
    setEndDate(event?.endDate || event?.startDate || todayStr);
    setEndTime(event?.endTime || "11:00");
    setNote(event?.note || "");
    setLink(event?.link || "");
    setIsRecurring(false);
    setRecurrenceInterval(1);
    setRecurrenceUnit("week");
    setMonthlyOption("dayOfMonth");
    setYearlyOption("dayOfYear");
    setRecurrenceEndDate(calculateDefaultEndDate(event?.startDate || todayStr, "week"));
    setConfirmMode(null);
  }, [event]);

  useEffect(() => {
    if (startDate && recurrenceUnit) {
      setRecurrenceEndDate(calculateDefaultEndDate(startDate, recurrenceUnit));
    }
  }, [startDate, recurrenceUnit]);

  // Adjust end date if start date moves past it
  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    if (endDate < val) {
      setEndDate(val);
    }
  };

  const executeSave = async (targetRange?: "only" | "all") => {
    const eventData: Partial<CalendarEvent> = {
      title: title.trim(),
      type,
      isAllDay,
      startDate,
      endDate,
      note: note.trim(),
      link: link.trim(),
      uid: uid || currentUserId,
      ...(isAllDay ? {} : { startTime, endTime }),
    };

    if (!isEdit && isRecurring && startDate === endDate) {
      eventData.isRecurring = true;
      (eventData as any).recurrenceConfig = {
        interval: recurrenceInterval,
        unit: recurrenceUnit,
        monthlyOption,
        yearlyOption,
        endDate: recurrenceEndDate,
      };
    }

    await onSave(eventData, targetRange);
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

    if (isEdit && event?.isRecurring) {
      setConfirmMode("save");
      return;
    }

    await executeSave();
  };

  const handleDeleteClick = async () => {
    if (!event?.id || !onDelete) return;

    if (event.isRecurring) {
      setConfirmMode("delete");
      return;
    }

    const confirmed = await showDialog("本当にこの予定を削除しますか？");
    if (confirmed) {
      await onDelete(event.id);
    }
  };

  const handleConfirmAction = async (targetRange: "only" | "all") => {
    setConfirmMode(null);
    if (confirmMode === "save") {
      await executeSave(targetRange);
    } else if (confirmMode === "delete" && event?.id && onDelete) {
      await onDelete(event.id, targetRange);
    }
  };

  const getRecurrenceOptionTexts = () => {
    if (!startDate) return { dayOfMonth: "", dayOfWeek: "", dayOfYear: "", dayOfWeekOfYear: "" };
    const date = new Date(startDate);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const weekNum = Math.ceil(day / 7);
    const days = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeekStr = days[date.getDay()];

    return {
      dayOfMonth: `毎月${day}日`,
      dayOfWeek: `毎月第${weekNum}${dayOfWeekStr}曜日`,
      dayOfYear: `毎年${month}月${day}日`,
      dayOfWeekOfYear: `毎年${month}月第${weekNum}${dayOfWeekStr}曜日`,
    };
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.eventModal} onClick={(e) => e.stopPropagation()}>
        {confirmMode && (
          <div className={styles.confirmOverlay}>
            <div className={styles.confirmBox}>
              <div className={styles.confirmMessage}>
                この予定は繰り返し予定の一部です。<br />
                {confirmMode === "save" ? "変更" : "削除"}の適用範囲を選択してください。
              </div>
              <div className={styles.confirmButtons}>
                <button
                  type="button"
                  className={`${styles.confirmBtn} ${styles.btnConfirmOnly}`}
                  onClick={() => handleConfirmAction("only")}
                >
                  この予定のみ{confirmMode === "save" ? "変更" : "削除"}
                </button>
                <button
                  type="button"
                  className={`${styles.confirmBtn} ${styles.btnConfirmAll}`}
                  onClick={() => handleConfirmAction("all")}
                >
                  すべての繰り返し予定を一括{confirmMode === "save" ? "変更" : "削除"}
                </button>
                <button
                  type="button"
                  className={`${styles.confirmBtn} ${styles.btnConfirmCancel}`}
                  onClick={() => setConfirmMode(null)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          </div>
        )}

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
              value={type === "couple" ? "couple" : (uid === currentUserId ? "me" : "partner")}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "couple") {
                  setType("couple");
                  setUid(event?.uid || currentUserId);
                } else if (val === "me") {
                  setType("personal");
                  setUid(currentUserId);
                } else if (val === "partner") {
                  setType("personal");
                  setUid(partnerUid || "");
                }
              }}
              disabled={!isEditable}
            >
              <option value="couple">2人の予定</option>
              <option value="me">{myNickname}の予定</option>
              {partnerUid && (
                <option value="partner">{partnerNickname}の予定</option>
              )}
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

          {!isEdit && startDate === endDate && (
            <>
              <div className={styles.toggleRow} style={{ marginTop: "12px" }}>
                <span className={styles.toggleLabel}>繰り返し登録する</span>
                <label className={styles.toggleSwitch}>
                  <input
                    type="checkbox"
                    checked={isRecurring}
                    onChange={(e) => setIsRecurring(e.target.checked)}
                    disabled={!isEditable}
                  />
                  <span className={styles.slider}></span>
                </label>
              </div>
              {isRecurring && (
                <div className={styles.recurrenceSettings}>
                  <div className={styles.recurrenceRow}>
                    <select
                      className={styles.recurrenceSelect}
                      value={recurrenceInterval}
                      onChange={(e) => setRecurrenceInterval(Number(e.target.value))}
                    >
                      {[...Array(30)].map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {idx + 1}
                        </option>
                      ))}
                    </select>
                    <select
                      className={styles.recurrenceSelect}
                      value={recurrenceUnit}
                      onChange={(e) => setRecurrenceUnit(e.target.value as any)}
                    >
                      <option value="day">日</option>
                      <option value="week">週</option>
                      <option value="month">月</option>
                      <option value="year">年</option>
                    </select>
                    <span>ごと</span>
                  </div>

                  {recurrenceUnit === "month" && (
                    <div className={styles.recurrenceRadioGroup}>
                      <label className={styles.recurrenceRadioLabel}>
                        <input
                          type="radio"
                          name="monthlyOption"
                          value="dayOfMonth"
                          checked={monthlyOption === "dayOfMonth"}
                          onChange={() => setMonthlyOption("dayOfMonth")}
                        />
                        {getRecurrenceOptionTexts().dayOfMonth}
                      </label>
                      <label className={styles.recurrenceRadioLabel}>
                        <input
                          type="radio"
                          name="monthlyOption"
                          value="dayOfWeek"
                          checked={monthlyOption === "dayOfWeek"}
                          onChange={() => setMonthlyOption("dayOfWeek")}
                        />
                        {getRecurrenceOptionTexts().dayOfWeek}
                      </label>
                    </div>
                  )}

                  {recurrenceUnit === "year" && (
                    <div className={styles.recurrenceRadioGroup}>
                      <label className={styles.recurrenceRadioLabel}>
                        <input
                          type="radio"
                          name="yearlyOption"
                          value="dayOfYear"
                          checked={yearlyOption === "dayOfYear"}
                          onChange={() => setYearlyOption("dayOfYear")}
                        />
                        {getRecurrenceOptionTexts().dayOfYear}
                      </label>
                      <label className={styles.recurrenceRadioLabel}>
                        <input
                          type="radio"
                          name="yearlyOption"
                          value="dayOfWeekOfYear"
                          checked={yearlyOption === "dayOfWeekOfYear"}
                          onChange={() => setYearlyOption("dayOfWeekOfYear")}
                        />
                        {getRecurrenceOptionTexts().dayOfWeekOfYear}
                      </label>
                    </div>
                  )}

                  <div style={{ marginTop: "12px" }}>
                    <label className={styles.fieldLabel}>繰り返し終了日</label>
                    <input
                      type="date"
                      className={styles.dateInput}
                      value={recurrenceEndDate}
                      onChange={(e) => setRecurrenceEndDate(e.target.value)}
                      min={startDate}
                      required
                    />
                  </div>
                </div>
              )}
            </>
          )}

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
