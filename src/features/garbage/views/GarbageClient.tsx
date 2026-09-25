"use client";

import { useState, useEffect, useMemo } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { GarbageSchedule } from "@/src/lib/firestore/types";
import {
  getGarbageSchedules,
  addGarbageSchedule,
  updateGarbageSchedule,
  deleteGarbageSchedule,
} from "../api/garbage-client-service";
import {
  getGarbageForDate,
  getGarbageForMonth,
  formatScheduleRule,
} from "../lib/garbage-calculator";
import GarbageModal from "../components/GarbageModal";
import GarbageImageViewerModal from "../components/GarbageImageViewerModal";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import styles from "./Garbage.module.css";

interface GarbageClientProps {
  initialSchedules?: GarbageSchedule[];
}

export default function GarbageClient({ initialSchedules = [] }: GarbageClientProps) {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [schedules, setSchedules] = useState<GarbageSchedule[]>(initialSchedules);
  const [activeTab, setActiveTab] = useState<"calendar" | "rules">("calendar");

  // カレンダー用年月ステート（今月をデフォルト）
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, "0");
    const d = String(today.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, [today]);

  const [year, setYear] = useState<number>(today.getFullYear());
  const [month, setMonth] = useState<number>(today.getMonth() + 1); // 1〜12
  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);

  // モーダル管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<GarbageSchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 画像拡大ビューア管理
  const [viewingImage, setViewingImage] = useState<{
    imageUrl: string;
    title: string;
    note?: string;
    color?: string;
  } | null>(null);

  // パンくず設定
  useEffect(() => {
    setBreadcrumbs([{ title: "ごみカレンダー" }]);
  }, [setBreadcrumbs]);

  // 初回データ取得（initialSchedules が空の場合など）
  useEffect(() => {
    if (initialSchedules.length === 0) {
      loadSchedules();
    }
  }, []);

  const loadSchedules = async () => {
    showSpinner();
    try {
      const data = await getGarbageSchedules();
      setSchedules(data);
    } catch (e) {
      console.error("Failed to load garbage schedules:", e);
    } finally {
      hideSpinner();
    }
  };

  // 今日のごみ・明日のごみ
  const todayGarbage = useMemo(() => {
    return getGarbageForDate(schedules, today);
  }, [schedules, today]);

  const tomorrow = useMemo(() => {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  }, [today]);

  const tomorrowGarbage = useMemo(() => {
    return getGarbageForDate(schedules, tomorrow);
  }, [schedules, tomorrow]);

  // 当月のごみマッピング
  const monthGarbageMap = useMemo(() => {
    return getGarbageForMonth(schedules, year, month);
  }, [schedules, year, month]);

  // 選択日のごみ一覧
  const selectedDateGarbage = useMemo(() => {
    if (!selectedDateStr) return [];
    return monthGarbageMap[selectedDateStr] || [];
  }, [monthGarbageMap, selectedDateStr]);

  // カレンダーグリッドの日付セル配列を生成
  const calendarCells = useMemo(() => {
    const firstDayOfWeek = new Date(year, month - 1, 1).getDay(); // 0(日)〜6(土)
    const daysInMonth = new Date(year, month, 0).getDate();
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

    const cells: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      dayOfWeek: number;
      items: GarbageSchedule[];
    }[] = [];

    // 前月の余白
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = daysInPrevMonth - i;
      const prevM = month === 1 ? 12 : month - 1;
      const prevY = month === 1 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = new Date(prevY, prevM - 1, d).getDay();
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        dayOfWeek: dow,
        items: [],
      });
    }

    // 当月の日付
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = new Date(year, month - 1, d).getDay();
      const items = monthGarbageMap[dateStr] || [];
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        dayOfWeek: dow,
        items,
      });
    }

    // 翌月の余白（7の倍数になるまで埋める）
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dow = new Date(nextY, nextM - 1, d).getDay();
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        isSelected: dateStr === selectedDateStr,
        dayOfWeek: dow,
        items: [],
      });
    }

    return cells;
  }, [year, month, todayStr, selectedDateStr, monthGarbageMap]);

  // 月送り操作
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const handleCurrentMonth = () => {
    setYear(today.getFullYear());
    setMonth(today.getMonth() + 1);
    setSelectedDateStr(todayStr);
  };

  // モーダル操作
  const handleOpenAddModal = () => {
    setEditingSchedule(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (schedule: GarbageSchedule) => {
    setEditingSchedule(schedule);
    setIsModalOpen(true);
  };

  // 保存処理
  const handleSaveSchedule = async (
    data: Omit<GarbageSchedule, "id" | "uid" | "createdAt" | "updatedAt">
  ) => {
    if (!user) return;
    setIsSubmitting(true);
    showSpinner();
    try {
      if (editingSchedule) {
        await updateGarbageSchedule(editingSchedule.id, data);
        setSchedules((prev) =>
          prev.map((s) => (s.id === editingSchedule.id ? { ...s, ...data, updatedAt: Date.now() } : s))
        );
      } else {
        const docRef = await addGarbageSchedule(user.uid, data);
        const newSchedule: GarbageSchedule = {
          ...data,
          id: docRef.id,
          uid: user.uid,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setSchedules((prev) => [newSchedule, ...prev]);
      }
      setIsModalOpen(false);
      setEditingSchedule(null);
    } catch (e) {
      console.error("Save error:", e);
      showDialog("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
      hideSpinner();
    }
  };

  // 削除処理
  const handleDeleteSchedule = async (id: string) => {
    setIsSubmitting(true);
    showSpinner();
    try {
      await deleteGarbageSchedule(id);
      setSchedules((prev) => prev.filter((s) => s.id !== id));
      setIsModalOpen(false);
      setEditingSchedule(null);
    } catch (e) {
      console.error("Delete error:", e);
      showDialog("削除に失敗しました");
    } finally {
      setIsSubmitting(false);
      hideSpinner();
    }
  };

  return (
    <div className={styles.container}>
      {/* 画面ヘッダー */}
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>
          <i className={`fa-solid fa-trash-can ${styles.titleIcon}`}></i>
          ごみカレンダー
        </h1>
        <p className={styles.pageSubtitle}>2人の快適な毎日のためのごみ収集スケジュール🍬</p>
      </div>

      {/* トップサマリー（今日・明日のごみ出し） */}
      <div className={styles.todaySummaryGrid}>
        {/* 今日のごみ */}
        <div className={`${styles.summaryCard} ${styles.summaryCardToday}`}>
          <div className={styles.summaryCardHeader}>
            <span className={`${styles.summaryBadge} ${styles.summaryBadgeToday}`}>
              <i className="fa-regular fa-sun"></i> 今日のごみ
            </span>
            <span className={styles.summaryDateText}>
              {today.getMonth() + 1}/{today.getDate()} (
              {["日", "月", "火", "水", "木", "金", "土"][today.getDay()]})
            </span>
          </div>
          <div className={styles.summaryBody}>
            {todayGarbage.length > 0 ? (
              <div className={styles.garbageTagList}>
                {todayGarbage.map((g) => (
                  <div
                    key={g.id}
                    className={styles.garbageTagItem}
                    style={{ borderLeftColor: g.color }}
                  >
                    <div className={styles.garbageTagContent}>
                      <i
                        className={`fa-solid ${g.icon || "fa-trash-can"} ${styles.garbageTagIcon}`}
                        style={{ color: g.color }}
                      ></i>
                      <div className={styles.garbageTagTextGroup}>
                        <div className={styles.garbageTagName}>{g.name}</div>
                        {g.note && <div className={styles.garbageTagNote}>{g.note}</div>}
                      </div>
                    </div>

                    {g.imageUrl && (
                      <button
                        type="button"
                        className={styles.viewImageMiniBtn}
                        onClick={() =>
                          setViewingImage({
                            imageUrl: g.imageUrl!,
                            title: `${g.name}の出し方`,
                            note: g.note,
                            color: g.color,
                          })
                        }
                        title="出し方の写真を見る"
                        aria-label={`${g.name}の出し方写真を見る`}
                      >
                        <img src={g.imageUrl} alt="" className={styles.miniThumbnail} />
                        <span className={styles.viewImageMiniLabel}>
                          <i className="fa-solid fa-camera"></i>
                          写真
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyGarbageText}>
                <i className="fa-regular fa-circle-check"></i>
                今日出すごみはありません🍀
              </div>
            )}
          </div>
        </div>

        {/* 明日のごみ */}
        <div className={styles.summaryCard}>
          <div className={styles.summaryCardHeader}>
            <span className={`${styles.summaryBadge} ${styles.summaryBadgeTomorrow}`}>
              <i className="fa-regular fa-clock"></i> 明日のごみ
            </span>
            <span className={styles.summaryDateText}>
              {tomorrow.getMonth() + 1}/{tomorrow.getDate()} (
              {["日", "月", "火", "水", "木", "金", "土"][tomorrow.getDay()]})
            </span>
          </div>
          <div className={styles.summaryBody}>
            {tomorrowGarbage.length > 0 ? (
              <div className={styles.garbageTagList}>
                {tomorrowGarbage.map((g) => (
                  <div
                    key={g.id}
                    className={styles.garbageTagItem}
                    style={{ borderLeftColor: g.color }}
                  >
                    <div className={styles.garbageTagContent}>
                      <i
                        className={`fa-solid ${g.icon || "fa-trash-can"} ${styles.garbageTagIcon}`}
                        style={{ color: g.color }}
                      ></i>
                      <div className={styles.garbageTagTextGroup}>
                        <div className={styles.garbageTagName}>{g.name}</div>
                        {g.note && <div className={styles.garbageTagNote}>{g.note}</div>}
                      </div>
                    </div>

                    {g.imageUrl && (
                      <button
                        type="button"
                        className={styles.viewImageMiniBtn}
                        onClick={() =>
                          setViewingImage({
                            imageUrl: g.imageUrl!,
                            title: `${g.name}の出し方`,
                            note: g.note,
                            color: g.color,
                          })
                        }
                        title="出し方の写真を見る"
                        aria-label={`${g.name}の出し方写真を見る`}
                      >
                        <img src={g.imageUrl} alt="" className={styles.miniThumbnail} />
                        <span className={styles.viewImageMiniLabel}>
                          <i className="fa-solid fa-camera"></i>
                          写真
                        </span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.emptyGarbageText}>
                <i className="fa-regular fa-circle-check"></i>
                明日出すごみはありません✨
              </div>
            )}
          </div>
        </div>
      </div>

      {/* タブ切り替え & 追加ボタン */}
      <div className={styles.viewSwitchRow}>
        <div className={styles.tabSegment}>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "calendar" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("calendar")}
          >
            <i className="fa-regular fa-calendar-days"></i>
            カレンダー
          </button>
          <button
            type="button"
            className={`${styles.tabBtn} ${activeTab === "rules" ? styles.tabBtnActive : ""}`}
            onClick={() => setActiveTab("rules")}
          >
            <i className="fa-solid fa-list-check"></i>
            収集ルール一覧 ({schedules.length})
          </button>
        </div>

        <button type="button" className={styles.addRuleTopBtn} onClick={handleOpenAddModal}>
          <i className="fa-solid fa-plus"></i>
          ルールを追加
        </button>
      </div>

      {/* =========================================
          タブ1: カレンダー表示
          ========================================= */}
      {activeTab === "calendar" && (
        <>
          <div className={styles.calendarCard}>
            {/* 月ナビゲーション */}
            <div className={styles.calendarMonthHeader}>
              <button
                type="button"
                className={styles.monthNavBtn}
                onClick={handlePrevMonth}
                aria-label="前月"
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>

              <div className={styles.currentMonthTitle}>
                {year}年 {month}月
                {(year !== today.getFullYear() || month !== today.getMonth() + 1) && (
                  <button type="button" className={styles.todayQuickBtn} onClick={handleCurrentMonth}>
                    今月へ
                  </button>
                )}
              </div>

              <button
                type="button"
                className={styles.monthNavBtn}
                onClick={handleNextMonth}
                aria-label="翌月"
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </div>

            {/* 曜日ヘッダー */}
            <div className={styles.calendarWeekHeader}>
              <span className={styles.daySun}>日</span>
              <span>月</span>
              <span>火</span>
              <span>水</span>
              <span>木</span>
              <span>金</span>
              <span className={styles.daySat}>土</span>
            </div>

            {/* カレンダーグリッド */}
            <div className={styles.calendarGrid}>
              {calendarCells.map((cell, idx) => {
                const dayClass =
                  cell.dayOfWeek === 0 ? styles.daySun : cell.dayOfWeek === 6 ? styles.daySat : "";

                return (
                  <div
                    key={`${cell.dateStr}-${idx}`}
                    className={`${styles.calendarDayCell} ${
                      !cell.isCurrentMonth ? styles.cellOtherMonth : ""
                    } ${cell.isToday ? styles.cellToday : ""} ${
                      cell.isSelected ? styles.cellSelected : ""
                    }`}
                    onClick={() => {
                      if (cell.isCurrentMonth) {
                        setSelectedDateStr(cell.dateStr);
                      }
                    }}
                  >
                    <span
                      className={`${styles.dayNumber} ${dayClass} ${
                        cell.isToday ? styles.todayCircle : ""
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* ごみ種別イベントピル表示 */}
                    {cell.items.length > 0 && (
                      <div className={styles.badgeStack}>
                        {cell.items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className={styles.calendarGarbageBadge}
                            style={{ backgroundColor: item.color }}
                            title={`${item.name} (${item.note || ""})`}
                          >
                            <i className={`fa-solid ${item.icon || "fa-trash-can"} ${styles.badgeIcon}`}></i>
                            <span className={styles.badgeText}>
                              {item.name.split("（")[0].split("(")[0]}
                            </span>
                          </div>
                        ))}
                        {cell.items.length > 2 && (
                          <div
                            className={`${styles.calendarGarbageBadge} ${styles.calendarGarbageBadgeMore}`}
                          >
                            +{cell.items.length - 2}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 選択された日の詳細パネル */}
          {selectedDateStr && (
            <div className={styles.dayDetailCard}>
              <div className={styles.dayDetailHeader}>
                <div className={styles.dayDetailDate}>
                  <i className="fa-regular fa-calendar-check" style={{ color: "#ff758c" }}></i>
                  {selectedDateStr.replace(/-/g, "/")} のごみ収集
                </div>
              </div>

              {selectedDateGarbage.length > 0 ? (
                <div className={styles.dayDetailList}>
                  {selectedDateGarbage.map((item) => (
                    <div key={item.id} className={styles.dayDetailItem}>
                      <div
                        className={styles.dayDetailIconWrap}
                        style={{ backgroundColor: item.color }}
                      >
                        <i className={`fa-solid ${item.icon || "fa-trash-can"}`}></i>
                      </div>
                      <div className={styles.dayDetailContent}>
                        <h4 className={styles.dayDetailName}>{item.name}</h4>
                        {item.note && <p className={styles.dayDetailNote}>💡 {item.note}</p>}
                      </div>

                      {item.imageUrl && (
                        <button
                          type="button"
                          className={styles.dayDetailImageBtn}
                          onClick={() =>
                            setViewingImage({
                              imageUrl: item.imageUrl!,
                              title: `${item.name}の出し方`,
                              note: item.note,
                              color: item.color,
                            })
                          }
                          title="出し方の写真を見る"
                          aria-label={`${item.name}の出し方写真を見る`}
                        >
                          <img src={item.imageUrl} alt="" className={styles.detailThumbnail} />
                          <span className={styles.dayDetailImageBadge}>
                            <i className="fa-solid fa-camera"></i> 写真
                          </span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptyGarbageText}>
                  <i className="fa-regular fa-circle-check"></i>
                  この日はごみの収集予定がありません
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* =========================================
          タブ2: 収集ルール一覧
          ========================================= */}
      {activeTab === "rules" && (
        <div className={styles.ruleListContainer}>
          {schedules.length > 0 ? (
            schedules.map((schedule) => (
              <div key={schedule.id} className={styles.ruleCard}>
                <div className={styles.ruleLeft}>
                  <div
                    className={styles.ruleIconWrap}
                    style={{ backgroundColor: schedule.color }}
                  >
                    <i className={`fa-solid ${schedule.icon || "fa-trash-can"}`}></i>
                  </div>
                  <div className={styles.ruleInfo}>
                    <h3 className={styles.ruleName}>{schedule.name}</h3>
                    <div className={styles.ruleScheduleBadge}>
                      <i className="fa-regular fa-clock"></i>
                      {formatScheduleRule(schedule)}
                    </div>
                    {schedule.note && (
                      <div className={styles.ruleNoteText}>💡 {schedule.note}</div>
                    )}
                  </div>
                </div>

                <div className={styles.ruleRightActions}>
                  {schedule.imageUrl && (
                    <button
                      type="button"
                      className={styles.ruleImageBtn}
                      onClick={() =>
                        setViewingImage({
                          imageUrl: schedule.imageUrl!,
                          title: `${schedule.name}の出し方`,
                          note: schedule.note,
                          color: schedule.color,
                        })
                      }
                      title="出し方の写真を見る"
                    >
                      <img
                        src={schedule.imageUrl}
                        alt=""
                        className={styles.ruleThumbnail}
                      />
                      <span className={styles.ruleImageLabel}>
                        <i className="fa-solid fa-camera"></i> 写真
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.ruleEditBtn}
                    onClick={() => handleOpenEditModal(schedule)}
                  >
                    <i className="fa-solid fa-pen"></i>
                    編集
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyStateCard}>
              <i className={`fa-solid fa-trash-can ${styles.emptyStateIcon}`}></i>
              <h3 className={styles.emptyStateTitle}>ごみ出しルールが未登録です</h3>
              <p className={styles.emptyStateDesc}>
                お住まいの地域のごみ収集日（可燃ごみ、プラごみ、資源ごみなど）を登録して、2人で便利に確認しましょう！
              </p>
              <button
                type="button"
                className={styles.emptyStateBtn}
                onClick={handleOpenAddModal}
              >
                + はじめてのルールを追加
              </button>
            </div>
          )}
        </div>
      )}

      {/* ルール追加・編集モーダル */}
      <GarbageModal
        isOpen={isModalOpen}
        schedule={editingSchedule}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSchedule(null);
        }}
        onSave={handleSaveSchedule}
        onDelete={handleDeleteSchedule}
        isSubmitting={isSubmitting}
      />

      {/* 画像拡大ビューアモーダル */}
      <GarbageImageViewerModal
        isOpen={!!viewingImage}
        onClose={() => setViewingImage(null)}
        imageUrl={viewingImage?.imageUrl || ""}
        title={viewingImage?.title}
        note={viewingImage?.note}
        color={viewingImage?.color}
      />
    </div>
  );
}
