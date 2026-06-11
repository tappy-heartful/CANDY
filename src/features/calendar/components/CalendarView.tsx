"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarEvent, Anniversary } from "@/src/lib/firestore/types";
import { getEvents, getTodosForCalendar, addEvent, updateEvent, deleteEvent } from "@/src/features/calendar/api/calendar-client-service";
import { getAnniversaries } from "@/src/features/anniversary/api/anniversary-client-service";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import EventModal from "./EventModal";
import DailyAgendaModal from "./DailyAgendaModal";
import styles from "./Calendar.module.css";

interface CalendarViewProps {
  currentUserId: string;
  myNickname?: string;
  partnerNickname?: string;
  myPictureUrl?: string;
  partnerPictureUrl?: string;
  openDate?: string | null;
  onOpenDateClear?: () => void;
}

export default function CalendarView({
  currentUserId,
  myNickname = "自分",
  partnerNickname = "パートナー",
  myPictureUrl,
  partnerPictureUrl,
  openDate,
  onOpenDateClear,
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
  });
  const [activeModalEvent, setActiveModalEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [activeDateStr, setActiveDateStr] = useState<string>("");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

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
      getAnniversaries(currentUserId, partnerNickname !== "パートナー" ? "dummy" : null) // 実際はpartnerUidがないので、AnniversaryClient側では不要だったが、ここでは一旦uidベースで取得（CalendarViewのPropsにはpartnerUidがないので工夫が必要。現状は currentUserId だけでOKとする。または、HomeClient同様にpartnerUidを渡す）
    ])
      .then(([eventData, todoData, annivData]) => {
        setEvents(eventData);
        setTodos(todoData);
        setAnniversaries(annivData);
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
    if (currentMonth === 0) {
      if (currentYear - 1 < minYear) return;
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      if (currentYear + 1 > maxYear) return;
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
  };

  const handleGoToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
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

  const handleSaveEvent = async (eventData: Partial<CalendarEvent>) => {
    showSpinner();
    try {
      if (activeModalEvent?.id) {
        // Edit Mode
        await updateEvent(activeModalEvent.id, eventData);
        setEvents((prev) =>
          prev.map((e) =>
            e.id === activeModalEvent.id ? ({ ...e, ...eventData } as CalendarEvent) : e
          )
        );
      } else {
        // Create Mode
        const docRef = await addEvent(eventData);
        const newEventItem = {
          id: docRef.id,
          ...eventData,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        } as CalendarEvent;
        setEvents((prev) => [...prev, newEventItem]);
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

  const handleDeleteEvent = async (id: string) => {
    showSpinner();
    try {
      await deleteEvent(id);
      setEvents((prev) => prev.filter((e) => e.id !== id));
      setIsModalOpen(false);
      setActiveModalEvent(null);
    } catch (e) {
      console.error("Delete error:", e);
      showDialog("予定の削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const padZero = (n: number) => n.toString().padStart(2, "0");

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEndX(null);
    setTouchStartX(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEndX(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStartX || !touchEndX) return;
    const distance = touchStartX - touchEndX;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      handleNextMonth();
    } else if (isRightSwipe) {
      handlePrevMonth();
    }
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
      </div>

      <div className={styles.calendarHeader}>
        <div className={styles.monthLabel}>
          <i className="fa-solid fa-calendar-alt" style={{ color: "#9B7CC3" }}></i>
          {currentYear}年{currentMonth + 1}月
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

      <div className={styles.weekdaysHeader}>
        <div className={`${styles.weekday} ${styles.weekdaySunday}`}>日</div>
        <div className={styles.weekday}>月</div>
        <div className={styles.weekday}>火</div>
        <div className={styles.weekday}>水</div>
        <div className={styles.weekday}>木</div>
        <div className={styles.weekday}>金</div>
        <div className={`${styles.weekday} ${styles.weekdaySaturday}`}>土</div>
      </div>

      <div className={styles.daysGrid}>
        {gridCells.map((cell, idx) => {
          const dateStr = `${cell.year}-${padZero(cell.month + 1)}-${padZero(cell.dayNum)}`;
          const cellDayOfWeek = idx % 7; // 0 = Sunday, 6 = Saturday
          const isHoliday = !!holidays[dateStr];

          // Find events and todos active on this date string
          const dayEvents = visibleEvents.filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);
          const dayTodos = visibleTodos.filter((t) => t.date === dateStr);
          
          // 記念日のチェック ("MM-DD" で判定)
          const mdStr = `${padZero(cell.month + 1)}-${padZero(cell.dayNum)}`;
          const dayAnniversaries = anniversaries.filter((a) => a.date === mdStr);

          const combinedItems = [
            ...dayEvents.map(e => ({ ...e, isTodo: false })),
            ...dayTodos.map(t => ({ ...t, isTodo: true }))
          ];

          combinedItems.sort((a, b) => {
            // 1. 複数日イベントを優先
            const aMulti = a.startDate !== a.endDate ? 1 : 0;
            const bMulti = b.startDate !== b.endDate ? 1 : 0;
            if (aMulti !== bMulti) return bMulti - aMulti;
            
            // 2. 開始日が早い順
            const aStart = a.startDate || a.date;
            const bStart = b.startDate || b.date;
            if (aStart !== bStart) return aStart.localeCompare(bStart);
            
            // 3. 終了日が遅い順
            const aEnd = a.endDate || a.date;
            const bEnd = b.endDate || b.date;
            if (aEnd !== bEnd) return bEnd.localeCompare(aEnd);

            // 4. 終日の予定を優先
            if (a.isAllDay && !b.isAllDay) return -1;
            if (!a.isAllDay && b.isAllDay) return 1;

            // 5. 開始時間（startTime）が早い順
            if (a.startTime && b.startTime && a.startTime !== b.startTime) {
              return a.startTime.localeCompare(b.startTime);
            }
            
            // 6. それ以外はタイトル順
            return a.title.localeCompare(b.title);
          });

          const isToday =
            today.getDate() === cell.dayNum &&
            today.getMonth() === cell.month &&
            today.getFullYear() === cell.year;

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
                {combinedItems.map((item) => {
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
                    return (
                      <span key={`todo-${item.id}`} className={`${styles.todoPill} ${pillClass}`}>
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
                      {titleStr || "\u00A0"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {isDailyAgendaOpen && (
        <DailyAgendaModal
          activeDateStr={activeDateStr}
          events={visibleEvents.filter((e) => activeDateStr >= e.startDate && activeDateStr <= e.endDate)}
          todos={visibleTodos.filter((t) => t.date === activeDateStr)}
          anniversaries={anniversaries.filter((a) => a.date === activeDateStr.slice(5))}
          currentUserId={currentUserId}
          myPictureUrl={myPictureUrl}
          partnerPictureUrl={partnerPictureUrl}
          onClose={() => setIsDailyAgendaOpen(false)}
          onAddEvent={handleAddNewEvent}
          onEditEvent={handleEditEvent}
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
    </div>
  );
}
