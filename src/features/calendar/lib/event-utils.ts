import { CalendarEvent } from "@/src/lib/firestore/types";

export interface EffectiveEventTimes {
  startTime?: string;
  endTime?: string;
  isAllDay: boolean;
  isMultiDay: boolean;
  isStartDay: boolean;
  isEndDay: boolean;
  isMiddleDay: boolean;
}

/**
 * 指定された対象日 (targetDateStr: "YYYY-MM-DD") における
 * 予定の実効的な開始時間、終了時間、終日フラグなどを算出する
 */
export function getEffectiveEventTimes(
  item: CalendarEvent,
  targetDateStr: string
): EffectiveEventTimes {
  if (item.isAllDay) {
    return {
      startTime: undefined,
      endTime: undefined,
      isAllDay: true,
      isMultiDay: item.startDate !== item.endDate,
      isStartDay: targetDateStr === item.startDate,
      isEndDay: targetDateStr === item.endDate,
      isMiddleDay: targetDateStr > item.startDate && targetDateStr < item.endDate,
    };
  }

  const isMultiDay = item.startDate !== item.endDate;
  if (!isMultiDay) {
    return {
      startTime: item.startTime,
      endTime: item.endTime,
      isAllDay: false,
      isMultiDay: false,
      isStartDay: true,
      isEndDay: true,
      isMiddleDay: false,
    };
  }

  const isStartDay = targetDateStr === item.startDate;
  const isEndDay = targetDateStr === item.endDate;
  const isMiddleDay = targetDateStr > item.startDate && targetDateStr < item.endDate;

  if (isStartDay) {
    return {
      startTime: item.startTime,
      endTime: "24:00",
      isAllDay: false,
      isMultiDay: true,
      isStartDay: true,
      isEndDay: false,
      isMiddleDay: false,
    };
  }

  if (isEndDay) {
    return {
      startTime: "00:00",
      endTime: item.endTime,
      isAllDay: false,
      isMultiDay: true,
      isStartDay: false,
      isEndDay: true,
      isMiddleDay: false,
    };
  }

  if (isMiddleDay) {
    return {
      startTime: undefined,
      endTime: undefined,
      isAllDay: true,
      isMultiDay: true,
      isStartDay: false,
      isEndDay: false,
      isMiddleDay: true,
    };
  }

  return {
    startTime: item.startTime,
    endTime: item.endTime,
    isAllDay: false,
    isMultiDay: false,
    isStartDay: false,
    isEndDay: false,
    isMiddleDay: false,
  };
}
