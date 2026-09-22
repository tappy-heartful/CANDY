"use client";

import { useState, useEffect } from "react";
import { GarbageSchedule } from "@/src/lib/firestore/types";
import {
  GARBAGE_PRESETS,
  COLOR_OPTIONS,
  ICON_OPTIONS,
  DAY_OF_WEEK_LABELS,
  NTH_WEEK_OPTIONS,
  MONTH_OPTIONS,
  GarbagePreset,
} from "../types/garbage";
import { showDialog } from "@/src/lib/functions";
import styles from "./GarbageModal.module.css";

interface GarbageModalProps {
  isOpen: boolean;
  schedule: GarbageSchedule | null;
  onClose: () => void;
  onSave: (data: Omit<GarbageSchedule, "id" | "uid" | "createdAt" | "updatedAt">) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  isSubmitting: boolean;
}

export default function GarbageModal({
  isOpen,
  schedule,
  onClose,
  onSave,
  onDelete,
  isSubmitting,
}: GarbageModalProps) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#F87171");
  const [icon, setIcon] = useState("fa-fire");
  const [monthType, setMonthType] = useState<"every" | "even" | "odd" | "custom">("every");
  const [customMonths, setCustomMonths] = useState<number[]>([1]);
  const [weekType, setWeekType] = useState<"every" | "biweekly" | "nth">("every");
  const [biweeklyStartDate, setBiweeklyStartDate] = useState<string>("");
  const [nthWeeks, setNthWeeks] = useState<number[]>([1]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([2]); // デフォルト火曜
  const [note, setNote] = useState("");

  const getTodayDateStr = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // 初期値のセット
  useEffect(() => {
    if (isOpen) {
      if (schedule) {
        setName(schedule.name || "");
        setColor(schedule.color || "#F87171");
        setIcon(schedule.icon || "fa-trash-can");
        setMonthType(schedule.monthType || "every");
        setCustomMonths(
          schedule.customMonths && schedule.customMonths.length > 0
            ? schedule.customMonths
            : [new Date().getMonth() + 1]
        );
        setWeekType(schedule.weekType || "every");
        setBiweeklyStartDate(schedule.biweeklyStartDate || getTodayDateStr());
        setNthWeeks(schedule.nthWeeks && schedule.nthWeeks.length > 0 ? schedule.nthWeeks : [1]);
        setDaysOfWeek(schedule.daysOfWeek && schedule.daysOfWeek.length > 0 ? schedule.daysOfWeek : [1]);
        setNote(schedule.note || "");
      } else {
        // 新規作成時デフォルト
        const defaultDate = getTodayDateStr();
        setName("");
        setColor("#F87171");
        setIcon("fa-fire");
        setMonthType("every");
        setCustomMonths([new Date().getMonth() + 1]);
        setWeekType("every");
        setBiweeklyStartDate(defaultDate);
        setNthWeeks([1]);
        setDaysOfWeek([2]); // デフォルト火曜日
        setNote("");
      }
    }
  }, [isOpen, schedule]);

  if (!isOpen) return null;

  // プリセット適用
  const handleSelectPreset = (preset: GarbagePreset) => {
    setName(preset.name);
    setColor(preset.color);
    setIcon(preset.icon);
    if (preset.defaultNote && !note) {
      setNote(preset.defaultNote);
    }
  };

  // 月指定（customMonths）のトグル
  const handleToggleMonth = (m: number) => {
    setCustomMonths((prev) => {
      if (prev.includes(m)) {
        if (prev.length === 1) return prev; // 最低1つ選択
        return prev.filter((item) => item !== m);
      } else {
        return [...prev, m].sort((a, b) => a - b);
      }
    });
  };

  // 隔週の開始日変更（同時に該当曜日を自動セット）
  const handleStartDateChange = (val: string) => {
    setBiweeklyStartDate(val);
    if (val) {
      const parts = val.split("-").map(Number);
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          setDaysOfWeek([d.getDay()]);
        }
      }
    }
  };

  // 第N週のトグル（指定時）
  const handleToggleNthWeek = (week: number) => {
    setNthWeeks((prev) => {
      if (prev.includes(week)) {
        if (prev.length === 1) return prev; // 最低1つ選択
        return prev.filter((w) => w !== week);
      } else {
        return [...prev, week].sort((a, b) => a - b);
      }
    });
  };

  // 曜日のトグル
  const handleToggleDay = (day: number) => {
    setDaysOfWeek((prev) => {
      if (prev.includes(day)) {
        if (prev.length === 1) return prev; // 最低1つ選択
        return prev.filter((d) => d !== day);
      } else {
        return [...prev, day].sort((a, b) => a - b);
      }
    });
  };

  // 保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showDialog("ごみの種類名を入力してください");
      return;
    }
    if (daysOfWeek.length === 0) {
      showDialog("収集曜日を1つ以上選択してください");
      return;
    }
    if (monthType === "custom" && customMonths.length === 0) {
      showDialog("対象の月を1つ以上選択してください");
      return;
    }
    if (weekType === "biweekly" && !biweeklyStartDate) {
      showDialog("隔週の開始日（基準日）を入力してください");
      return;
    }
    if (weekType === "nth" && nthWeeks.length === 0) {
      showDialog("第何週かを1つ以上選択してください");
      return;
    }

    await onSave({
      name: name.trim(),
      color,
      icon,
      monthType,
      customMonths: monthType === "custom" ? customMonths : [],
      weekType,
      biweeklyStartDate: weekType === "biweekly" ? biweeklyStartDate : "",
      nthWeeks: weekType === "nth" ? nthWeeks : [],
      daysOfWeek,
      note: note.trim(),
    });
  };

  // 削除処理
  const handleDelete = async () => {
    if (!schedule || !onDelete) return;
    const confirmed = await showDialog(`「${schedule.name}」のルールを削除しますか？`);
    if (!confirmed) return;
    await onDelete(schedule.id);
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <i className={`fa-solid ${schedule ? "fa-pen-to-square" : "fa-plus"} ${styles.modalTitleIcon}`}></i>
            {schedule ? "ごみ出しルールの編集" : "新しいごみ出しルール"}
          </h2>
          <button type="button" className={styles.closeIconBtn} onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          {/* ごみ種別名 & プリセット */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="garbage-name">
              ごみの種類 <span className={styles.requiredBadge}>必須</span>
            </label>
            <input
              id="garbage-name"
              type="text"
              className={styles.inputField}
              placeholder="例: 可燃ごみ、プラスチック"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            {/* プリセットタグ */}
            <div className={styles.presetContainer}>
              {GARBAGE_PRESETS.map((preset) => {
                const isActive = name === preset.name;
                return (
                  <button
                    key={preset.name}
                    type="button"
                    className={`${styles.presetTag} ${isActive ? styles.presetTagActive : ""}`}
                    onClick={() => handleSelectPreset(preset)}
                  >
                    <i className={`fa-solid ${preset.icon}`} style={{ color: preset.color }}></i>
                    {preset.name.split("（")[0]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* 収集月 */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>
              収集月 <span className={styles.requiredBadge}>必須</span>
            </label>
            <div className={styles.segmentRow}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${monthType === "every" ? styles.segmentBtnActive : ""}`}
                onClick={() => setMonthType("every")}
              >
                毎月
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${monthType === "even" ? styles.segmentBtnActive : ""}`}
                onClick={() => setMonthType("even")}
              >
                偶数月
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${monthType === "odd" ? styles.segmentBtnActive : ""}`}
                onClick={() => setMonthType("odd")}
              >
                奇数月
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${monthType === "custom" ? styles.segmentBtnActive : ""}`}
                onClick={() => setMonthType("custom")}
              >
                指定月
              </button>
            </div>

            {/* 指定月（custom）が選択された場合の12ヶ月グリッド */}
            {monthType === "custom" && (
              <div className={styles.monthGrid}>
                {MONTH_OPTIONS.map((m) => {
                  const isSelected = customMonths.includes(m.value);
                  return (
                    <button
                      key={m.value}
                      type="button"
                      className={`${styles.toggleBtn} ${isSelected ? styles.toggleBtnActive : ""}`}
                      onClick={() => handleToggleMonth(m.value)}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 収集週 */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>
              収集週 <span className={styles.requiredBadge}>必須</span>
            </label>
            <div className={styles.weekPatternGrid}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${weekType === "every" ? styles.segmentBtnActive : ""}`}
                onClick={() => setWeekType("every")}
              >
                毎週
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${weekType === "biweekly" ? styles.segmentBtnActive : ""}`}
                onClick={() => setWeekType("biweekly")}
              >
                隔週 (2週に1回)
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${weekType === "nth" ? styles.segmentBtnActive : ""}`}
                onClick={() => setWeekType("nth")}
              >
                第N週 (指定)
              </button>
            </div>

            {/* 隔週の場合：開始日（基準日）の選択 */}
            {weekType === "biweekly" && (
              <div className={styles.startDateBox}>
                <div className={styles.startDateHeader}>
                  <label className={styles.startDateLabel} htmlFor="biweekly-start-date">
                    <i className="fa-regular fa-calendar-check" style={{ color: "#ff758c" }}></i>
                    開始日（基準となる収集日）
                  </label>
                </div>
                <input
                  id="biweekly-start-date"
                  type="date"
                  className={styles.dateInput}
                  value={biweeklyStartDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required
                />
                <p className={styles.helperText}>
                  💡 月に関係なく、この開始日から14日ごと（2週間おき）に収集されます。曜日は自動的に設定されます。
                </p>
              </div>
            )}

            {/* 第N週（指定）が選ばれている場合の個別チェック */}
            {weekType === "nth" && (
              <div className={styles.nthWeekGrid}>
                {NTH_WEEK_OPTIONS.map((opt) => {
                  const isSelected = nthWeeks.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className={`${styles.toggleBtn} ${isSelected ? styles.toggleBtnActive : ""}`}
                      onClick={() => handleToggleNthWeek(opt.value)}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* 収集曜日 */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>
              収集曜日 <span className={styles.requiredBadge}>必須</span>
            </label>
            <div className={styles.dayGrid}>
              {DAY_OF_WEEK_LABELS.map((day) => {
                const isSelected = daysOfWeek.includes(day.value);
                const dayClass =
                  day.value === 0 ? styles.dayBtnSun : day.value === 6 ? styles.dayBtnSat : "";
                return (
                  <button
                    key={day.value}
                    type="button"
                    className={`${styles.dayBtn} ${dayClass} ${isSelected ? styles.dayBtnActive : ""}`}
                    onClick={() => handleToggleDay(day.value)}
                    title={day.fullLabel}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* カラー & アイコン選択 */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>テーマカラー</label>
            <div className={styles.colorPalette}>
              {COLOR_OPTIONS.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`${styles.colorDot} ${color === c ? styles.colorDotActive : ""}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                  aria-label={`Color ${c}`}
                />
              ))}
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>アイコン</label>
            <div className={styles.iconRow}>
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  className={`${styles.iconChoiceBtn} ${icon === ic ? styles.iconChoiceBtnActive : ""}`}
                  onClick={() => setIcon(ic)}
                >
                  <i className={`fa-solid ${ic}`} style={{ color: icon === ic ? color : undefined }}></i>
                </button>
              ))}
            </div>
          </div>

          {/* メモ・注意事項 */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel} htmlFor="garbage-note">
              メモ・出し方のルール（任意）
            </label>
            <textarea
              id="garbage-note"
              className={styles.textareaField}
              placeholder="例: 朝8時までに集積所へ、指定の黄色い袋を使用 など"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          {/* フッターアクション */}
          <div className={styles.modalFooter}>
            <div className={styles.actionRow}>
              <button type="button" className={styles.closeBtn} onClick={onClose} disabled={isSubmitting}>
                キャンセル
              </button>
              <button type="submit" className={styles.saveBtn} disabled={isSubmitting}>
                <i className="fa-solid fa-check"></i>
                {isSubmitting ? "保存中..." : schedule ? "更新する" : "追加する"}
              </button>
            </div>
            {schedule && onDelete && (
              <button type="button" className={styles.deleteBtn} onClick={handleDelete} disabled={isSubmitting}>
                <i className="fa-solid fa-trash-can"></i>
                このルールを削除
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
