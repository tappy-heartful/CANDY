"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { CalendarEvent, Anniversary, Todo, User, Group, TodoStep } from "@/src/lib/firestore/types";
import { getEvents, getTodosForCalendar, addEvent, updateEvent, deleteEvent } from "@/src/features/calendar/api/calendar-client-service";
import { addTodo, updateTodo, getGroups } from "@/src/features/todo/api/todo-client-service";
import { getAnniversaries } from "@/src/features/anniversary/api/anniversary-client-service";
import { updateProfile } from "@/src/features/user/api/user-client-service";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import EventModal from "./EventModal";
import DailyAgendaModal from "./DailyAgendaModal";
import TodoModal from "@/src/features/todo/components/TodoModal";
import styles from "./Calendar.module.css";

interface CalendarViewProps {
  currentUserId: string;
  myNickname?: string;
  partnerNickname?: string;
  myPictureUrl?: string;
  partnerPictureUrl?: string;
  openDate?: string | null;
  onOpenDateClear?: () => void;
  userData?: User | null;
}

const padZero = (n: number) => n.toString().padStart(2, "0");

const getDaysDiff = (dateStr1: string, dateStr2: string): number => {
  const d1 = new Date(dateStr1);
  const d2 = new Date(dateStr2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
};

const shiftDateString = (dateStr: string, diffDays: number): string => {
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + diffDays);
  return `${date.getFullYear()}-${padZero(date.getMonth() + 1)}-${padZero(date.getDate())}`;
};

const generateRecurrenceDates = (
  startDate: string,
  config: {
    interval: number;
    unit: "day" | "week" | "month" | "year";
    monthlyOption?: "dayOfMonth" | "dayOfWeek";
    yearlyOption?: "dayOfYear" | "dayOfWeekOfYear";
    endDate: string;
  }
): string[] => {
  const dates: string[] = [startDate];
  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);
  const baseDate = new Date(startYear, startMonth - 1, startDay);
  
  const baseDayOfWeek = baseDate.getDay();
  const baseWeekNum = Math.ceil(startDay / 7);

  // 無限ループ防止用の最大件数リミット（最大1000件）
  const maxSafetyLimit = 1000;

  for (let i = 1; i < maxSafetyLimit; i++) {
    const nextDate = new Date(startYear, startMonth - 1, startDay);
    let nextDateStr = "";

    if (config.unit === "day") {
      nextDate.setDate(baseDate.getDate() + i * config.interval);
      nextDateStr = `${nextDate.getFullYear()}-${padZero(nextDate.getMonth() + 1)}-${padZero(nextDate.getDate())}`;
    } else if (config.unit === "week") {
      nextDate.setDate(baseDate.getDate() + i * config.interval * 7);
      nextDateStr = `${nextDate.getFullYear()}-${padZero(nextDate.getMonth() + 1)}-${padZero(nextDate.getDate())}`;
    } else if (config.unit === "month") {
      // Nヶ月進める
      const targetMonth = startMonth - 1 + i * config.interval;
      if (config.monthlyOption === "dayOfWeek") {
        // 毎月第X曜日
        const tempDate = new Date(startYear, targetMonth, 1);
        const firstDayOfWeek = tempDate.getDay();
        let firstTargetDay = 1 + (baseDayOfWeek - firstDayOfWeek);
        if (firstTargetDay <= 0) firstTargetDay += 7;
        const targetDay = firstTargetDay + (baseWeekNum - 1) * 7;
        const lastDayOfMonth = new Date(startYear, targetMonth + 1, 0).getDate();
        const finalDay = targetDay > lastDayOfMonth ? targetDay - 7 : targetDay;
        const finalDate = new Date(startYear, targetMonth, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      } else {
        // 毎月N日
        const lastDayOfMonth = new Date(startYear, targetMonth + 1, 0).getDate();
        const finalDay = startDay > lastDayOfMonth ? lastDayOfMonth : startDay;
        const finalDate = new Date(startYear, targetMonth, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      }
    } else if (config.unit === "year") {
      // N年進める
      const targetYear = startYear + i * config.interval;
      if (config.yearlyOption === "dayOfWeekOfYear") {
        // 毎年M月第X曜日
        const tempDate = new Date(targetYear, startMonth - 1, 1);
        const firstDayOfWeek = tempDate.getDay();
        let firstTargetDay = 1 + (baseDayOfWeek - firstDayOfWeek);
        if (firstTargetDay <= 0) firstTargetDay += 7;
        const targetDay = firstTargetDay + (baseWeekNum - 1) * 7;
        const lastDayOfMonth = new Date(targetYear, startMonth, 0).getDate();
        const finalDay = targetDay > lastDayOfMonth ? targetDay - 7 : targetDay;
        const finalDate = new Date(targetYear, startMonth - 1, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      } else {
        // 毎年M月N日
        const lastDayOfMonth = new Date(targetYear, startMonth, 0).getDate();
        const finalDay = startDay > lastDayOfMonth ? lastDayOfMonth : startDay;
        const finalDate = new Date(targetYear, startMonth - 1, finalDay);
        nextDateStr = `${finalDate.getFullYear()}-${padZero(finalDate.getMonth() + 1)}-${padZero(finalDate.getDate())}`;
      }
    }

    if (nextDateStr > config.endDate) {
      break;
    }
    dates.push(nextDateStr);
  }
  return dates;
};

export default function CalendarView({
  currentUserId,
  myNickname = "自分",
  partnerNickname = "パートナー",
  myPictureUrl,
  partnerPictureUrl,
  openDate,
  onOpenDateClear,
  userData,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const thisYear = today.getFullYear();
  const minYear = thisYear - 3;
  const maxYear = thisYear + 3;

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [todos, setTodos] = useState<any[]>([]); // will be typed as Todo[]
  const [anniversaries, setAnniversaries] = useState<Anniversary[]>([]);
  const [filterState, setFilterState] = useState({
    eventsCouple: true,
    eventsMe: true,
    eventsPartner: true,
    todosCouple: true,
    todosMe: true,
    todosPartner: true,
    todosShowUncompleted: true,
    todosShowCompleted: true,
  });
  const [activeModalEvent, setActiveModalEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false);
  const [activeTodoDate, setActiveTodoDate] = useState("");
  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [activeDateStr, setActiveDateStr] = useState<string>("");
  const [todoGroups, setTodoGroups] = useState<Group[]>([]);
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);
  const isSwipeCancelled = useRef<boolean>(false);

  // 月切り替え時のスライドアニメーション用ステート
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | "">("");
  const [animationKey, setAnimationKey] = useState(0);

  // 指追従スワイプ用ステート
  const [swipeX, setSwipeX] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // モード設定
  const [calendarMode, setCalendarMode] = useState<"grid" | "timeline">("grid");
  const [timelineMode, setTimelineMode] = useState<"list" | "columns">("list");
  const [dailyAgendaMode, setDailyAgendaMode] = useState<"list" | "timeline">("list");

  useEffect(() => {
    if (userData?.calendarMode) {
      setCalendarMode(userData.calendarMode);
    }
    if (userData?.timelineMode) {
      setTimelineMode(userData.timelineMode);
    }
    if (userData?.dailyAgendaMode) {
      setDailyAgendaMode(userData.dailyAgendaMode);
    }
  }, [userData]);

  const handleToggleMode = async (mode: "grid" | "timeline") => {
    setCalendarMode(mode);
    try {
      await updateProfile(currentUserId, { calendarMode: mode });
    } catch (e) {
      console.error("Failed to save calendar mode:", e);
    }
  };

  const handleToggleTimelineMode = async (mode: "list" | "columns") => {
    setTimelineMode(mode);
    try {
      await updateProfile(currentUserId, { timelineMode: mode });
    } catch (e) {
      console.error("Failed to save timeline mode:", e);
    }
  };

  const handleToggleDailyAgendaMode = async (mode: "list" | "timeline") => {
    setDailyAgendaMode(mode);
    try {
      await updateProfile(currentUserId, { dailyAgendaMode: mode });
    } catch (e) {
      console.error("Failed to save daily agenda mode:", e);
    }
  };

  const timelineScrollRef = useRef<HTMLDivElement>(null);
  const todayCardRef = useRef<HTMLDivElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // 今日を示すカードへ自動スクロール
  useEffect(() => {
    if (calendarMode === "timeline" && todayCardRef.current && timelineScrollRef.current) {
      const container = timelineScrollRef.current;
      const card = todayCardRef.current;
      const timer = setTimeout(() => {
        const scrollOffset = card.offsetLeft - (container.clientWidth / 2) + (card.clientWidth / 2);
        container.scrollLeft = scrollOffset;
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [calendarMode, currentMonth, currentYear, animationKey]);

  const [holidays, setHolidays] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("https://holidays-jp.github.io/api/v1/date.json")
      .then((res) => res.json())
      .then((data) => setHolidays(data))
      .catch((err) => console.error("Failed to fetch holidays:", err));
  }, []);

  // Fetch events and todos on mount
  useEffect(() => {
    showSpinner();
    Promise.all([
      getEvents(), 
      getTodosForCalendar(),
      getAnniversaries(currentUserId, partnerNickname !== "パートナー" ? "dummy" : null),
      getGroups("todo")
    ])
      .then(([eventData, todoData, annivData, groupData]) => {
        setEvents(eventData);
        setTodos(todoData);
        setAnniversaries(annivData);
        setTodoGroups(groupData);
      })
      .catch((e) => {
        console.error("Failed to load events/todos:", e);
        showDialog("データの読み込みに失敗しました");
      })
      .finally(() => {
        hideSpinner();
      });
  }, [currentUserId]);

  const visibleEvents = useMemo(() => {
    return events.filter((e) => {
      if (e.type === "couple") return filterState.eventsCouple;
      const isMe = e.uid === currentUserId;
      if (isMe) return filterState.eventsMe;
      return filterState.eventsPartner;
    });
  }, [events, filterState, currentUserId]);

  const visibleTodos = useMemo(() => {
    return todos.filter((t) => {
      if (t.isCompleted && !filterState.todosShowCompleted) return false;
      if (!t.isCompleted && !filterState.todosShowUncompleted) return false;

      if (t.type === "couple") return filterState.todosCouple;
      const isMe = t.uid === currentUserId;
      if (isMe) return filterState.todosMe;
      return filterState.todosPartner;
    });
  }, [todos, filterState, currentUserId]);

  useEffect(() => {
    if (openDate) {
      setActiveDateStr(openDate);
      setIsDailyAgendaOpen(true);
      const [y, m] = openDate.split("-").map(Number);
      if (!isNaN(y) && !isNaN(m)) {
        setCurrentYear(y);
        setCurrentMonth(m - 1);
      }
      if (onOpenDateClear) {
        onOpenDateClear();
      }
    }
  }, [openDate, onOpenDateClear]);

  const handlePrevMonth = () => {
    setSlideDirection("right");
    setAnimationKey((prev) => prev + 1);
    if (currentMonth === 0) {
      if (currentYear - 1 < minYear) return;
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    setSlideDirection("left");
    setAnimationKey((prev) => prev + 1);
    if (currentMonth === 11) {
      if (currentYear + 1 > maxYear) return;
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    const todayYear = today.getFullYear();
    const todayMonth = today.getMonth();

    if (todayYear > currentYear || (todayYear === currentYear && todayMonth > currentMonth)) {
      setSlideDirection("left");
    } else if (todayYear < currentYear || (todayYear === currentYear && todayMonth < currentMonth)) {
      setSlideDirection("right");
    } else {
      setSlideDirection("");
    }
    setAnimationKey((prev) => prev + 1);
    setCurrentYear(todayYear);
    setCurrentMonth(todayMonth);
  };

  // Helper date arithmetic
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay(); // 0 = Sun, 1 = Mon, etc.
  };

  // Generate 42 day cells
  const gridCells = useMemo(() => {
    const cells = [];
    const firstDayIndex = getFirstDayOfMonth(currentYear, currentMonth);
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);
    
    const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
    const daysInPrevMonth = getDaysInMonth(prevYear, prevMonth);

    // Padding previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      cells.push({
        dayNum: daysInPrevMonth - i,
        month: prevMonth,
        year: prevYear,
        isCurrentMonth: false,
      });
    }

    // Current month's days
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push({
        dayNum: i,
        month: currentMonth,
        year: currentYear,
        isCurrentMonth: true,
      });
    }

    // Padding next month's leading days to make a full 42 grid
    const remaining = 42 - cells.length;
    const nextMonth = currentMonth === 11 ? 0 : currentMonth + 1;
    const nextYear = currentMonth === 11 ? currentYear + 1 : currentYear;
    for (let i = 1; i <= remaining; i++) {
      cells.push({
        dayNum: i,
        month: nextMonth,
        year: nextYear,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [currentYear, currentMonth]);

  const renderTimelineItem = (item: any) => {
    const isMe = item.uid === currentUserId;
    const color = item.type === "couple" ? "#9B7CC3" : (item.uid === currentUserId ? "#F7A8C4" : "#A0E7D2");

    // Avatar structure matching DailyAgendaModal behavior but with timeline sizes
    const icon = item.type === "couple" ? (
      <div className={styles.timelineIconCol}>
        {myPictureUrl ? (
          <img src={myPictureUrl} alt="Me" className={styles.timelineMiniAvatar} />
        ) : (
          <span className={`${styles.timelineTextAvatar} ${styles.bgMe}`}>{myNickname[0]}</span>
        )}
        {partnerPictureUrl ? (
          <img src={partnerPictureUrl} alt="Partner" className={styles.timelineMiniAvatar} />
        ) : (
          <span className={`${styles.timelineTextAvatar} ${styles.bgPartner}`}>{partnerNickname[0]}</span>
        )}
      </div>
    ) : (item.uid === currentUserId ? (
      myPictureUrl ? (
        <img src={myPictureUrl} alt="Me" className={styles.timelineAvatar} />
      ) : (
        <span className={`${styles.timelineTextAvatar} ${styles.bgMe}`}>{myNickname[0]}</span>
      )
    ) : (
      partnerPictureUrl ? (
        <img src={partnerPictureUrl} alt="Partner" className={styles.timelineAvatar} />
      ) : (
        <span className={`${styles.timelineTextAvatar} ${styles.bgPartner}`}>{partnerNickname[0]}</span>
      )
    ));

    if (item.isTodo) {
      const isEditable = item.type === "couple" || item.uid === currentUserId;
      return (
        <div
          key={`todo-${item.id}`}
          className={styles.timelineRow}
          onClick={() => {
            if (isEditable) {
              handleEditTodo(item as unknown as Todo);
            }
          }}
          style={{ cursor: isEditable ? 'pointer' : 'default' }}
        >
          <div 
            className={styles.timelineTimeCol} 
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            onClick={(e) => {
              e.stopPropagation();
              handleToggleTodo(item.id, !!item.isCompleted);
            }}
          >
            <span className={styles.timelineTimeText} style={{ fontSize: '14px' }}>
              {item.isCompleted ? (
                <i className="fa-regular fa-square-check" style={{color: '#9B7CC3'}}></i>
              ) : (
                <i className="fa-regular fa-square" style={{color: '#ccc'}}></i>
              )}
            </span>
          </div>
          <div className={styles.timelineMainCol} style={{ borderLeftColor: color, opacity: item.isCompleted ? 0.4 : 1 }}>
            <div className={styles.timelineItemTitle} style={{ textDecoration: item.isCompleted ? 'line-through' : 'none' }}>
              <div className={styles.timelineIconCol} style={{ marginRight: '4px' }}>{icon}</div>
              <span className={styles.timelineItemText}>{item.title}</span>
            </div>
          </div>
        </div>
      );
    } else {
      return (
        <div 
          key={`event-${item.id}`} 
          className={styles.timelineRow} 
          onClick={() => handleEditEvent(item)} 
          style={{ alignItems: 'stretch', cursor: 'pointer' }}
        >
          <div className={styles.timelineTimeCol} style={{ justifyContent: 'center' }}>
            {item.isAllDay ? (
              <span className={styles.timelineTimeText}>終日</span>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '100%' }}>
                <span className={styles.timelineTimeText}>{item.startTime}</span>
                {item.endTime && <span className={styles.timelineTimeTextSub}>{item.endTime}</span>}
              </div>
            )}
          </div>
          <div className={styles.timelineMainCol} style={{ borderLeftColor: color }}>
            <div className={styles.timelineItemTitle}>
              <div className={styles.timelineIconCol} style={{ marginRight: '4px' }}>{icon}</div>
              <span className={styles.timelineItemText}>
                {item.isRecurring && <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '4px', fontSize: '10px', color: '#999' }}></i>}
                {item.title} {item.note && <i className="fa-regular fa-file-lines"></i>}
              </span>
            </div>
          </div>
        </div>
      );
    }
  };

  const timelineCellsData = useMemo(() => {
    const cells = [];
    const daysInMonth = getDaysInMonth(currentYear, currentMonth);

    let maxCouple = 0;
    let maxMe = 0;
    let maxPartner = 0;

    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${currentYear}-${padZero(currentMonth + 1)}-${padZero(i)}`;
      const dayEvents = visibleEvents.filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);
      const dayTodos = visibleTodos.filter((t) => t.date === dateStr);
      const mdStr = `${padZero(currentMonth + 1)}-${padZero(i)}`;
      const dayAnniversaries = anniversaries.filter((a) => a.date === mdStr);

      const combinedItems = [
        ...dayEvents.map(e => ({ ...e, isTodo: false })),
        ...dayTodos.map(t => ({ ...t, isTodo: true }))
      ];

      combinedItems.sort((a, b) => {
        const orderA = a.type === "couple" ? 0 : (a.uid === currentUserId ? 1 : 2);
        const orderB = b.type === "couple" ? 0 : (b.uid === currentUserId ? 1 : 2);
        if (orderA !== orderB) return orderA - orderB;

        if (a.isTodo !== b.isTodo) {
          return a.isTodo ? 1 : -1;
        }

        const aMulti = a.startDate !== a.endDate ? 1 : 0;
        const bMulti = b.startDate !== b.endDate ? 1 : 0;
        if (aMulti !== bMulti) return bMulti - aMulti;
        
        const aStart = a.startDate || a.date;
        const bStart = b.startDate || b.date;
        if (aStart !== bStart) return aStart.localeCompare(bStart);
        
        const aEnd = a.endDate || a.date;
        const bEnd = b.endDate || b.date;
        if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);

        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;

        if (a.startTime && b.startTime && a.startTime !== b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return a.title.localeCompare(b.title);
      });

      const coupleItems = combinedItems.filter(item => item.type === "couple");
      const meItems = combinedItems.filter(item => item.uid === currentUserId && item.type !== "couple");
      const partnerItems = combinedItems.filter(item => item.uid !== currentUserId && item.type !== "couple");

      maxCouple = Math.max(maxCouple, coupleItems.length);
      maxMe = Math.max(maxMe, meItems.length);
      maxPartner = Math.max(maxPartner, partnerItems.length);

      cells.push({
        dayNum: i,
        dateStr,
        dayAnniversaries,
        coupleItems,
        meItems,
        partnerItems,
        hasAnyItems: combinedItems.length > 0 || dayAnniversaries.length > 0
      });
    }
    return { cells, maxCouple, maxMe, maxPartner };
  }, [currentYear, currentMonth, visibleEvents, visibleTodos, anniversaries, currentUserId]);

  const processedWeeks = useMemo(() => {
    // 1. 各曜日のアイテムをまず解決する
    const allCellsData = gridCells.map((cell) => {
      const dateStr = `${cell.year}-${padZero(cell.month + 1)}-${padZero(cell.dayNum)}`;
      const dayEvents = visibleEvents.filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);
      const dayTodos = visibleTodos.filter((t) => t.date === dateStr);
      const mdStr = `${padZero(cell.month + 1)}-${padZero(cell.dayNum)}`;
      const dayAnniversaries = anniversaries.filter((a) => a.date === mdStr);

      const combinedItems = [
        ...dayEvents.map(e => ({ ...e, isTodo: false })),
        ...dayTodos.map(t => ({ ...t, isTodo: true }))
      ];

      combinedItems.sort((a, b) => {
        const orderA = a.type === "couple" ? 0 : (a.uid === currentUserId ? 1 : 2);
        const orderB = b.type === "couple" ? 0 : (b.uid === currentUserId ? 1 : 2);
        if (orderA !== orderB) return orderA - orderB;

        // 予定が上、TODOが下になるようにソート
        if (a.isTodo !== b.isTodo) {
          return a.isTodo ? 1 : -1;
        }

        const aMulti = a.startDate !== a.endDate ? 1 : 0;
        const bMulti = b.startDate !== b.endDate ? 1 : 0;
        if (aMulti !== bMulti) return bMulti - aMulti;
        
        const aStart = a.startDate || a.date;
        const bStart = b.startDate || b.date;
        if (aStart !== bStart) return aStart.localeCompare(bStart);
        
        const aEnd = a.endDate || a.date;
        const bEnd = b.endDate || b.date;
        if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);

        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;

        if (a.startTime && b.startTime && a.startTime !== b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        return a.title.localeCompare(b.title);
      });

      const coupleItems = combinedItems.filter(item => item.type === "couple");
      const meItems = combinedItems.filter(item => item.uid === currentUserId && item.type !== "couple");
      const partnerItems = combinedItems.filter(item => item.uid !== currentUserId && item.type !== "couple");

      return {
        cell,
        dateStr,
        dayAnniversaries,
        coupleItems,
        meItems,
        partnerItems,
      };
    });

    // 2. カレンダー全体の各グループの最大件数を算出する
    let globalMaxCouple = 0;
    let globalMaxMe = 0;
    let globalMaxPartner = 0;

    allCellsData.forEach((d) => {
      globalMaxCouple = Math.max(globalMaxCouple, d.coupleItems.length);
      globalMaxMe = Math.max(globalMaxMe, d.meItems.length);
      globalMaxPartner = Math.max(globalMaxPartner, d.partnerItems.length);
    });

    // 3. 週ごとに分割して返す
    const weeks = [];
    for (let w = 0; w < 6; w++) {
      const weekCells = [];
      for (let d = 0; d < 7; d++) {
        const cellData = allCellsData[w * 7 + d];
        if (cellData) {
          weekCells.push(cellData);
        }
      }
      weeks.push({
        cells: weekCells,
        maxCouple: globalMaxCouple,
        maxMe: globalMaxMe,
        maxPartner: globalMaxPartner,
      });
    }
    return weeks;
  }, [gridCells, visibleEvents, visibleTodos, anniversaries, currentUserId]);

  const renderPill = (item: any, dateStr: string, cellDayOfWeek: number) => {
    const isMe = item.uid === currentUserId;
    const isSolid = item.isAllDay || item.startDate !== item.endDate;

    let pillClass = "";
    if (item.isTodo) {
      if (item.type === "couple") {
        pillClass = styles.todoCouple;
      } else if (isMe) {
        pillClass = styles.todoMe;
      } else {
        pillClass = styles.todoPartner;
      }
    } else {
      if (item.type === "couple") {
        pillClass = isSolid ? styles.eventCouple : styles.eventCoupleLight;
      } else if (isMe) {
        pillClass = isSolid ? styles.eventMe : styles.eventMeLight;
      } else {
        pillClass = isSolid ? styles.eventPartner : styles.eventPartnerLight;
      }
    }

    if (item.isTodo) {
      const isCompleted = item.isCompleted;
      return (
        <span key={`todo-${item.id}`} className={`${styles.todoPill} ${pillClass} ${isCompleted ? styles.todoCompleted : ""}`}>
          <i className="fa-regular fa-square-check" style={{marginRight: '2px'}}></i>{item.title}
        </span>
      );
    }

    let spanClass = styles.eventPill;
    let titleStr = item.title;

    if (item.startDate !== item.endDate) {
      const connectsRight = dateStr < item.endDate && cellDayOfWeek !== 6;
      const connectsLeft = dateStr > item.startDate && cellDayOfWeek !== 0;

      if (connectsRight && connectsLeft) {
        spanClass = `${styles.eventPill} ${styles.eventMiddle}`;
        titleStr = "";
      } else if (connectsRight && !connectsLeft) {
        spanClass = `${styles.eventPill} ${styles.eventStart}`;
      } else if (!connectsRight && connectsLeft) {
        spanClass = `${styles.eventPill} ${styles.eventEnd}`;
        titleStr = "";
      }
    }

    return (
      <span
        key={`event-${item.id}`}
        className={`${spanClass} ${pillClass}`}
      >
        {titleStr && item.isRecurring && (
          <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '2px', fontSize: '9px' }}></i>
        )}
        {titleStr || "\u00A0"}
      </span>
    );
  };

  const handleCellClick = (dateStr: string) => {
    setActiveDateStr(dateStr);
    setIsDailyAgendaOpen(true);
  };

  const handleAddNewEvent = (dateStr: string) => {
    setActiveModalEvent({
      startDate: dateStr,
      endDate: dateStr,
      isAllDay: true,
      type: "couple",
    });
    setIsModalOpen(true);
  };

  const handleEditEvent = (eventItem: CalendarEvent) => {
    setActiveModalEvent(eventItem);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>, targetRange?: "only" | "all") => {
    showSpinner();
    try {
      if (activeModalEvent?.id) {
        // Edit Mode
        if (activeModalEvent.isRecurring && targetRange === "only") {
          // この予定のみ変更 -> 繰り返しから外して単体にする
          const updatedData = {
            ...eventData,
            isRecurring: false,
            recurrenceId: "",
          };
          await updateEvent(activeModalEvent.id, updatedData);
          setEvents((prev) =>
            prev.map((e) =>
              e.id === activeModalEvent.id ? ({ ...e, ...updatedData } as CalendarEvent) : e
            )
          );
        } else if (activeModalEvent.isRecurring && targetRange === "all" && activeModalEvent.recurrenceId) {
          // すべての繰り返し予定を一括変更
          const diffStart = getDaysDiff(activeModalEvent.startDate!, eventData.startDate || activeModalEvent.startDate!);
          const diffEnd = getDaysDiff(activeModalEvent.endDate!, eventData.endDate || activeModalEvent.endDate!);
          
          const recurringEvents = events.filter((e) => e.recurrenceId === activeModalEvent.recurrenceId);
          
          const updates = recurringEvents.map(async (e) => {
            const nextStartDate = shiftDateString(e.startDate, diffStart);
            const nextEndDate = shiftDateString(e.endDate, diffEnd);
            const dataToUpdate = {
              ...eventData,
              startDate: nextStartDate,
              endDate: nextEndDate,
            };
            await updateEvent(e.id, dataToUpdate);
            return { id: e.id, data: dataToUpdate };
          });
          
          const results = await Promise.all(updates);
          setEvents((prev) =>
            prev.map((e) => {
              const res = results.find((r) => r.id === e.id);
              return res ? ({ ...e, ...res.data } as CalendarEvent) : e;
            })
          );
        } else {
          // 通常の編集
          await updateEvent(activeModalEvent.id, eventData);
          setEvents((prev) =>
            prev.map((e) =>
              e.id === activeModalEvent.id ? ({ ...e, ...eventData } as CalendarEvent) : e
            )
          );
        }
      } else {
        // Create Mode
        const recurrenceConfig = (eventData as any).recurrenceConfig;
        if (eventData.isRecurring && recurrenceConfig) {
          // 繰り返し予定の生成登録
          const recId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
          const targetDates = generateRecurrenceDates(eventData.startDate!, recurrenceConfig);
          
          const baseData = { ...eventData };
          delete (baseData as any).recurrenceConfig;

          const creations = targetDates.map(async (d) => {
            const dateDiff = getDaysDiff(eventData.startDate!, d);
            const nextEndDate = shiftDateString(eventData.endDate!, dateDiff);
            const itemData = {
              ...baseData,
              startDate: d,
              endDate: nextEndDate,
              recurrenceId: recId,
              isRecurring: true,
            };
            const docRef = await addEvent(itemData);
            return {
              id: docRef.id,
              ...itemData,
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as CalendarEvent;
          });
          
          const addedEvents = await Promise.all(creations);
          setEvents((prev) => [...prev, ...addedEvents]);
        } else {
          // 通常登録
          const docRef = await addEvent(eventData);
          const newEventItem = {
            id: docRef.id,
            ...eventData,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as CalendarEvent;
          setEvents((prev) => [...prev, newEventItem]);
        }
      }
      setIsModalOpen(false);
      setActiveModalEvent(null);
    } catch (e) {
      console.error("Save error:", e);
      showDialog("予定の保存に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleDeleteEvent = async (id: string, targetRange?: "only" | "all") => {
    showSpinner();
    try {
      if (activeModalEvent?.isRecurring && targetRange === "all" && activeModalEvent.recurrenceId) {
        // すべて一括削除
        const recurringEvents = events.filter((e) => e.recurrenceId === activeModalEvent.recurrenceId);
        const deletions = recurringEvents.map((e) => deleteEvent(e.id));
        await Promise.all(deletions);
        setEvents((prev) => prev.filter((e) => e.recurrenceId !== activeModalEvent.recurrenceId));
      } else {
        // この予定のみ削除（通常削除）
        await deleteEvent(id);
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
      setIsModalOpen(false);
      setActiveModalEvent(null);
    } catch (e) {
      console.error("Delete error:", e);
      showDialog("予定の削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleToggleTodo = async (id: string, currentStatus: boolean) => {
    showSpinner();
    try {
      await updateTodo(id, { isCompleted: !currentStatus });
      setTodos((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isCompleted: !currentStatus } : t))
      );
    } catch (e) {
      console.error("Failed to toggle todo:", e);
      showDialog("TODOの更新に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleAddNewTodo = (dateStr: string) => {
    setActiveTodoDate(dateStr);
    setIsTodoModalOpen(true);
  };

  const handleEditTodo = (todoItem: Todo) => {
    setEditingTodo(todoItem);
    setIsDailyAgendaOpen(false);
    setIsTodoModalOpen(true);
  };

  const handleSaveTodo = async (data: {
    title: string;
    groupId: string;
    type: "personal" | "couple";
    date?: string;
    dateMode?: "due" | "on";
    dates?: { date: string; dateMode: "due" | "on" }[];
    steps?: TodoStep[];
  }) => {
    showSpinner();
    try {
      if (editingTodo) {
        await updateTodo(editingTodo.id, {
          title: data.title,
          groupId: data.groupId,
          date: data.date || "",
          dateMode: data.dateMode || "due",
          steps: data.steps || [],
        });
        setTodos((prev) =>
          prev.map((t) =>
            t.id === editingTodo.id
              ? {
                  ...t,
                  title: data.title,
                  groupId: data.groupId,
                  date: data.date || "",
                  dateMode: data.dateMode || "due",
                  steps: data.steps || [],
                }
              : t
          )
        );
      } else {
        const dates = data.dates || [{ date: data.date || "", dateMode: data.dateMode || "due" }];
        const addedTodos: Todo[] = [];
        for (const d of dates) {
          const docRef = await addTodo({
            title: data.title,
            type: data.type,
            uid: currentUserId,
            groupId: data.groupId,
            dateMode: d.dateMode,
            date: d.date,
            steps: data.steps || [],
          });
          addedTodos.push({
            id: docRef.id,
            title: data.title,
            type: data.type,
            uid: currentUserId,
            groupId: data.groupId,
            dateMode: d.dateMode,
            date: d.date,
            isCompleted: false,
            steps: data.steps || [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          } as Todo);
        }
        setTodos((prev) => [...addedTodos, ...prev]);
      }
      setIsTodoModalOpen(false);
      setEditingTodo(null);
    } catch (e) {
      console.error("Failed to save todo:", e);
      showDialog("TODOの保存に失敗しました");
    } finally {
      hideSpinner();
    }
  };



  const onTouchStart = (e: React.TouchEvent) => {
    if (calendarMode === "timeline") return;
    touchStartX.current = e.targetTouches[0].clientX;
    touchEndX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    touchEndY.current = e.targetTouches[0].clientY;
    isSwipeCancelled.current = false;
    setIsDragging(true);
    setSwipeX(0);
    setSlideDirection("");
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (calendarMode === "timeline" || touchStartX.current === null || isSwipeCancelled.current) return;
    touchEndX.current = e.targetTouches[0].clientX;
    touchEndY.current = e.targetTouches[0].clientY;

    const diffX = touchStartX.current - touchEndX.current;
    const diffY = (touchStartY.current ?? e.targetTouches[0].clientY) - touchEndY.current;

    // 縦スクロールの動きが横スワイプの動きより大きい、または縦スクロールが一定以上ならスワイプをキャンセル
    if (Math.abs(diffY) > Math.abs(diffX) && Math.abs(diffY) > 10) {
      isSwipeCancelled.current = true;
      setIsDragging(false);
      setSwipeX(0);
      return;
    }

    // デッドゾーン：横方向の移動が15px未満の場合は、カレンダーを動かさない（ガタつき防止）
    if (Math.abs(diffX) < 15) {
      setSwipeX(0);
    } else {
      // 15pxを超えたら、その分を差し引いて滑らかに追従させる
      const direction = diffX > 0 ? 1 : -1;
      setSwipeX(-(diffX - direction * 15));
    }
  };

  const onTouchEnd = () => {
    setIsDragging(false);

    if (touchStartX.current === null || touchEndX.current === null || isSwipeCancelled.current) {
      setSwipeX(0);
      touchStartX.current = null;
      touchEndX.current = null;
      touchStartY.current = null;
      touchEndY.current = null;
      isSwipeCancelled.current = false;
      return;
    }

    const diffX = touchStartX.current - touchEndX.current;
    const minSwipeDistance = 120; // 閾値を70から120に引き上げ

    if (diffX > minSwipeDistance) {
      // 左スワイプ（次の月へ）
      if (currentMonth === 11 && currentYear + 1 > maxYear) {
        setSwipeX(0);
      } else {
        setSlideDirection("left");
        setAnimationKey((prev) => prev + 1);
        if (currentMonth === 11) {
          setCurrentMonth(0);
          setCurrentYear((prev) => prev + 1);
        } else {
          setCurrentMonth((prev) => prev + 1);
        }
      }
    } else if (diffX < -minSwipeDistance) {
      // 右スワイプ（前の月へ）
      if (currentMonth === 0 && currentYear - 1 < minYear) {
        setSwipeX(0);
      } else {
        setSlideDirection("right");
        setAnimationKey((prev) => prev + 1);
        if (currentMonth === 0) {
          setCurrentMonth(11);
          setCurrentYear((prev) => prev - 1);
        } else {
          setCurrentMonth((prev) => prev - 1);
        }
      }
    } else {
      setSwipeX(0);
    }

    setSwipeX(0);
    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
    isSwipeCancelled.current = false;
  };

  return (
    <div 
      className={styles.calendarCard}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <div className={styles.controlsRow} style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', width: '40px' }}>予定:</span>
          <div className={styles.filterTabs}>
            <button
              className={`${styles.tab} ${filterState.eventsCouple ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, eventsCouple: !prev.eventsCouple }))}
            >
              2人
            </button>
            <button
              className={`${styles.tab} ${filterState.eventsMe ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, eventsMe: !prev.eventsMe }))}
            >
              {myNickname}
            </button>
            <button
              className={`${styles.tab} ${filterState.eventsPartner ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, eventsPartner: !prev.eventsPartner }))}
            >
              {partnerNickname}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold', color: '#666', width: '40px' }}>TODO:</span>
          <div className={styles.filterTabs}>
            <button
              className={`${styles.tab} ${filterState.todosCouple ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, todosCouple: !prev.todosCouple }))}
            >
              2人
            </button>
            <button
              className={`${styles.tab} ${filterState.todosMe ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, todosMe: !prev.todosMe }))}
            >
              {myNickname}
            </button>
            <button
              className={`${styles.tab} ${filterState.todosPartner ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, todosPartner: !prev.todosPartner }))}
            >
              {partnerNickname}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingLeft: '48px', marginTop: '-4px' }}>
          <div className={styles.filterTabs}>
            <button
              className={`${styles.tab} ${filterState.todosShowUncompleted ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, todosShowUncompleted: !prev.todosShowUncompleted }))}
            >
              未完了
            </button>
            <button
              className={`${styles.tab} ${filterState.todosShowCompleted ? styles.active : ""}`}
              onClick={() => setFilterState((prev) => ({ ...prev, todosShowCompleted: !prev.todosShowCompleted }))}
            >
              完了済み
            </button>
          </div>
        </div>
        {calendarMode === "timeline" && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingLeft: '48px', marginTop: '4px' }}>
            <div className={styles.filterTabs}>
              <button
                className={`${styles.tab} ${timelineMode === "list" ? styles.active : ""}`}
                onClick={() => handleToggleTimelineMode("list")}
              >
                リスト表示
              </button>
              <button
                className={`${styles.tab} ${timelineMode === "columns" ? styles.active : ""}`}
                onClick={() => handleToggleTimelineMode("columns")}
              >
                タイムライン表示
              </button>
            </div>
          </div>
        )}
      </div>

      <div className={styles.stickyHeader}>
        <div className={styles.calendarHeader}>
          <div className={styles.monthLabel}>
            <i className="fa-solid fa-calendar-alt" style={{ color: "#9B7CC3" }}></i>
            {currentYear}年{currentMonth + 1}月
          </div>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.toggleBtn} ${calendarMode === "grid" ? styles.activeToggle : ""}`}
              onClick={() => handleToggleMode("grid")}
              title="カレンダー表示"
            >
              <i className="fa-solid fa-calendar-days"></i>
            </button>
            <button
              className={`${styles.toggleBtn} ${calendarMode === "timeline" ? styles.activeToggle : ""}`}
              onClick={() => handleToggleMode("timeline")}
              title="タイムライン表示"
            >
              <i className="fa-solid fa-bars-staggered"></i>
            </button>
          </div>
          <div className={styles.headerBtns}>
            <button className={styles.todayBtn} onClick={handleGoToToday}>
              今日
            </button>
            <button className={styles.navBtn} onClick={handlePrevMonth} aria-label="前月">
              <i className="fa-solid fa-chevron-left"></i>
            </button>
            <button className={styles.navBtn} onClick={handleNextMonth} aria-label="次月">
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>
        </div>

        {calendarMode === "grid" && (
          <div className={styles.weekdaysHeader}>
            <div className={`${styles.weekday} ${styles.weekdaySunday}`}>日</div>
            <div className={styles.weekday}>月</div>
            <div className={styles.weekday}>火</div>
            <div className={styles.weekday}>水</div>
            <div className={styles.weekday}>木</div>
            <div className={styles.weekday}>金</div>
            <div className={`${styles.weekday} ${styles.weekdaySaturday}`}>土</div>
          </div>
        )}
      </div>

      {calendarMode === "grid" ? (
        <div className={styles.gridWrapper}>
          <div
            ref={gridContainerRef}
            key={`grid-${animationKey}`}
            className={`${styles.daysGrid} ${
              slideDirection === "left"
                ? styles.slideInLeft
                : slideDirection === "right"
                  ? styles.slideInRight
                  : ""
            }`}
            style={{
              transform: swipeX !== 0 ? `translateX(${swipeX}px)` : undefined,
              opacity: swipeX !== 0 
                ? Math.max(0.5, 1 - Math.abs(swipeX) / (gridContainerRef.current?.clientWidth || 350))
                : undefined,
              transition: isDragging ? "none" : "transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1)"
            }}
        >
          {processedWeeks.map((week, weekIdx) => {
            return week.cells.map((dayData, dayIdx) => {
              const { cell, dateStr, dayAnniversaries, coupleItems, meItems, partnerItems } = dayData;
              const idx = weekIdx * 7 + dayIdx;
              const cellDayOfWeek = idx % 7; // 0 = Sunday, 6 = Saturday
              const isHoliday = !!holidays[dateStr];

              const isToday =
                today.getDate() === cell.dayNum &&
                today.getMonth() === cell.month &&
                today.getFullYear() === cell.year;

              const showDivider1 = week.maxCouple > 0 && week.maxMe > 0;
              const showDivider2 = (week.maxCouple > 0 || week.maxMe > 0) && week.maxPartner > 0;

              return (
                <div
                  key={`${cell.year}-${cell.month}-${cell.dayNum}-${idx}`}
                  className={`${styles.dayCell} ${!cell.isCurrentMonth ? styles.otherMonthDay : ""}`}
                  onClick={() => handleCellClick(dateStr)}
                >
                  <div className={styles.dayHeader}>
                    <span
                      className={`${styles.dayNumber} ${
                        isToday
                          ? styles.todayCircle
                          : (cellDayOfWeek === 0 || isHoliday)
                            ? styles.sundayNumber
                            : cellDayOfWeek === 6
                              ? styles.saturdayNumber
                              : ""
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                  </div>
                  <div className={styles.eventsContainer}>
                    {dayAnniversaries.map((a) => (
                      <div key={a.id} className={styles.eventPill} style={{ background: '#f3e5f5', color: '#9B7CC3', border: '1px solid #9B7CC3', fontWeight: 'bold' }}>
                        🎂 {a.title}
                      </div>
                    ))}

                    {/* 1. 2人の予定グループ */}
                    {coupleItems.map((item) => renderPill(item, dateStr, cellDayOfWeek))}
                    {Array.from({ length: week.maxCouple - coupleItems.length }).map((_, i) => (
                      <div key={`place-couple-${i}`} style={{ height: '14px' }} />
                    ))}

                    {/* 境界線1 */}
                    {showDivider1 && <div className={styles.groupDivider} />}

                    {/* 2. 自分の予定グループ */}
                    {meItems.map((item) => renderPill(item, dateStr, cellDayOfWeek))}
                    {Array.from({ length: week.maxMe - meItems.length }).map((_, i) => (
                      <div key={`place-me-${i}`} style={{ height: '14px' }} />
                    ))}

                    {/* 境界線2 */}
                    {showDivider2 && <div className={styles.groupDivider} />}

                    {/* 3. パートナーの予定グループ */}
                    {partnerItems.map((item) => renderPill(item, dateStr, cellDayOfWeek))}
                    {Array.from({ length: week.maxPartner - partnerItems.length }).map((_, i) => (
                      <div key={`place-partner-${i}`} style={{ height: '14px' }} />
                    ))}
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
    ) : (
        <div
          ref={timelineScrollRef}
          key={`timeline-${animationKey}`}
          className={`${styles.timelineContainer} ${
            slideDirection === "left"
              ? styles.slideInLeft
              : slideDirection === "right"
                ? styles.slideInRight
                : ""
          }`}
        >
          {timelineCellsData.cells.map((dayData) => {
            const { dayNum, dateStr, dayAnniversaries, coupleItems, meItems, partnerItems, hasAnyItems } = dayData;
            const dateObj = new Date(currentYear, currentMonth, dayNum);
            const dayOfWeek = dateObj.getDay();
            const isHoliday = !!holidays[dateStr];
            const isToday =
              today.getDate() === dayNum &&
              today.getMonth() === currentMonth &&
              today.getFullYear() === currentYear;

            const dayName = ["日", "月", "火", "水", "木", "金", "土"][dayOfWeek];

            const hasCouple = coupleItems.length > 0 || dayAnniversaries.length > 0;
            const showMe = meItems.length > 0 || hasCouple;
            const showPartner = partnerItems.length > 0 || hasCouple;
            const colCount = (showMe ? 1 : 0) + (showPartner ? 1 : 0);
            const isColumnMode = timelineMode === "columns" && hasAnyItems;

            // 各カードのタイムテーブルデータを構築
            const cardTimetableData = (() => {
              const timeEvents = [
                ...coupleItems.filter(e => !e.isTodo && !e.isAllDay && e.startTime),
                ...meItems.filter(e => !e.isTodo && !e.isAllDay && e.startTime),
                ...partnerItems.filter(e => !e.isTodo && !e.isAllDay && e.startTime)
              ];

              const specialItems = {
                anniversary: dayAnniversaries.map(a => ({
                  ...a,
                  isAnniversary: true,
                  isTodo: false,
                  title: `🎂 ${a.title}`,
                  type: 'couple'
                })),
                allDay: [
                  ...coupleItems.filter(e => !e.isTodo && e.isAllDay),
                  ...meItems.filter(e => !e.isTodo && e.isAllDay),
                  ...partnerItems.filter(e => !e.isTodo && e.isAllDay)
                ],
                todo: [
                  ...coupleItems.filter(e => e.isTodo),
                  ...meItems.filter(e => e.isTodo),
                  ...partnerItems.filter(e => e.isTodo)
                ],
                noTime: [
                  ...coupleItems.filter(e => !e.isTodo && !e.isAllDay && !e.startTime),
                  ...meItems.filter(e => !e.isTodo && !e.isAllDay && !e.startTime),
                  ...partnerItems.filter(e => !e.isTodo && !e.isAllDay && !e.startTime)
                ]
              };

              const addOneHour = (timeStr: string): string => {
                const [h, m] = timeStr.split(':').map(Number);
                const nextH = (h + 1) % 24;
                return `${nextH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
              };
              const getNormalizedEndTime = (item: any) => {
                if (item.endTime) return item.endTime;
                return addOneHour(item.startTime);
              };

              const timePointsSet = new Set<string>();
              timeEvents.forEach(item => {
                timePointsSet.add(item.startTime);
                timePointsSet.add(getNormalizedEndTime(item));
              });
              const timePoints = Array.from(timePointsSet).sort((a, b) => a.localeCompare(b));

              if (timeEvents.length > 0 && timePoints.length < 2) {
                timePoints.push(addOneHour(timePoints[0]));
              }

              const slots: { start: string; end: string }[] = [];
              for (let i = 0; i < timePoints.length - 1; i++) {
                slots.push({ start: timePoints[i], end: timePoints[i+1] });
              }

              let currentRow = 2;
              const rowMap: Record<string, number> = {};

              if (specialItems.anniversary.length > 0) {
                rowMap.anniversary = currentRow++;
              }
              if (specialItems.allDay.length > 0) {
                rowMap.allDay = currentRow++;
              }
              if (specialItems.todo.length > 0) {
                rowMap.todo = currentRow++;
              }
              if (specialItems.noTime.length > 0) {
                rowMap.noTime = currentRow++;
              }

              const hasSpecialRows = !!(rowMap.anniversary || rowMap.allDay || rowMap.todo || rowMap.noTime);
              if (hasSpecialRows && slots.length > 0) {
                rowMap.divider = currentRow++;
              }

              rowMap.slotsStart = currentRow;
              const totalRows = currentRow + slots.length - 1;

              return {
                slots,
                timePoints,
                rowMap,
                totalRows,
                timeEvents,
                specialItems,
                getNormalizedEndTime
              };
            })();

            const renderTimetableMiniCard = (item: any, additionalStyle?: React.CSSProperties) => {
              if (item.isAnniversary) {
                return (
                  <div 
                    key={`anniv-mini-${item.id}`} 
                    className={styles.timelineTimetableCard} 
                    style={{ 
                      background: '#f5f0fa', 
                      border: '1px solid #9B7CC3', 
                      color: '#7a5ba0',
                      ...additionalStyle
                    }} 
                    title={item.title}
                  >
                    <span className={styles.timetableCardTitle}>{item.title}</span>
                  </div>
                );
              }

              const isEditable = item.type === "couple" || item.uid === currentUserId;
              if (item.isTodo) {
                const color = item.type === "couple" ? "#9B7CC3" : (item.uid === currentUserId ? "#F7A8C4" : "#A0E7D2");
                return (
                  <div 
                    key={`todo-mini-${item.id}`} 
                    className={styles.timelineTimetableCard} 
                    style={{ 
                      background: 'white',
                      border: `1.5px solid ${color}`, 
                      color: '#333',
                      opacity: item.isCompleted ? 0.4 : 1,
                      cursor: isEditable ? 'pointer' : 'default',
                      ...additionalStyle
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isEditable) handleEditTodo(item as unknown as Todo);
                    }}
                    title={item.title}
                  >
                    <span className={styles.timetableCardTitle} style={{ textDecoration: item.isCompleted ? 'line-through' : 'none' }}>
                      {item.title}
                    </span>
                  </div>
                );
              }

              const color = item.type === "couple" ? "#9B7CC3" : (item.uid === currentUserId ? "#F7A8C4" : "#A0E7D2");
              const bgColor = item.type === "couple" ? "#f5f0fa" : (item.uid === currentUserId ? "#fdf2f8" : "#ebfcf7");
              const textColor = item.type === "couple" ? "#7a5ba0" : (item.uid === currentUserId ? "#d15c85" : "#166534");
              return (
                <div 
                  key={`event-mini-${item.id}`} 
                  className={styles.timelineTimetableCard} 
                  style={{ 
                    background: bgColor, 
                    color: textColor,
                    border: `1px solid ${color}`,
                    cursor: 'pointer',
                    ...additionalStyle
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleEditEvent(item);
                  }}
                  title={item.title}
                >
                  <span className={styles.timetableCardTitle}>{item.title}</span>
                </div>
              );
            };

            const gridRowsStyle = (() => {
              const rows: string[] = ["auto"]; // 行1はヘッダー
              for (let r = 2; r <= cardTimetableData.totalRows; r++) {
                if (cardTimetableData.rowMap.divider && r === cardTimetableData.rowMap.divider) {
                  rows.push("auto");
                } else {
                  rows.push("minmax(36px, auto)");
                }
              }
              return rows.join(" ");
            })();

            return (
              <div
                key={`timeline-${dateStr}`}
                ref={isToday ? todayCardRef : null}
                className={`${styles.timelineCard} ${isToday ? styles.timelineTodayCard : ""}`}
                style={isColumnMode ? { flex: `0 0 ${Math.max(180, 50 + colCount * 85)}px` } : undefined}
              >
                <div className={styles.timelineCardHeader}>
                  <span className={`${styles.timelineDateNum} ${isToday ? styles.timelineTodayCircle : ""}`}>
                    {dayNum}
                  </span>
                  <span className={`${styles.timelineDayName} ${
                    dayOfWeek === 0 || isHoliday
                      ? styles.sundayNumber
                      : dayOfWeek === 6
                        ? styles.saturdayNumber
                        : ""
                  }`}>
                    ({dayName})
                  </span>
                  {isToday && <span className={styles.todayLabel}>今日</span>}
                </div>

                {isColumnMode ? (
                  <div className={styles.timelineTimetableWrapper}>
                    <div 
                      className={styles.timelineTimetableGrid} 
                      style={{ 
                        display: 'grid',
                        gridTemplateColumns: `40px ${colCount === 2 ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)'}`,
                        gridTemplateRows: gridRowsStyle,
                        gap: '4px',
                        width: '100%'
                      }}
                    >
                      {/* ヘッダー */}
                      <div className={styles.timelineTableHeaderCell} style={{ gridRow: 1, gridColumn: 1, visibility: 'hidden' }}>時間</div>
                      {showMe && <div className={styles.timelineTableHeaderCell} style={{ gridRow: 1, gridColumn: 2 }}>自分</div>}
                      {showPartner && <div className={styles.timelineTableHeaderCell} style={{ gridRow: 1, gridColumn: colCount === 2 ? 3 : 2 }}>{partnerNickname}</div>}

                      {/* 区切り線 */}
                      {cardTimetableData.rowMap.divider && (
                        <div 
                          style={{ 
                            gridRow: cardTimetableData.rowMap.divider, 
                            gridColumn: '1 / -1', 
                            borderTop: '1.5px dashed #e8e5ed', 
                            margin: '4px 0',
                            height: '0' 
                          }} 
                        />
                      )}

                      {/* 記念日行 */}
                      {cardTimetableData.rowMap.anniversary && (
                        <>
                          <div className={styles.timelineTimeCell} style={{ gridRow: cardTimetableData.rowMap.anniversary, gridColumn: 1 }}>
                            <span>記念日</span>
                          </div>
                          <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.anniversary, gridColumn: colCount === 2 ? '2 / 4' : 2 }}>
                            {cardTimetableData.specialItems.anniversary.map(item => renderTimetableMiniCard(item))}
                          </div>
                        </>
                      )}

                      {/* 終日行 */}
                      {cardTimetableData.rowMap.allDay && (() => {
                        const couple = cardTimetableData.specialItems.allDay.filter(item => item.type === 'couple');
                        const me = cardTimetableData.specialItems.allDay.filter(item => item.uid === currentUserId && item.type !== 'couple');
                        const partner = cardTimetableData.specialItems.allDay.filter(item => item.uid !== currentUserId && item.type !== 'couple');
                        return (
                          <>
                            <div className={styles.timelineTimeCell} style={{ gridRow: cardTimetableData.rowMap.allDay, gridColumn: 1 }}>
                              <span>終日</span>
                            </div>
                            {colCount === 2 && couple.length > 0 && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.allDay, gridColumn: '2 / 4' }}>
                                {couple.map(item => renderTimetableMiniCard(item))}
                              </div>
                            )}
                            {showMe && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.allDay, gridColumn: 2 }}>
                                {me.length > 0 ? (
                                  me.map(item => renderTimetableMiniCard(item))
                                ) : (
                                  colCount === 2 && couple.length === 0 ? <div className={styles.timelineEmptyCell} /> : null
                                )}
                              </div>
                            )}
                            {showPartner && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.allDay, gridColumn: colCount === 2 ? 3 : 2 }}>
                                {partner.length > 0 ? (
                                  partner.map(item => renderTimetableMiniCard(item))
                                ) : (
                                  colCount === 2 && couple.length === 0 ? <div className={styles.timelineEmptyCell} /> : null
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* TODO行 */}
                      {cardTimetableData.rowMap.todo && (() => {
                        const couple = cardTimetableData.specialItems.todo.filter(item => item.type === 'couple');
                        const me = cardTimetableData.specialItems.todo.filter(item => item.uid === currentUserId && item.type !== 'couple');
                        const partner = cardTimetableData.specialItems.todo.filter(item => item.uid !== currentUserId && item.type !== 'couple');
                        return (
                          <>
                            <div className={styles.timelineTimeCell} style={{ gridRow: cardTimetableData.rowMap.todo, gridColumn: 1 }}>
                              <span>TODO</span>
                            </div>
                            {colCount === 2 && couple.length > 0 && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.todo, gridColumn: '2 / 4' }}>
                                {couple.map(item => renderTimetableMiniCard(item))}
                              </div>
                            )}
                            {showMe && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.todo, gridColumn: 2 }}>
                                {me.length > 0 ? (
                                  me.map(item => renderTimetableMiniCard(item))
                                ) : (
                                  colCount === 2 && couple.length === 0 ? <div className={styles.timelineEmptyCell} /> : null
                                )}
                              </div>
                            )}
                            {showPartner && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.todo, gridColumn: colCount === 2 ? 3 : 2 }}>
                                {partner.length > 0 ? (
                                  partner.map(item => renderTimetableMiniCard(item))
                                ) : (
                                  colCount === 2 && couple.length === 0 ? <div className={styles.timelineEmptyCell} /> : null
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* 時間未定行 */}
                      {cardTimetableData.rowMap.noTime && (() => {
                        const couple = cardTimetableData.specialItems.noTime.filter(item => item.type === 'couple');
                        const me = cardTimetableData.specialItems.noTime.filter(item => item.uid === currentUserId && item.type !== 'couple');
                        const partner = cardTimetableData.specialItems.noTime.filter(item => item.uid !== currentUserId && item.type !== 'couple');
                        return (
                          <>
                            <div className={styles.timelineTimeCell} style={{ gridRow: cardTimetableData.rowMap.noTime, gridColumn: 1 }}>
                              <span>未定</span>
                            </div>
                            {colCount === 2 && couple.length > 0 && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.noTime, gridColumn: '2 / 4' }}>
                                {couple.map(item => renderTimetableMiniCard(item))}
                              </div>
                            )}
                            {showMe && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.noTime, gridColumn: 2 }}>
                                {me.length > 0 ? (
                                  me.map(item => renderTimetableMiniCard(item))
                                ) : (
                                  colCount === 2 && couple.length === 0 ? <div className={styles.timelineEmptyCell} /> : null
                                )}
                              </div>
                            )}
                            {showPartner && (
                              <div className={styles.timelineItemCell} style={{ gridRow: cardTimetableData.rowMap.noTime, gridColumn: colCount === 2 ? 3 : 2 }}>
                                {partner.length > 0 ? (
                                  partner.map(item => renderTimetableMiniCard(item))
                                ) : (
                                  colCount === 2 && couple.length === 0 ? <div className={styles.timelineEmptyCell} /> : null
                                )}
                              </div>
                            )}
                          </>
                        );
                      })()}

                      {/* 時間スロットのラベル（目盛り表示） */}
                      {cardTimetableData.timePoints.map((tp, i) => {
                        const isLast = i === cardTimetableData.timePoints.length - 1;
                        const gridRow = isLast ? cardTimetableData.rowMap.slotsStart! + i - 1 : cardTimetableData.rowMap.slotsStart! + i;
                        return (
                          <div 
                            key={`time-tick-mini-${i}`} 
                            className={styles.timelineTimeCell} 
                            style={{ 
                              gridRow, 
                              gridColumn: 1,
                              background: 'none',
                              border: 'none',
                              height: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              justifyContent: isLast ? 'flex-end' : 'flex-start',
                              alignItems: 'center',
                              padding: isLast ? '0 0 1px 0' : '1px 0 0 0',
                              minHeight: 'auto'
                            }}
                          >
                            <span style={{ fontSize: '9px', color: '#888', fontWeight: 'bold' }}>{tp}</span>
                          </div>
                        );
                      })}

                      {/* 時間指定予定カード */}
                      {cardTimetableData.timeEvents.map(item => {
                        const startIdx = cardTimetableData.rowMap.slotsStart! + cardTimetableData.timePoints.indexOf(item.startTime);
                        const endIdx = cardTimetableData.rowMap.slotsStart! + cardTimetableData.timePoints.indexOf(cardTimetableData.getNormalizedEndTime(item));
                        
                        let col = 2;
                        if (colCount === 2) {
                          if (item.type === 'couple') {
                            col = 2;
                          } else if (item.uid === currentUserId) {
                            col = 2;
                          } else {
                            col = 3;
                          }
                        }
                        
                        const isCoupleEvent = item.type === 'couple';
                        
                        return (
                          <div 
                            key={`time-event-mini-${item.id}`} 
                            className={styles.timelineItemCell} 
                            style={{ 
                              gridRow: `${startIdx} / ${endIdx}`, 
                              gridColumn: (colCount === 2 && isCoupleEvent) ? '2 / 4' : col,
                              zIndex: isCoupleEvent ? 2 : 1,
                              height: '100%',
                              justifyContent: 'stretch'
                            }}
                          >
                            {renderTimetableMiniCard(item, { height: '100%', display: 'flex', alignItems: 'center' })}
                          </div>
                        );
                      })}

                      {/* 時間枠用の空セル */}
                      {cardTimetableData.slots.map((slot, i) => {
                        const gridRow = cardTimetableData.rowMap.slotsStart! + i;
                        
                        const hasCoupleInSlot = cardTimetableData.timeEvents.some(item => 
                          item.type === 'couple' && 
                          item.startTime < slot.end && 
                          cardTimetableData.getNormalizedEndTime(item) > slot.start
                        );
                        const hasMeInSlot = cardTimetableData.timeEvents.some(item => 
                          item.uid === currentUserId && 
                          item.type !== 'couple' && 
                          item.startTime < slot.end && 
                          cardTimetableData.getNormalizedEndTime(item) > slot.start
                        );
                        const hasPartnerInSlot = cardTimetableData.timeEvents.some(item => 
                          item.uid !== currentUserId && 
                          item.type !== 'couple' && 
                          item.startTime < slot.end && 
                          cardTimetableData.getNormalizedEndTime(item) > slot.start
                        );

                        return (
                          <React.Fragment key={`empty-cells-${i}`}>
                            {showMe && !hasCoupleInSlot && !hasMeInSlot && (
                              <div className={styles.timelineEmptyCell} style={{ gridRow, gridColumn: 2, height: '100%' }} />
                            )}
                            {showPartner && !hasCoupleInSlot && !hasPartnerInSlot && (
                              <div className={styles.timelineEmptyCell} style={{ gridRow, gridColumn: colCount === 2 ? 3 : 2, height: '100%' }} />
                            )}
                          </React.Fragment>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className={styles.timelineItemsContainer}>
                    {dayAnniversaries.map((a) => (
                      <div key={a.id} className={styles.timelineAnniversary}>
                        🎂 {a.title}
                      </div>
                    ))}
                    {!hasAnyItems ? (
                      <div className={styles.timelineNoItems}>予定なし</div>
                    ) : (
                      <>
                        {/* 1. 2人の予定グループ */}
                        {coupleItems.map((item) => renderTimelineItem(item))}
                        {Array.from({ length: timelineCellsData.maxCouple - coupleItems.length }).map((_, i) => (
                          <div key={`timeline-place-couple-${i}`} className={styles.timelinePlaceholder} />
                        ))}

                        {/* 境界線1 */}
                        <div className={styles.timelineGroupDivider} />

                        {/* 2. 自分の予定グループ */}
                        {meItems.map((item) => renderTimelineItem(item))}
                        {Array.from({ length: timelineCellsData.maxMe - meItems.length }).map((_, i) => (
                          <div key={`timeline-place-me-${i}`} className={styles.timelinePlaceholder} />
                        ))}

                        {/* 境界線2 */}
                        <div className={styles.timelineGroupDivider} />

                        {/* 3. パートナーの予定グループ */}
                        {partnerItems.map((item) => renderTimelineItem(item))}
                        {Array.from({ length: timelineCellsData.maxPartner - partnerItems.length }).map((_, i) => (
                          <div key={`timeline-place-partner-${i}`} className={styles.timelinePlaceholder} />
                        ))}
                      </>
                    )}
                  </div>
                )}

                <div className={styles.timelineCardFooter} style={{ display: 'flex', gap: '6px', width: '100%' }}>
                  <button
                    className={styles.timelineAddBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddNewEvent(dateStr);
                    }}
                    title="予定を追加"
                    style={{ flex: 1, padding: '6px 2px', fontSize: '10px' }}
                  >
                    <i className="fa-solid fa-calendar-plus"></i> 予定
                  </button>
                  <button
                    className={styles.timelineAddBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddNewTodo(dateStr);
                    }}
                    title="TODOを追加"
                    style={{ flex: 1, padding: '6px 2px', fontSize: '10px', background: '#e8f5e9', borderColor: '#4caf50', color: '#4caf50' }}
                  >
                    <i className="fa-solid fa-list-check"></i> TODO
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isDailyAgendaOpen && (
        <DailyAgendaModal
          activeDateStr={activeDateStr}
          events={visibleEvents.filter((e) => activeDateStr >= e.startDate && activeDateStr <= e.endDate)}
          todos={visibleTodos.filter((t) => t.date === activeDateStr)}
          anniversaries={anniversaries.filter((a) => a.date === activeDateStr.slice(5))}
          currentUserId={currentUserId}
          myNickname={myNickname}
          partnerNickname={partnerNickname}
          myPictureUrl={myPictureUrl}
          partnerPictureUrl={partnerPictureUrl}
          onClose={() => setIsDailyAgendaOpen(false)}
          onAddEvent={handleAddNewEvent}
          onEditEvent={handleEditEvent}
          onToggleTodo={handleToggleTodo}
          onAddTodo={handleAddNewTodo}
          onEditTodo={handleEditTodo}
          defaultDisplayMode={dailyAgendaMode}
          onChangeDisplayMode={handleToggleDailyAgendaMode}
        />
      )}

      {isModalOpen && (
        <EventModal
          event={activeModalEvent}
          currentUserId={currentUserId}
          myNickname={myNickname}
          partnerNickname={partnerNickname}
          onClose={() => {
            setIsModalOpen(false);
            setActiveModalEvent(null);
          }}
          onSave={handleSaveEvent}
          onDelete={handleDeleteEvent}
        />
      )}

      {isTodoModalOpen && (
        <TodoModal
          isOpen={isTodoModalOpen}
          todo={editingTodo}
          groups={todoGroups}
          defaultDate={activeTodoDate}
          onClose={() => {
            setIsTodoModalOpen(false);
            setEditingTodo(null);
          }}
          onSave={handleSaveTodo}
          isSubmitting={false}
        />
      )}
    </div>
  );
}
