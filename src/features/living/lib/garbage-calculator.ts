import { GarbageSchedule, DAY_OF_WEEK_LABELS } from "../types/living";

/**
 * 指定した日付（Date）が、対象のごみ収集スケジュールの回収日かどうかを判定する
 */
export function isGarbageCollectionDay(schedule: GarbageSchedule, date: Date): boolean {
  // 1. 月の判定 (1〜12)
  const month = date.getMonth() + 1;
  if (schedule.monthType === "even" && month % 2 !== 0) {
    return false;
  }
  if (schedule.monthType === "odd" && month % 2 === 0) {
    return false;
  }
  if (schedule.monthType === "custom") {
    if (!schedule.customMonths || !schedule.customMonths.includes(month)) {
      return false;
    }
  }

  // 2. 曜日の判定 (0: 日曜日 〜 6: 土曜日)
  const dayOfWeek = date.getDay();
  if (!schedule.daysOfWeek || !schedule.daysOfWeek.includes(dayOfWeek)) {
    return false;
  }

  // 3. 週の判定 (毎週 または 第N週)
  if (schedule.weekType === "nth") {
    // その月の第何週（第N曜日）かを計算
    // 例: 1日〜7日 = 第1, 8日〜14日 = 第2, 15日〜21日 = 第3, 22日〜28日 = 第4, 29日〜31日 = 第5
    const nthWeek = Math.ceil(date.getDate() / 7);
    if (!schedule.nthWeeks || !schedule.nthWeeks.includes(nthWeek)) {
      return false;
    }
  }

  return true;
}

/**
 * 指定日に収集されるごみスケジュール一覧を取得する
 */
export function getGarbageForDate(schedules: GarbageSchedule[], date: Date): GarbageSchedule[] {
  return schedules.filter((schedule) => isGarbageCollectionDay(schedule, date));
}

/**
 * 対象年月（1〜12）の全日付について、ごみ収集予定のマッピングを作成する
 * key: "YYYY-MM-DD"
 */
export function getGarbageForMonth(
  schedules: GarbageSchedule[],
  year: number,
  month: number // 1〜12
): Record<string, GarbageSchedule[]> {
  const result: Record<string, GarbageSchedule[]> = {};
  const daysInMonth = new Date(year, month, 0).getDate();

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month - 1, d);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const items = getGarbageForDate(schedules, date);
    if (items.length > 0) {
      result[dateStr] = items;
    }
  }

  return result;
}

/**
 * 直近 N 日間のごみ出し予定日リストを取得する（今日を含む）
 */
export function getUpcomingGarbage(
  schedules: GarbageSchedule[],
  fromDate: Date = new Date(),
  daysCount: number = 7
): { dateStr: string; date: Date; items: GarbageSchedule[] }[] {
  const upcoming: { dateStr: string; date: Date; items: GarbageSchedule[] }[] = [];

  for (let i = 0; i < daysCount; i++) {
    const date = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() + i);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const dateStr = `${year}-${month}-${day}`;

    const items = getGarbageForDate(schedules, date);
    if (items.length > 0) {
      upcoming.push({ dateStr, date, items });
    }
  }

  return upcoming;
}

/**
 * スケジュールルールの日本語サマリー文字列を生成する
 * 例: "毎月 毎週 火・金", "毎月 第1・第3 水", "偶数月 第2 木"
 */
export function formatScheduleRule(schedule: GarbageSchedule): string {
  const parts: string[] = [];

  // 月
  if (schedule.monthType === "even") {
    parts.push("偶数月");
  } else if (schedule.monthType === "odd") {
    parts.push("奇数月");
  } else if (schedule.monthType === "custom") {
    const sortedMonths = [...(schedule.customMonths || [])].sort((a, b) => a - b);
    const monthText = sortedMonths.map((m) => `${m}月`).join("・");
    parts.push(monthText || "指定月");
  } else {
    parts.push("毎月");
  }

  // 週
  if (schedule.weekType === "nth") {
    const sortedWeeks = [...(schedule.nthWeeks || [])].sort((a, b) => a - b);
    const key = sortedWeeks.join(",");
    if (key === "1,3") {
      parts.push("隔週(第1・3週)");
    } else if (key === "2,4") {
      parts.push("隔週(第2・4週)");
    } else {
      const weekLabels = sortedWeeks.map((w) => `第${w}`).join("・");
      parts.push(weekLabels ? `${weekLabels}週` : "第N週");
    }
  } else {
    parts.push("毎週");
  }

  // 曜日
  const sortedDays = [...(schedule.daysOfWeek || [])].sort((a, b) => a - b);
  const dayLabels = sortedDays
    .map((d) => {
      const match = DAY_OF_WEEK_LABELS.find((l) => l.value === d);
      return match ? match.label : "";
    })
    .filter(Boolean)
    .join("・");

  parts.push(dayLabels ? `${dayLabels}曜日` : "");

  return parts.filter(Boolean).join(" ");
}
