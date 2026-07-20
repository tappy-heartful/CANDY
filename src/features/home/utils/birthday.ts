/**
 * 与えられた birthday 文字列が今日の日付（月・日）と一致するか判定する
 * 対応形式: "YYYY-MM-DD", "YYYY/MM/DD", "MM-DD", "MM/DD", "M-D", "M/D" など
 */
export function isTodayBirthday(birthdayStr?: string | null): boolean {
  if (!birthdayStr) return false;

  const today = new Date();
  const currentMonth = today.getMonth() + 1; // 1-12
  const currentDay = today.getDate(); // 1-31

  // ハイフンまたはスラッシュで分割
  const parts = birthdayStr.trim().split(/[-/]/).map(p => parseInt(p, 10));

  if (parts.some(isNaN)) return false;

  let month = 0;
  let day = 0;

  if (parts.length === 3) {
    // YYYY-MM-DD または YYYY/MM/DD
    month = parts[1];
    day = parts[2];
  } else if (parts.length === 2) {
    // MM-DD または MM/DD
    month = parts[0];
    day = parts[1];
  } else {
    return false;
  }

  return month === currentMonth && day === currentDay;
}
