"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarEvent } from "@/src/lib/firestore/types";
import { getEvents } from "@/src/features/calendar/api/calendar-server-actions";
import { addEvent, updateEvent, deleteEvent } from "@/src/features/calendar/api/calendar-client-service";
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
}

export default function CalendarView({
  currentUserId,
  myNickname = "自分",
  partnerNickname = "パートナー",
  myPictureUrl,
  partnerPictureUrl,
}: CalendarViewProps) {
  const today = useMemo(() => new Date(), []);
  const thisYear = today.getFullYear();
  const minYear = thisYear - 3;
  const maxYear = thisYear + 3;

  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-11
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [activeModalEvent, setActiveModalEvent] = useState<Partial<CalendarEvent> | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDailyAgendaOpen, setIsDailyAgendaOpen] = useState(false);
  const [activeDateStr, setActiveDateStr] = useState<string>("");
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchEndX, setTouchEndX] = useState<number | null>(null);

  // Fetch events on mount
  useEffect(() => {
    showSpinner();
    getEvents()
      .then((data) => {
        setEvents(data);
      })
      .catch((e) => {
        console.error("Failed to load events:", e);
        showDialog("予定の読み込みに失敗しました");
      })
      .finally(() => {
        hideSpinner();
      });
  }, []);

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

          // Find events active on this date string
          const dayEvents = events.filter((e) => dateStr >= e.startDate && dateStr <= e.endDate);

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
                      : cellDayOfWeek === 0
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
                {dayEvents.slice(0, 3).map((e) => {
                  const isMe = e.uid === currentUserId;
                  const pillClass =
                    e.type === "couple"
                      ? styles.eventCouple
                      : isMe
                        ? styles.eventMe
                        : styles.eventPartner;

                  return (
                    <span
                      key={e.id}
                      className={`${styles.eventPill} ${pillClass}`}
                    >
                      {e.title}
                    </span>
                  );
                })}
                {dayEvents.length > 3 && (
                  <span className={styles.moreIndicator}>+{dayEvents.length - 3} 件</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {isDailyAgendaOpen && (
        <DailyAgendaModal
          activeDateStr={activeDateStr}
          events={events.filter((e) => activeDateStr >= e.startDate && activeDateStr <= e.endDate)}
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
