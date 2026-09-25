"use client";

import { useState, useEffect, useRef } from "react";
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
import { uploadGarbageImage } from "../api/garbage-client-service";
import GarbageImageViewerModal from "./GarbageImageViewerModal";
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
  const [imageUrl, setImageUrl] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [isViewerOpen, setIsViewerOpen] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setImageUrl(schedule.imageUrl || "");
        setPreviewUrl(schedule.imageUrl || "");
        setSelectedFile(null);
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
        setImageUrl("");
        setPreviewUrl("");
        setSelectedFile(null);
      }
    }
  }, [isOpen, schedule]);

  // 画像ファイル選択
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showDialog("画像ファイル（JPEGやPNGなど）を選択してください");
      return;
    }

    // 15MB制限
    if (file.size > 15 * 1024 * 1024) {
      showDialog("画像サイズは15MB以下のものを選択してください");
      return;
    }

    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);
  };

  // 画像の削除
  const handleRemoveImage = () => {
    setSelectedFile(null);
    setPreviewUrl("");
    setImageUrl("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

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

    let finalImageUrl = imageUrl;
    if (selectedFile) {
      setIsUploading(true);
      try {
        finalImageUrl = await uploadGarbageImage(selectedFile);
      } catch (err) {
        console.error("Failed to upload image:", err);
        showDialog("画像のアップロード中に問題が発生しました。再度お試しください。");
        setIsUploading(false);
        return;
      } finally {
        setIsUploading(false);
      }
    } else if (!previewUrl) {
      finalImageUrl = "";
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
      imageUrl: finalImageUrl || undefined,
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

          {/* 出し方の画像・分別表 */}
          <div className={styles.formGroup}>
            <label className={styles.fieldLabel}>
              <i className="fa-regular fa-image" style={{ color: "#ff758c" }}></i>
              出し方の画像・分別表の写真（任意）
            </label>

            {/* 非表示のファイル入力 */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              onChange={handleFileChange}
              style={{ display: "none" }}
            />

            {previewUrl ? (
              <div className={styles.imagePreviewContainer}>
                <div
                  className={styles.imageThumbnailWrapper}
                  onClick={() => setIsViewerOpen(true)}
                  title="クリックして拡大表示"
                >
                  <img
                    src={previewUrl}
                    alt="ごみの出し方プレビュー"
                    className={styles.imageThumbnail}
                  />
                  <div className={styles.thumbnailOverlay}>
                    <i className="fa-solid fa-magnifying-glass-plus"></i>
                    <span>タップして拡大</span>
                  </div>
                </div>

                <div className={styles.imageActionButtons}>
                  <button
                    type="button"
                    className={styles.imageChangeBtn}
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSubmitting || isUploading}
                  >
                    <i className="fa-solid fa-camera"></i>
                    写真を変更
                  </button>
                  <button
                    type="button"
                    className={styles.imageDeleteBtn}
                    onClick={handleRemoveImage}
                    disabled={isSubmitting || isUploading}
                  >
                    <i className="fa-regular fa-trash-can"></i>
                    削除
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={styles.uploadDropZone}
                onClick={() => fileInputRef.current?.click()}
                disabled={isSubmitting || isUploading}
              >
                <div className={styles.uploadIconCircle}>
                  <i className="fa-solid fa-camera"></i>
                </div>
                <div className={styles.uploadTextGroup}>
                  <span className={styles.uploadMainText}>写真を選択または撮影する</span>
                  <span className={styles.uploadSubText}>
                    自治体の分別早見表や指定袋の写真を登録できます📷
                  </span>
                </div>
              </button>
            )}
          </div>

          {/* フッターアクション */}
          <div className={styles.modalFooter}>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.closeBtn}
                onClick={onClose}
                disabled={isSubmitting || isUploading}
              >
                キャンセル
              </button>
              <button
                type="submit"
                className={styles.saveBtn}
                disabled={isSubmitting || isUploading}
              >
                <i className="fa-solid fa-check"></i>
                {isUploading
                  ? "画像をアップロード中..."
                  : isSubmitting
                  ? "保存中..."
                  : schedule
                  ? "更新する"
                  : "追加する"}
              </button>
            </div>
            {schedule && onDelete && (
              <button
                type="button"
                className={styles.deleteBtn}
                onClick={handleDelete}
                disabled={isSubmitting || isUploading}
              >
                <i className="fa-solid fa-trash-can"></i>
                このルールを削除
              </button>
            )}
          </div>
        </form>
      </div>

      {/* 拡大画像ビューア */}
      <GarbageImageViewerModal
        isOpen={isViewerOpen}
        onClose={() => setIsViewerOpen(false)}
        imageUrl={previewUrl}
        title={`${name || "ごみ"} の出し方画像`}
        note={note}
        color={color}
      />
    </div>
  );
}
