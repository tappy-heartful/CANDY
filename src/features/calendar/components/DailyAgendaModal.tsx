"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarEvent, Todo, Anniversary } from "@/src/lib/firestore/types";
import styles from "./DailyAgenda.module.css";

interface DailyAgendaModalProps {
  activeDateStr: string;
  events: CalendarEvent[];
  todos?: Todo[];
  anniversaries?: Anniversary[];
  currentUserId: string;
  myNickname?: string;
  partnerNickname?: string;
  myPictureUrl?: string;
  partnerPictureUrl?: string;
  onClose: () => void;
  onAddEvent: (dateStr: string) => void;
  onEditEvent: (eventItem: CalendarEvent) => void;
  onToggleTodo?: (id: string, currentStatus: boolean) => void;
  onAddTodo?: (dateStr: string) => void;
  onEditTodo?: (todoItem: Todo) => void;
  defaultDisplayMode?: "list" | "timeline";
  onChangeDisplayMode?: (mode: "list" | "timeline") => void;
}

export default function DailyAgendaModal({
  activeDateStr,
  events,
  todos = [],
  anniversaries = [],
  currentUserId,
  myNickname = "自分",
  partnerNickname = "パートナー",
  myPictureUrl = "/icon.png",
  partnerPictureUrl = "/icon.png",
  onClose,
  onAddEvent,
  onEditEvent,
  onToggleTodo,
  onAddTodo,
  onEditTodo,
  defaultDisplayMode = "list",
  onChangeDisplayMode,
}: DailyAgendaModalProps) {
  const router = useRouter();
  const [displayMode, setDisplayMode] = useState<"list" | "timeline">(defaultDisplayMode);

  React.useEffect(() => {
    if (defaultDisplayMode) {
      setDisplayMode(defaultDisplayMode);
    }
  }, [defaultDisplayMode]);

  const handleDisplayModeChange = (mode: "list" | "timeline") => {
    setDisplayMode(mode);
    if (onChangeDisplayMode) {
      onChangeDisplayMode(mode);
    }
  };

  // Format the date parts to display date and weekday on different lines
  const dateInfo = useMemo(() => {
    if (!activeDateStr) return { dateText: "", dayText: "" };
    const dateObj = new Date(activeDateStr);
    const month = dateObj.getMonth() + 1;
    const date = dateObj.getDate();
    const days = ["日曜日", "月曜日", "火曜日", "水曜日", "木曜日", "金曜日", "土曜日"];
    const dayStr = days[dateObj.getDay()];
    return {
      dateText: `${month}月${date}日`,
      dayText: dayStr,
    };
  }, [activeDateStr]);

  // 予定(events)とTODO(todos)を混ぜて、所有者グループごとに分類し、ソートする
  const { coupleItems, myItems, partnerItems } = useMemo(() => {
    const couple: any[] = [];
    const me: any[] = [];
    const partner: any[] = [];

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

    items.forEach((item) => {
      if (item.type === "couple") {
        couple.push(item);
      } else if (item.uid === currentUserId) {
        me.push(item);
      } else {
        partner.push(item);
      }
    });

    const sortFn = (a: any, b: any) => {
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

        return ((a as any).createdAt || 0) - ((b as any).createdAt || 0);
      }

      // --- TODO同士のソート ---
      // 未完了を優先、完了済みを後にする
      const aComp = a.isCompleted ? 1 : 0;
      const bComp = b.isCompleted ? 1 : 0;
      if (aComp !== bComp) return aComp - bComp;

      // 作成順
      const aTimeVal = (a as any).createdAt || 0;
      const bTimeVal = (b as any).createdAt || 0;
      return aTimeVal - bTimeVal;
    };

    return {
      coupleItems: couple.sort(sortFn),
      myItems: me.sort(sortFn),
      partnerItems: partner.sort(sortFn),
    };
  }, [events, todos, currentUserId]);

  // タイムライン用のデータを抽出・ソート・グリッド行割り当て
  const timetableData = useMemo(() => {
    if (coupleItems.length === 0 && myItems.length === 0 && partnerItems.length === 0 && anniversaries.length === 0) {
      return { 
        slots: [] as { start: string; end: string }[], 
        timePoints: [] as string[], 
        rowMap: {} as Record<string, number>, 
        totalRows: 1, 
        showMe: false, 
        showPartner: false,
        hasCouple: false,
        timeEvents: [] as any[],
        specialItems: { anniversary: [] as any[], allDay: [] as any[], todo: [] as any[], noTime: [] as any[] },
        getNormalizedEndTime: (item: any) => ""
      };
    }

    const hasMe = myItems.length > 0;
    const hasPartner = partnerItems.length > 0;
    const hasCouple = coupleItems.length > 0 || anniversaries.length > 0;

    const showMe = hasMe || hasCouple;
    const showPartner = hasPartner || hasCouple;

    // 時間指定のある予定の抽出
    const timeEvents = [
      ...coupleItems.filter(e => !e.isTodo && !e.isAllDay && e.startTime),
      ...myItems.filter(e => !e.isTodo && !e.isAllDay && e.startTime),
      ...partnerItems.filter(e => !e.isTodo && !e.isAllDay && e.startTime)
    ];

    // 特殊予定の抽出
    const specialItems = {
      anniversary: anniversaries.map(a => ({
        ...a,
        isAnniversary: true,
        isTodo: false,
        title: `🎂 ${a.title}`,
        type: 'couple'
      })),
      allDay: [
        ...coupleItems.filter(e => !e.isTodo && e.isAllDay),
        ...myItems.filter(e => !e.isTodo && e.isAllDay),
        ...partnerItems.filter(e => !e.isTodo && e.isAllDay)
      ],
      todo: [
        ...coupleItems.filter(e => e.isTodo),
        ...myItems.filter(e => e.isTodo),
        ...partnerItems.filter(e => e.isTodo)
      ],
      noTime: [
        ...coupleItems.filter(e => !e.isTodo && !e.isAllDay && !e.startTime),
        ...myItems.filter(e => !e.isTodo && !e.isAllDay && !e.startTime),
        ...partnerItems.filter(e => !e.isTodo && !e.isAllDay && !e.startTime)
      ]
    };

    // 時間指定の終了時間を補完する関数
    const addOneHour = (timeStr: string): string => {
      const [h, m] = timeStr.split(':').map(Number);
      const nextH = (h + 1) % 24;
      return `${nextH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    const getNormalizedEndTime = (item: any) => {
      if (item.endTime) return item.endTime;
      return addOneHour(item.startTime);
    };

    // 時間の全境界値を取得
    const timePointsSet = new Set<string>();
    timeEvents.forEach(item => {
      timePointsSet.add(item.startTime);
      timePointsSet.add(getNormalizedEndTime(item));
    });
    const timePoints = Array.from(timePointsSet).sort((a, b) => a.localeCompare(b));

    // 時間指定予定はあるが、境界値が不足している場合は補完
    if (timeEvents.length > 0 && timePoints.length < 2) {
      timePoints.push(addOneHour(timePoints[0]));
    }

    // タイムスロット（区間）の生成
    const slots: { start: string; end: string }[] = [];
    for (let i = 0; i < timePoints.length - 1; i++) {
      slots.push({ start: timePoints[i], end: timePoints[i+1] });
    }

    // 行マップの計算
    let currentRow = 2; // ヘッダー（行1）の次
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

    rowMap.slotsStart = currentRow;
    const totalRows = currentRow + slots.length - 1;

    return {
      slots,
      timePoints,
      rowMap,
      totalRows,
      showMe,
      showPartner,
      hasCouple,
      timeEvents,
      specialItems,
      getNormalizedEndTime
    };
  }, [coupleItems, myItems, partnerItems, anniversaries]);

  const { slots, timePoints, rowMap, totalRows, showMe: hasMe, showPartner: hasPartner, hasCouple, timeEvents, specialItems, getNormalizedEndTime } = timetableData;
  const colCount = (hasMe ? 1 : 0) + (hasPartner ? 1 : 0);

  const renderTimetableCard = (item: any, additionalStyle?: React.CSSProperties) => {
    if (item.isAnniversary) {
      return (
        <div key={`anniv-card-${item.id}`} className={styles.timetableCard} style={{ background: '#f5f0fa', border: '1px solid #9B7CC3', color: '#7a5ba0', ...additionalStyle }}>
          <span className={styles.timetableCardTitle}>{item.title}</span>
        </div>
      );
    }

    const isEditable = item.type === "couple" || item.uid === currentUserId;
    
    if (item.isTodo) {
      const color = item.type === "couple" ? "#9B7CC3" : (item.uid === currentUserId ? "#F7A8C4" : "#A0E7D2");
      return (
        <div 
          key={`todo-card-${item.id}`} 
          className={styles.timetableCard} 
          style={{ 
            background: 'white', 
            border: `2px solid ${color}`, 
            color: '#333',
            opacity: item.isCompleted ? 0.4 : 1,
            cursor: isEditable ? 'pointer' : 'default',
            ...additionalStyle
          }}
          onClick={() => {
            if (isEditable && onEditTodo) {
              onEditTodo(item as unknown as Todo);
            }
          }}
        >
          <span onClick={(e) => {
            e.stopPropagation();
            onToggleTodo && onToggleTodo(item.id, !!item.isCompleted);
          }} style={{ display: 'inline-flex', alignItems: 'center' }}>
            {item.isCompleted ? (
              <i className="fa-regular fa-square-check" style={{color: '#9B7CC3'}}></i>
            ) : (
              <i className="fa-regular fa-square" style={{color: '#ccc'}}></i>
            )}
          </span>
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
        key={`event-card-${item.id}`} 
        className={styles.timetableCard} 
        style={{ 
          background: bgColor, 
          color: textColor,
          border: `1px solid ${color}`,
          cursor: 'pointer',
          ...additionalStyle
        }}
        onClick={() => onEditEvent(item)}
      >
        {item.isRecurring && <i className="fa-solid fa-arrows-rotate" style={{ fontSize: '10px', color: textColor }}></i>}
        <span className={styles.timetableCardTitle}>{item.title}</span>
      </div>
    );
  };

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
          <h2 className={styles.dateTitle}>
            <span className={styles.dateText}>{dateInfo.dateText}</span>
            <span className={styles.dayText}>{dateInfo.dayText}</span>
          </h2>
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

        {/* 表示モード切り替えタブ */}
        {(coupleItems.length > 0 || myItems.length > 0 || partnerItems.length > 0 || anniversaries.length > 0) && (
          <div className={styles.modeSelectRow}>
            <div className={styles.modeSelectTabs}>
              <button 
                className={`${styles.modeTab} ${displayMode === "list" ? styles.modeTabActive : ""}`}
                onClick={() => handleDisplayModeChange("list")}
              >
                リスト
              </button>
              <button 
                className={`${styles.modeTab} ${displayMode === "timeline" ? styles.modeTabActive : ""}`}
                onClick={() => handleDisplayModeChange("timeline")}
              >
                タイムライン
              </button>
            </div>
          </div>
        )}

        <div className={styles.eventList}>
          {coupleItems.length === 0 && myItems.length === 0 && partnerItems.length === 0 && anniversaries.length === 0 ? (
            <div className={styles.emptyState}>予定・TODOはありません</div>
          ) : displayMode === "timeline" ? (
            <div className={styles.timetableWrapper}>
              <div 
                className={styles.timetableGrid} 
                style={{ 
                  gridTemplateColumns: `60px ${colCount === 2 ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)'}`,
                  gridTemplateRows: `auto repeat(${totalRows - 1}, minmax(44px, auto))`,
                  gap: '6px'
                }}
              >
                {/* ヘッダー行 */}
                <div className={styles.timetableHeaderCell} style={{ gridRow: 1, gridColumn: 1, visibility: 'hidden' }}>時間</div>
                {hasMe && (
                  <div className={styles.timetableHeaderCell} style={{ gridRow: 1, gridColumn: 2 }}>
                    <i className="fa-solid fa-user" style={{ color: "#F7A8C4" }}></i>{myNickname}
                  </div>
                )}
                {hasPartner && (
                  <div className={styles.timetableHeaderCell} style={{ gridRow: 1, gridColumn: colCount === 2 ? 3 : 2 }}>
                    <i className="fa-solid fa-user-friends" style={{ color: "#A0E7D2" }}></i>{partnerNickname}
                  </div>
                )}

                {/* 記念日行 */}
                {rowMap.anniversary && (
                  <>
                    <div className={styles.timeCell} style={{ gridRow: rowMap.anniversary, gridColumn: 1 }}>
                      <span className={styles.timeCellLabel}>記念日</span>
                    </div>
                    <div className={styles.itemCell} style={{ gridRow: rowMap.anniversary, gridColumn: colCount === 2 ? '2 / 4' : 2 }}>
                      {specialItems.anniversary.map(item => renderTimetableCard(item))}
                    </div>
                  </>
                )}

                {/* 終日行 */}
                {rowMap.allDay && (() => {
                  const couple = specialItems.allDay.filter(item => item.type === 'couple');
                  const me = specialItems.allDay.filter(item => item.uid === currentUserId && item.type !== 'couple');
                  const partner = specialItems.allDay.filter(item => item.uid !== currentUserId && item.type !== 'couple');
                  return (
                    <>
                      <div className={styles.timeCell} style={{ gridRow: rowMap.allDay, gridColumn: 1 }}>
                        <span className={styles.timeCellLabel}>終日</span>
                      </div>
                      {colCount === 2 && couple.length > 0 && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.allDay, gridColumn: '2 / 4' }}>
                          {couple.map(item => renderTimetableCard(item))}
                        </div>
                      )}
                      {hasMe && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.allDay, gridColumn: 2 }}>
                          {me.length > 0 ? (
                            me.map(item => renderTimetableCard(item))
                          ) : (
                            colCount === 2 && couple.length === 0 ? <div className={styles.emptyCell} /> : null
                          )}
                        </div>
                      )}
                      {hasPartner && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.allDay, gridColumn: colCount === 2 ? 3 : 2 }}>
                          {partner.length > 0 ? (
                            partner.map(item => renderTimetableCard(item))
                          ) : (
                            colCount === 2 && couple.length === 0 ? <div className={styles.emptyCell} /> : null
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* TODO行 */}
                {rowMap.todo && (() => {
                  const couple = specialItems.todo.filter(item => item.type === 'couple');
                  const me = specialItems.todo.filter(item => item.uid === currentUserId && item.type !== 'couple');
                  const partner = specialItems.todo.filter(item => item.uid !== currentUserId && item.type !== 'couple');
                  return (
                    <>
                      <div className={styles.timeCell} style={{ gridRow: rowMap.todo, gridColumn: 1 }}>
                        <span className={styles.timeCellLabel}>TODO</span>
                      </div>
                      {colCount === 2 && couple.length > 0 && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.todo, gridColumn: '2 / 4' }}>
                          {couple.map(item => renderTimetableCard(item))}
                        </div>
                      )}
                      {hasMe && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.todo, gridColumn: 2 }}>
                          {me.length > 0 ? (
                            me.map(item => renderTimetableCard(item))
                          ) : (
                            colCount === 2 && couple.length === 0 ? <div className={styles.emptyCell} /> : null
                          )}
                        </div>
                      )}
                      {hasPartner && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.todo, gridColumn: colCount === 2 ? 3 : 2 }}>
                          {partner.length > 0 ? (
                            partner.map(item => renderTimetableCard(item))
                          ) : (
                            colCount === 2 && couple.length === 0 ? <div className={styles.emptyCell} /> : null
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* 時間未定行 */}
                {rowMap.noTime && (() => {
                  const couple = specialItems.noTime.filter(item => item.type === 'couple');
                  const me = specialItems.noTime.filter(item => item.uid === currentUserId && item.type !== 'couple');
                  const partner = specialItems.noTime.filter(item => item.uid !== currentUserId && item.type !== 'couple');
                  return (
                    <>
                      <div className={styles.timeCell} style={{ gridRow: rowMap.noTime, gridColumn: 1 }}>
                        <span className={styles.timeCellLabel}>時間未定</span>
                      </div>
                      {colCount === 2 && couple.length > 0 && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.noTime, gridColumn: '2 / 4' }}>
                          {couple.map(item => renderTimetableCard(item))}
                        </div>
                      )}
                      {hasMe && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.noTime, gridColumn: 2 }}>
                          {me.length > 0 ? (
                            me.map(item => renderTimetableCard(item))
                          ) : (
                            colCount === 2 && couple.length === 0 ? <div className={styles.emptyCell} /> : null
                          )}
                        </div>
                      )}
                      {hasPartner && (
                        <div className={styles.itemCell} style={{ gridRow: rowMap.noTime, gridColumn: colCount === 2 ? 3 : 2 }}>
                          {partner.length > 0 ? (
                            partner.map(item => renderTimetableCard(item))
                          ) : (
                            colCount === 2 && couple.length === 0 ? <div className={styles.emptyCell} /> : null
                          )}
                        </div>
                      )}
                    </>
                  );
                })()}

                {/* 時間スロットのラベル（目盛り表示） */}
                {timePoints.map((tp, i) => {
                  const isLast = i === timePoints.length - 1;
                  const gridRow = isLast ? rowMap.slotsStart! + i - 1 : rowMap.slotsStart! + i;
                  return (
                    <div 
                      key={`time-tick-${i}`} 
                      className={styles.timeCell} 
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
                        padding: isLast ? '0 0 2px 0' : '2px 0 0 0',
                        minHeight: 'auto'
                      }}
                    >
                      <span className={styles.timeCellLabel} style={{ fontSize: '11px', color: '#888', fontWeight: 'bold' }}>{tp}</span>
                    </div>
                  );
                })}

                {/* 時間指定予定カード */}
                {timeEvents.map(item => {
                  const startIdx = rowMap.slotsStart! + timePoints.indexOf(item.startTime);
                  const endIdx = rowMap.slotsStart! + timePoints.indexOf(getNormalizedEndTime(item));
                  
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
                      key={`time-event-${item.id}`} 
                      className={styles.itemCell} 
                      style={{ 
                        gridRow: `${startIdx} / ${endIdx}`, 
                        gridColumn: (colCount === 2 && isCoupleEvent) ? '2 / 4' : col,
                        zIndex: isCoupleEvent ? 2 : 1,
                        height: '100%',
                        justifyContent: 'stretch'
                      }}
                    >
                      {renderTimetableCard(item, { height: '100%', display: 'flex', alignItems: 'center' })}
                    </div>
                  );
                })}

                {/* 時間枠用の空セル */}
                {slots.map((slot, i) => {
                  const gridRow = rowMap.slotsStart! + i;
                  
                  const hasCoupleInSlot = timeEvents.some(item => 
                    item.type === 'couple' && 
                    item.startTime < slot.end && 
                    getNormalizedEndTime(item) > slot.start
                  );
                  const hasMeInSlot = timeEvents.some(item => 
                    item.uid === currentUserId && 
                    item.type !== 'couple' && 
                    item.startTime < slot.end && 
                    getNormalizedEndTime(item) > slot.start
                  );
                  const hasPartnerInSlot = timeEvents.some(item => 
                    item.uid !== currentUserId && 
                    item.type !== 'couple' && 
                    item.startTime < slot.end && 
                    getNormalizedEndTime(item) > slot.start
                  );

                  return (
                    <React.Fragment key={`empty-cells-${i}`}>
                      {hasMe && !hasCoupleInSlot && !hasMeInSlot && (
                        <div className={styles.emptyCell} style={{ gridRow, gridColumn: 2, height: '100%' }} />
                      )}
                      {hasPartner && !hasCoupleInSlot && !hasPartnerInSlot && (
                        <div className={styles.emptyCell} style={{ gridRow, gridColumn: colCount === 2 ? 3 : 2, height: '100%' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
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

              {(() => {
                const renderAgendaItem = (item: any, isLast: boolean) => {
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
                    const isEditable = item.type === "couple" || item.uid === currentUserId;
                    return (
                      <div
                        key={`todo-${item.id}`}
                        className={`${styles.eventRow} ${isLast ? styles.noBorder : ""}`}
                        onClick={() => {
                          if (isEditable && onEditTodo) {
                            onEditTodo(item as unknown as Todo);
                          }
                        }}
                        style={{ cursor: isEditable ? 'pointer' : 'default' }}
                      >
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
                    return (
                      <div key={`event-${item.id}`} className={`${styles.eventRow} ${isLast ? styles.noBorder : ""}`} onClick={() => onEditEvent(item)} style={{ alignItems: 'stretch', cursor: 'pointer' }}>
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
                              {item.isRecurring && <i className="fa-solid fa-arrows-rotate" style={{ marginRight: '4px', color: '#999', fontSize: '12px' }}></i>}
                              {item.title} {item.note && <i className="fa-regular fa-clock"></i>}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                };

                return (
                  <>
                    {/* 1. 2人の予定・TODO */}
                    {coupleItems.length > 0 && (
                      <div className={styles.sectionBlock}>
                        <div className={styles.sectionHeader}>
                          <i className="fa-solid fa-users" style={{ color: "#9B7CC3" }}></i>
                          <span>2人の予定・TODO</span>
                        </div>
                        <div className={styles.sectionContent}>
                          {coupleItems.map((item, idx) => renderAgendaItem(item, idx === coupleItems.length - 1))}
                        </div>
                      </div>
                    )}

                    {/* 2. 自分の予定・TODO */}
                    {myItems.length > 0 && (
                      <div className={styles.sectionBlock}>
                        <div className={styles.sectionHeader}>
                          <i className="fa-solid fa-user" style={{ color: "#F7A8C4" }}></i>
                          <span>{myNickname}の予定・TODO</span>
                        </div>
                        <div className={styles.sectionContent}>
                          {myItems.map((item, idx) => renderAgendaItem(item, idx === myItems.length - 1))}
                        </div>
                      </div>
                    )}

                    {/* 3. 相手の予定・TODO */}
                    {partnerItems.length > 0 && (
                      <div className={styles.sectionBlock}>
                        <div className={styles.sectionHeader}>
                          <i className="fa-solid fa-user-friends" style={{ color: "#A0E7D2" }}></i>
                          <span>{partnerNickname}の予定・TODO</span>
                        </div>
                        <div className={styles.sectionContent}>
                          {partnerItems.map((item, idx) => renderAgendaItem(item, idx === partnerItems.length - 1))}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
