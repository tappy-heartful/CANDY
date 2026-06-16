"use client";

import React, { useMemo } from "react";
import { useRouter } from "next/navigation";
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
  onToggleTodo?: (id: string, currentStatus: boolean) => void;
  onAddTodo?: (dateStr: string) => void;
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
  onToggleTodo,
  onAddTodo,
}: DailyAgendaModalProps) {
  const router = useRouter();

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
  // 予定(events)とTODO(todos)を混ぜて、時系列順にソートする
  const combinedAgendaItems = useMemo(() => {
    const items = [
      ...events.map((e) => ({
        ...e,
        isTodo: false as const,
        date: undefined,
        isCompleted: undefined,
      })),
      ...todos.map((t) => ({
        ...t,
        isTodo: true as const,
        isAllDay: undefined,
        startDate: undefined,
        endDate: undefined,
        startTime: undefined,
        endTime: undefined,
      })),
    ];

    return items.sort((a, b) => {
      // 1. 予定(isTodo: false)を優先、TODO(isTodo: true)を後にする
      if (a.isTodo !== b.isTodo) {
        return a.isTodo ? 1 : -1;
      }

      // --- 予定同士のソート ---
      if (!a.isTodo && !b.isTodo) {
        // 終日イベント(isAllDay: true)を優先
        if (a.isAllDay && !b.isAllDay) return -1;
        if (!a.isAllDay && b.isAllDay) return 1;

        // 両方時間指定がある場合は、開始時間順にソート
        if (a.startTime && b.startTime) {
          return a.startTime.localeCompare(b.startTime);
        }
        
        // 片方だけ時間指定がある場合は、時間指定ありを後にする
        if (a.startTime && !b.startTime) return 1;
        if (!a.startTime && b.startTime) return -1;

        // その他は所有者順 (couple -> me -> partner)
        const orderA = a.type === "couple" ? 0 : (a.uid === currentUserId ? 1 : 2);
        const orderB = b.type === "couple" ? 0 : (b.uid === currentUserId ? 1 : 2);
        if (orderA !== orderB) return orderA - orderB;

        return ((a as any).createdAt || 0) - ((b as any).createdAt || 0);
      }

      // --- TODO同士のソート ---
      // 未完了を優先、完了済みを後にする
      const aComp = a.isCompleted ? 1 : 0;
      const bComp = b.isCompleted ? 1 : 0;
      if (aComp !== bComp) return aComp - bComp;

      // 所有者順 (couple -> me -> partner)
      const orderA = a.type === "couple" ? 0 : (a.uid === currentUserId ? 1 : 2);
      const orderB = b.type === "couple" ? 0 : (b.uid === currentUserId ? 1 : 2);
      if (orderA !== orderB) return orderA - orderB;

      // 作成順
      const aTimeVal = (a as any).createdAt || 0;
      const bTimeVal = (b as any).createdAt || 0;
      return aTimeVal - bTimeVal;
    });
  }, [events, todos, currentUserId]);

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
        <button className={styles.modalClose} onClick={onClose} aria-label="閉じる">
          <i className="fa-solid fa-xmark"></i>
        </button>

        <div className={styles.headerRow} style={{ paddingRight: '24px' }}>
          <h2 className={styles.dateTitle}>{formattedDate}</h2>
          <div className={styles.headerActions}>
            <img src={myPictureUrl} alt="User" className={styles.userIcon} />
            <button className={styles.addBtn} onClick={() => onAddEvent(activeDateStr)} title="予定を追加">
              <i className="fa-solid fa-calendar-plus"></i>
            </button>
            <button className={styles.addTodoBtn} onClick={() => onAddTodo && onAddTodo(activeDateStr)} title="TODOを追加">
              <i className="fa-solid fa-list-check"></i>
            </button>
          </div>
        </div>

        <div className={styles.eventList}>
          {combinedAgendaItems.length === 0 && anniversaries.length === 0 ? (
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

              {combinedAgendaItems.map((item) => {
                const color = item.type === "couple" ? "#9B7CC3" : (item.uid === currentUserId ? "#F7A8C4" : "#A0E7D2");
                const icon = item.type === "couple" ? (
                  <>
                    <img src={myPictureUrl} alt="Me" className={styles.eventUserIcon} />
                    <img src={partnerPictureUrl} alt="Partner" className={styles.eventUserIcon} style={{ marginLeft: "-12px" }} />
                  </>
                ) : (item.uid === currentUserId ? (
                  <img src={myPictureUrl} alt="Me" className={styles.eventUserIcon} />
                ) : (
                  <img src={partnerPictureUrl} alt="Partner" className={styles.eventUserIcon} />
                ));

                if (item.isTodo) {
                  // TODO のレンダリング
                  return (
                    <div key={`todo-${item.id}`} className={styles.eventRow} onClick={() => router.push(`/todo?scrollTo=${item.id}`)} style={{ cursor: 'pointer' }}>
                      <div 
                        className={styles.timeCol} 
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleTodo && onToggleTodo(item.id, !!item.isCompleted);
                        }}
                      >
                        <span className={styles.timeText} style={{ fontSize: '20px' }}>
                          {item.isCompleted ? (
                            <i className="fa-regular fa-square-check" style={{color: '#9B7CC3'}}></i>
                          ) : (
                            <i className="fa-regular fa-square" style={{color: '#ccc'}}></i>
                          )}
                        </span>
                      </div>
                      <div className={styles.mainCol} style={{ borderLeftColor: color, opacity: item.isCompleted ? 0.4 : 1 }}>
                        <div className={styles.eventTitle} style={{ textDecoration: item.isCompleted ? 'line-through' : 'none' }}>
                          <div className={styles.iconCol} style={{ marginRight: '8px' }}>{icon}</div>
                          <span>{item.title}</span>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // 予定(イベント)のレンダリング
                  return (
                    <div key={`event-${item.id}`} className={styles.eventRow} onClick={() => onEditEvent(item)} style={{ alignItems: 'stretch', cursor: 'pointer' }}>
                      <div className={styles.timeCol} style={{ alignItems: 'center' }}>
                        {(() => {
                          if (item.startDate !== item.endDate) {
                            const isStart = activeDateStr === item.startDate;
                            const isEnd = activeDateStr === item.endDate;
                            const isMiddle = activeDateStr > item.startDate && activeDateStr < item.endDate;

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
                                  <span className={styles.timeText} style={{ marginTop: '8px' }}>{item.isAllDay ? "終日" : item.startTime}</span>
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
                                  <span className={styles.timeText} style={{ marginBottom: '8px' }}>{item.isAllDay ? "終日" : item.endTime}</span>
                                </>
                              );
                            }
                          }
                          
                          // 単日イベントの場合
                          return item.isAllDay ? (
                            <span className={styles.timeText} style={{ marginTop: '8px', alignSelf: 'flex-end' }}>終日</span>
                          ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', marginTop: '8px', width: '100%' }}>
                              <span className={styles.timeText}>{item.startTime}</span>
                              <span className={styles.timeTextSub}>{item.endTime}</span>
                            </div>
                          );
                        })()}
                      </div>
                      <div className={styles.mainCol} style={{ borderLeftColor: color }}>
                        <div className={styles.eventTitle}>
                          <div className={styles.iconCol} style={{ marginRight: '8px' }}>{getEventIcon(item)}</div>
                          <span>
                            {item.title} {item.note && <i className="fa-regular fa-clock"></i>}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                }
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
