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
} from "../types/living";
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

type WeekPatternMode = "every" | "biweekly13" | "biweekly24" | "customNth";

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
  const [weekPattern, setWeekPattern] = useState<WeekPatternMode>("every");
  const [nthWeeks, setNthWeeks] = useState<number[]>([1]);
  const [daysOfWeek, setDaysOfWeek] = useState<number[]>([2]); // デフォルト火曜
  const [note, setNote] = useState("");

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

        // 週パターンの判定
        if (schedule.weekType === "every") {
          setWeekPattern("every");
          setNthWeeks([1]);
        } else {
          const sorted = [...(schedule.nthWeeks || [])].sort((a, b) => a - b);
          const key = sorted.join(",");
          if (key === "1,3") {
            setWeekPattern("biweekly13");
          } else if (key === "2,4") {
            setWeekPattern("biweekly24");
          } else {
            setWeekPattern("customNth");
          }
          setNthWeeks(sorted.length > 0 ? sorted : [1]);
        }

        setDaysOfWeek(schedule.daysOfWeek && schedule.daysOfWeek.length > 0 ? schedule.daysOfWeek : [1]);
        setNote(schedule.note || "");
      } else {
        // 新規作成時デフォルト
        setName("");
        setColor("#F87171");
        setIcon("fa-fire");
        setMonthType("every");
        setCustomMonths([new Date().getMonth() + 1]);
        setWeekPattern("every");
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

  // 週パターンの変更
  const handleChangeWeekPattern = (mode: WeekPatternMode) => {
    setWeekPattern(mode);
    if (mode === "biweekly13") {
      setNthWeeks([1, 3]);
    } else if (mode === "biweekly24") {
      setNthWeeks([2, 4]);
    } else if (mode === "every") {
      setNthWeeks([]);
    } else if (mode === "customNth" && nthWeeks.length === 0) {
      setNthWeeks([1]);
    }
  };

  // 第N週のトグル（自由指定時）
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

    const isNthWeek = weekPattern !== "every";
    if (isNthWeek && nthWeeks.length === 0) {
      showDialog("第何週かを1つ以上選択してください");
      return;
    }

    await onSave({
      name: name.trim(),
      color,
      icon,
      monthType,
      customMonths: monthType === "custom" ? customMonths : [],
      weekType: isNthWeek ? "nth" : "every",
      nthWeeks: isNthWeek ? nthWeeks : [],
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
              収集週（隔週・第N週） <span className={styles.requiredBadge}>必須</span>
            </label>
            <div className={styles.weekPatternGrid}>
              <button
                type="button"
                className={`${styles.segmentBtn} ${weekPattern === "every" ? styles.segmentBtnActive : ""}`}
                onClick={() => handleChangeWeekPattern("every")}
              >
                毎週
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${weekPattern === "biweekly13" ? styles.segmentBtnActive : ""}`}
                onClick={() => handleChangeWeekPattern("biweekly13")}
              >
                隔週 (第1・3週)
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${weekPattern === "biweekly24" ? styles.segmentBtnActive : ""}`}
                onClick={() => handleChangeWeekPattern("biweekly24")}
              >
                隔週 (第2・4週)
              </button>
              <button
                type="button"
                className={`${styles.segmentBtn} ${weekPattern === "customNth" ? styles.segmentBtnActive : ""}`}
                onClick={() => handleChangeWeekPattern("customNth")}
              >
                第N週 (自由指定)
              </button>
            </div>

            {/* 第N週（自由指定）が選ばれている場合の個別チェック */}
            {weekPattern === "customNth" && (
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
