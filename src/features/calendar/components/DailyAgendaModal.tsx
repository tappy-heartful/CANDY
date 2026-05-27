"use client";

import { useMemo } from "react";
import { CalendarEvent } from "@/src/lib/firestore/types";
import styles from "./DailyAgenda.module.css";

interface DailyAgendaModalProps {
  activeDateStr: string;
  events: CalendarEvent[];
  currentUserId: string;
  myPictureUrl?: string;
  partnerPictureUrl?: string;
  onClose: () => void;
  onAddEvent: (dateStr: string) => void;
  onEditEvent: (eventItem: CalendarEvent) => void;
}

export default function DailyAgendaModal({
  activeDateStr,
  events,
  currentUserId,
  myPictureUrl = "/icon.png",
  partnerPictureUrl = "/icon.png",
  onClose,
  onAddEvent,
  onEditEvent,
}: DailyAgendaModalProps) {
  // Format the date like "5月30日 土曜日"
  const formattedDate = useMemo(() => {
    if (!activeDateStr) return "";
    const dateObj = new Date(activeDateStr);
    const month = dateObj.getMonth() + 1;
    const date = dateObj.getDate();
    const days = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    const dayStr = days[dateObj.getDay()];
    return `${month}月${date}日 ${dayStr}`;
  }, [activeDateStr]);

  // Sort events: All-day first, then by start time
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1;
      if (!a.isAllDay && b.isAllDay) return 1;
      if (!a.isAllDay && !b.isAllDay && a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
  }, [events]);

  const getEventColor = (e: CalendarEvent) => {
    if (e.type === "couple") return "#9B7CC3";
    if (e.uid === currentUserId) return "#F7A8C4";
    return "#A0E7D2";
  };

  const getEventIcon = (e: CalendarEvent) => {
    if (e.type === "couple") {
      return (
        <>
          <img src={myPictureUrl} alt="Me" className={styles.eventUserIcon} />
          <img src={partnerPictureUrl} alt="Partner" className={styles.eventUserIcon} style={{ marginLeft: "-12px" }} />
        </>
      );
    }
    if (e.uid === currentUserId) {
      return <img src={myPictureUrl} alt="Me" className={styles.eventUserIcon} />;
    }
    return <img src={partnerPictureUrl} alt="Partner" className={styles.eventUserIcon} />;
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.bottomSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.dragHandleContainer}>
          <div className={styles.dragHandle}></div>
        </div>

        <div className={styles.headerRow}>
          <h2 className={styles.dateTitle}>{formattedDate}</h2>
          <div className={styles.headerActions}>
            <img src={myPictureUrl} alt="User" className={styles.userIcon} />
            <button className={styles.addBtn} onClick={() => onAddEvent(activeDateStr)}>
              <i className="fa-solid fa-plus"></i>
            </button>
          </div>
        </div>

        <div className={styles.eventList}>
          {sortedEvents.length === 0 ? (
            <div className={styles.emptyState}>予定はありません</div>
          ) : (
            sortedEvents.map((e) => {
              const color = getEventColor(e);
              return (
                <div key={e.id} className={styles.eventRow} onClick={() => onEditEvent(e)}>
                  <div className={styles.timeCol}>
                    {e.isAllDay ? (
                      <span className={styles.timeText}>終日</span>
                    ) : (
                      <>
                        <span className={styles.timeText}>{e.startTime}</span>
                        <span className={styles.timeTextSub}>{e.endTime}</span>
                      </>
                    )}
                  </div>
                  <div className={styles.mainCol} style={{ borderLeftColor: color }}>
                    <div className={styles.eventTitle}>
                      {e.title} {e.note && <i className="fa-regular fa-clock"></i>}
                    </div>
                    <div className={styles.iconCol}>{getEventIcon(e)}</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
