"use client";

import { useMemo } from "react";
import { CalendarEvent, Todo, Anniversary } from "@/src/lib/firestore/types";
import styles from "./DailyAgenda.module.css";

interface DailyAgendaModalProps {
  activeDateStr: string;
  events: CalendarEvent[];
  todos?: Todo[];
  anniversaries?: Anniversary[];
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
  todos = [],
  anniversaries = [],
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

  // Sort events:
  // 1. Continued from previous days (activeDateStr > startDate)
  // 2. Starts today, sorted by start time
  // 3. All-day events at the end
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const aIsContinued = activeDateStr > a.startDate;
      const bIsContinued = activeDateStr > b.startDate;
      
      // 前日から続きの予定を最優先
      if (aIsContinued && !bIsContinued) return -1;
      if (!aIsContinued && bIsContinued) return 1;

      // 終日の予定は一番最後
      if (a.isAllDay && !b.isAllDay) return 1;
      if (!a.isAllDay && b.isAllDay) return -1;

      // 時間が指定されている場合は開始時間昇順
      if (!a.isAllDay && !b.isAllDay && a.startTime && b.startTime) {
        return a.startTime.localeCompare(b.startTime);
      }
      return 0;
    });
  }, [events, activeDateStr]);

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
          {sortedEvents.length === 0 && todos.length === 0 && anniversaries.length === 0 ? (
            <div className={styles.emptyState}>予定・TODOはありません</div>
          ) : (
            <>
              {anniversaries.map((a) => (
                <div key={`anniv-${a.id}`} className={styles.eventRow} style={{ alignItems: 'center', background: '#fcf3f8', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
                  <div className={styles.timeCol} style={{ width: 'auto', marginRight: '16px' }}>
                    <span style={{ fontSize: '24px' }}>🎂</span>
                  </div>
                  <div className={styles.eventContent}>
                    <div className={styles.eventTitle} style={{ color: '#9B7CC3', fontWeight: 'bold' }}>{a.title}</div>
                    <div className={styles.eventNote} style={{ color: '#F7A8C4' }}>記念日です！🎉</div>
                  </div>
                </div>
              ))}
              {sortedEvents.map((e) => {
              const color = getEventColor(e);
              return (
                <div key={e.id} className={styles.eventRow} onClick={() => onEditEvent(e)} style={{ alignItems: 'stretch' }}>
                  <div className={styles.timeCol} style={{ alignItems: 'center' }}>
                    {(() => {
                      if (e.startDate !== e.endDate) {
                        const isStart = activeDateStr === e.startDate;
                        const isEnd = activeDateStr === e.endDate;
                        const isMiddle = activeDateStr > e.startDate && activeDateStr < e.endDate;

                        const wavyLineStyle: React.CSSProperties = {
                          width: '6px',
                          flex: 1,
                          backgroundColor: color,
                          WebkitMaskImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 3 0 Q 6 3 3 6 T 3 12' stroke='black' stroke-width='2' fill='none'/%3E%3C/svg%3E\")",
                          WebkitMaskRepeat: "repeat-y",
                          WebkitMaskSize: "6px 12px",
                          maskImage: "url(\"data:image/svg+xml,%3Csvg width='6' height='12' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M 3 0 Q 6 3 3 6 T 3 12' stroke='black' stroke-width='2' fill='none'/%3E%3C/svg%3E\")",
                          maskRepeat: "repeat-y",
                          maskSize: "6px 12px",
                        };

                        if (isStart) {
                          return (
                            <>
                              <span className={styles.timeText} style={{ marginTop: '8px' }}>{e.isAllDay ? "終日" : e.startTime}</span>
                              <div style={{ ...wavyLineStyle, marginTop: '4px' }}></div>
                            </>
                          );
                        }
                        if (isMiddle) {
                          return (
                            <div style={{ ...wavyLineStyle }}></div>
                          );
                        }
                        if (isEnd) {
                          return (
                            <>
                              <div style={{ ...wavyLineStyle, marginBottom: '4px' }}></div>
                              <span className={styles.timeText} style={{ marginBottom: '8px' }}>{e.isAllDay ? "終日" : e.endTime}</span>
                            </>
                          );
                        }
                      }
                      
                      // 単日イベントの場合
                      return e.isAllDay ? (
                        <span className={styles.timeText} style={{ marginTop: '8px', alignSelf: 'flex-end' }}>終日</span>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '8px', width: '100%' }}>
                          <span className={styles.timeText}>{e.startTime}</span>
                          <span className={styles.timeTextSub}>{e.endTime}</span>
                        </div>
                      );
                    })()}
                  </div>
                  <div className={styles.mainCol} style={{ borderLeftColor: color }}>
                    <div className={styles.eventTitle}>
                      {e.title} {e.note && <i className="fa-regular fa-clock"></i>}
                    </div>
                    <div className={styles.iconCol}>{getEventIcon(e)}</div>
                  </div>
                </div>
              );
              })}
            </>
          )}

          {todos.length > 0 && (
            <>
              {sortedEvents.length > 0 && <hr style={{ borderTop: '1px dashed #eee', borderBottom: 'none', margin: '16px 0' }} />}
              <div style={{ fontSize: '14px', fontWeight: 900, color: '#444', marginBottom: '8px' }}>
                <i className="fa-solid fa-list-check" style={{ color: '#9B7CC3', marginRight: '6px' }}></i>
                TODO
              </div>
              {todos.map((t) => {
                const color = t.type === "couple" ? "#9B7CC3" : (t.uid === currentUserId ? "#F7A8C4" : "#A0E7D2");
                
                const icon = t.type === "couple" ? (
                  <>
                    <img src={myPictureUrl} alt="Me" className={styles.eventUserIcon} />
                    <img src={partnerPictureUrl} alt="Partner" className={styles.eventUserIcon} style={{ marginLeft: "-12px" }} />
                  </>
                ) : (t.uid === currentUserId ? (
                  <img src={myPictureUrl} alt="Me" className={styles.eventUserIcon} />
                ) : (
                  <img src={partnerPictureUrl} alt="Partner" className={styles.eventUserIcon} />
                ));

                return (
                  <div key={t.id} className={styles.eventRow}>
                    <div className={styles.timeCol} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <span className={styles.timeText} style={{ fontSize: '20px' }}>
                        {t.isCompleted ? (
                          <i className="fa-regular fa-square-check" style={{color: '#9B7CC3'}}></i>
                        ) : (
                          <i className="fa-regular fa-square" style={{color: '#ccc'}}></i>
                        )}
                      </span>
                    </div>
                    <div className={styles.mainCol} style={{ borderLeftColor: color, opacity: t.isCompleted ? 0.6 : 1 }}>
                      <div className={styles.eventTitle} style={{ textDecoration: t.isCompleted ? 'line-through' : 'none' }}>
                        {t.title}
                      </div>
                      <div className={styles.iconCol}>{icon}</div>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
