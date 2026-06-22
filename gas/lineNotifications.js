/**
 * CANDY LINE通知自動送信スクリプト (GAS用)
 *
 * 【このスクリプトがやること】
 * 1. 毎朝の定期通知 (execDailyMorningNotification)
 *    - 毎朝（例: 7時や8時）にトリガー実行。
 *    - 各ユーザーに対して、今日の予定、未完了のTODO、直近の記念日をLINEで送信。
 * 2. 予定の10分前リマインダー通知 (checkAndSendEventReminders)
 *    - 毎分（1分ごと）にトリガー実行。
 *    - 10分後に開始される予定がある場合、対象のユーザーにリマインダーをLINEで送信。
 */

const props = PropertiesService.getScriptProperties();
const LINE_ACCESS_TOKEN = props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');
const FIRESTORE_EMAIL = props.getProperty('FIRESTORE_EMAIL');
const FIRESTORE_KEY = props.getProperty('FIRESTORE_KEY').replace(/\\n/g, '\n');
const FIRESTORE_PROJECT_ID = props.getProperty('FIRESTORE_PROJECT_ID');

const BASE_URL = "https://candy-life.vercel.app"; // 本番環境のURLに置き換えてください

const cuteMessages = [
  "今朝の寝顔、すっごくかわいかったよ💕",
  "今日も無理しないでね。いつでも味方だからね🌸",
  "美味しいものいっぱい食べて、今日もハッピーに過ごしてね🍩",
  "疲れたらいつでもぎゅーってするから、教えてね🫂",
  "〇〇ちゃんが笑って過ごせる一日になりますように✨",
  "どんな時も〇〇ちゃんの味方だよ！応援してるね📣",
  "今日も一日、〇〇ちゃんにいいことがたくさん起きますように🍀",
];

/**
 * 毎朝の定期通知を実行する関数 (朝のトリガー推奨)
 */
function execDailyMorningNotification() {
  try {
    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);

    // 今日の日付文字列を日本時間(JST)で確実に取得
    // GASのタイムゾーン設定(UTC)によるズレを防ぐため Utilities を使用
    const todayDate = new Date();
    const todayStr = Utilities.formatDate(todayDate, "Asia/Tokyo", "yyyy-MM-dd");

    // 各コレクションからデータ取得
    const usersDocs = firestore.getDocuments('users');
    const eventsDocs = firestore.getDocuments('events');
    const todosDocs = firestore.getDocuments('todos');
    const lineMessagingIdsDocs = firestore.getDocuments('lineMessagingIds');
    const anniversariesDocs = firestore.getDocuments('anniversaries');

    const users = usersDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const events = eventsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const todos = todosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const anniversaries = anniversariesDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));

    // LINE Messaging IDsをマッピング
    const lineMessagingIds = {};
    lineMessagingIdsDocs.forEach(doc => {
      const uid = doc.name.split('/').pop();
      lineMessagingIds[uid] = doc.obj.lineUid;
    });

    users.forEach(user => {
      // lineMessagingIdsコレクションから対象のlineUidを取得
      const lineUid = lineMessagingIds[user.id];
      if (!lineUid) return;

      const nickname = user.nickname || "あなた";

      // パートナーのIDを特定（自分以外のユーザー）
      const partner = users.find(u => u.id !== user.id);
      const partnerUid = partner ? partner.id : null;

      // 対象ユーザーのイベントをフィルタリング（カップル用 or 自身のイベント）
      const userEvents = events.filter(e => e.type === 'couple' || e.uid === user.id);

      // 今日のイベント
      const todaysEvents = userEvents.filter(e => e.startDate <= todayStr && e.endDate >= todayStr);

      // 直近の未来イベント（明日以降開始）をソート
      const nextEvents = userEvents
        .filter(e => e.startDate > todayStr)
        .sort((a, b) => a.startDate.localeCompare(b.startDate) || (a.startTime || "24:00").localeCompare(b.startTime || "24:00"))
        .slice(0, 3);

      // 未完了のTODO（カップル用 or 自身）
      const allUserTodos = todos.filter(t => (t.type === 'couple' || t.uid === user.id) && !t.isCompleted);

      // 1. 期限切れのTODO (日付があり、今日より前)
      const overdueTodos = allUserTodos
        .filter(t => t.date && t.date < todayStr)
        .sort((a, b) => a.date.localeCompare(b.date));

      // 2. 本日のTODO (日付があり、今日)
      const todaysTodos = allUserTodos.filter(t => t.date === todayStr);

      // 3. 直近の未来TODO (日付があり、明日以降、最大3件)
      const nextTodos = allUserTodos
        .filter(t => t.date && t.date > todayStr)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 3);

      // 4. 期限なしのTODO (日付なし、または空文字列)
      const noDeadlineTodos = allUserTodos
        .filter(t => !t.date || t.date === "")
        .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));

      // 直近の記念日（今年または来年で最も近いもの3件）
      const userAnniversaries = anniversaries
        .filter(a => a.uid === user.id || (partnerUid && a.uid === partnerUid))
        .map(a => {
          const diffInfo = calculateAnniversaryDiff(a.date);
          return { ...a, diffDays: diffInfo.diffDays, isToday: diffInfo.isToday };
        })
        .sort((a, b) => a.diffDays - b.diffDays)
        .slice(0, 3);

      const cuteMessage = cuteMessages[Math.floor(Math.random() * cuteMessages.length)].replace(/〇〇/g, nickname);

      // ---- メッセージの構築 ----
      let message = `おはよう！CANDYだよ🍬\n${cuteMessage}\n\nきょうの${nickname}ちゃんはどんな調子かな？ぜひ教えてね🍀\n${BASE_URL}/home?action=status\n\n`;

      // 📅イベント セクション
      message += `📅イベント\n`;
      let hasEvents = false;
      if (todaysEvents.length > 0) {
        todaysEvents.forEach(e => {
          const timeStr = e.isAllDay ? "終日" : (e.startTime ? `${e.startTime}〜` : "時間未定");
          message += `・本日 ${timeStr} ${e.title}\n`;
          hasEvents = true;
        });
      }
      if (nextEvents.length > 0) {
        nextEvents.forEach(e => {
          const diffDays = calculateDiffDays(todayStr, e.startDate);
          message += `・${e.title} (あと${diffDays}日)\n`;
          hasEvents = true;
        });
      }
      if (!hasEvents) {
        message += `予定は特にないよ✨\n`;
      }
      message += `\n`;

      // 📋TODO セクション
      message += `📋TODO\n`;
      let hasTodos = false;

      // ① 期限切れ
      if (overdueTodos.length > 0) {
        message += `【期限切れ】\n`;
        overdueTodos.forEach(t => {
          const diffDays = calculateDiffDays(t.date, todayStr);
          message += `・${t.title} (${diffDays}日前)\n`;
        });
        hasTodos = true;
      }

      // ② 今日・これからの予定
      const activeLines = [];
      if (todaysTodos.length > 0) {
        todaysTodos.forEach(t => {
          activeLines.push(`・本日 ${t.title}`);
        });
      }
      if (nextTodos.length > 0) {
        nextTodos.forEach(t => {
          const diffDays = calculateDiffDays(todayStr, t.date);
          activeLines.push(`・${t.title} (あと${diffDays}日)`);
        });
      }

      if (activeLines.length > 0) {
        if (overdueTodos.length > 0) {
          message += `【今日・これからの予定】\n`;
        }
        activeLines.forEach(line => {
          message += `${line}\n`;
        });
        hasTodos = true;
      }

      // ③ 期限なし
      if (noDeadlineTodos.length > 0) {
        message += `【期限なし】\n`;
        noDeadlineTodos.forEach(t => {
          message += `・${t.title}\n`;
        });
        hasTodos = true;
      }

      if (!hasTodos) {
        message += `TODOはクリア済み！👏\n`;
      }
      message += `\n`;

      // 🎂記念日 セクション
      if (userAnniversaries.length > 0) {
        message += `🎂記念日\n`;
        userAnniversaries.forEach(a => {
          const countdownText = a.isToday ? "🎉今日！" : (a.diffDays === 1 ? "✨明日！" : `あと${a.diffDays}日`);
          message += `・${a.title} (${countdownText})\n`;
        });
        message += `\n`;
      }

      // LINEメッセージ送信
      sendLineMessage(lineUid, message, LINE_ACCESS_TOKEN);
    });

  } catch (e) {
    Logger.log('Notification Error: ' + e.toString());
  }
}

/**
 * 予定開始10分前のリマインダー通知を実行する関数 (毎分トリガー推奨)
 */
function checkAndSendEventReminders() {
  try {
    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);

    // 10分後の日本時間(JST)の日付と時間を取得
    const now = new Date();
    const tenMinutesLater = new Date(now.getTime() + 10 * 60 * 1000);
    const targetDateStr = Utilities.formatDate(tenMinutesLater, "Asia/Tokyo", "yyyy-MM-dd");
    const targetTimeStr = Utilities.formatDate(tenMinutesLater, "Asia/Tokyo", "HH:mm");

    // 各コレクションからデータ取得
    const usersDocs = firestore.getDocuments('users');
    const eventsDocs = firestore.getDocuments('events');
    const lineMessagingIdsDocs = firestore.getDocuments('lineMessagingIds');

    const users = usersDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const events = eventsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));

    // LINE Messaging IDsをマッピング
    const lineMessagingIds = {};
    lineMessagingIdsDocs.forEach(doc => {
      const uid = doc.name.split('/').pop();
      lineMessagingIds[uid] = doc.obj.lineUid;
    });

    // 10分後に開始されるイベントをフィルタリング (終日イベントは除外)
    const targetEvents = events.filter(e => {
      if (e.isAllDay || !e.startTime) return false;
      return e.startDate === targetDateStr && e.startTime === targetTimeStr;
    });

    if (targetEvents.length === 0) return;

    users.forEach(user => {
      const lineUid = lineMessagingIds[user.id];
      if (!lineUid) return;

      const nickname = user.nickname || "あなた";

      // 対象ユーザーに関連するイベント（カップル用 or 自身）
      const userReminders = targetEvents.filter(e => e.type === 'couple' || e.uid === user.id);

      if (userReminders.length > 0) {
        userReminders.forEach(e => {
          let message = `🔔予定のリマインダー\n`;
          message += `${nickname}ちゃん、10分後に以下の予定があるよ！準備はできたかな？🍬\n\n`;
          message += `⏰ ${e.startTime}〜\n`;
          message += `📝 ${e.title}\n`;
          if (e.note) {
            message += `💡 メモ: ${e.note}\n`;
          }
          message += `\nCANDYで詳細を見る：\n${BASE_URL}/home`;

          sendLineMessage(lineUid, message, LINE_ACCESS_TOKEN);
        });
      }
    });

  } catch (e) {
    Logger.log('Reminder Error: ' + e.toString());
  }
}

// 2つの日付文字列("YYYY-MM-DD")の差分日数を計算するヘルパー関数
function calculateDiffDays(d1Str, d2Str) {
  const d1 = new Date(d1Str.replace(/-/g, '/'));
  const d2 = new Date(d2Str.replace(/-/g, '/'));
  return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// 記念日のMM-DD形式から、次の記念日までの日数を計算する関数
function calculateAnniversaryDiff(dateStr) {
  // GASの環境タイムゾーンによらず日本時間(JST)の今日(00:00:00)を基準にする
  const todayDate = new Date();
  const jstDateStr = Utilities.formatDate(todayDate, "Asia/Tokyo", "yyyy-MM-dd");
  const partsToday = jstDateStr.split("-").map(Number);
  const today = new Date(partsToday[0], partsToday[1] - 1, partsToday[2], 0, 0, 0, 0);

  const parts = dateStr.split("-");
  const m = parseInt(parts[0], 10);
  const d = parseInt(parts[1], 10);
  let nextDate = new Date(today.getFullYear(), m - 1, d);

  // 既に今年の記念日が過ぎている場合は来年
  if (nextDate.getTime() < today.getTime()) {
    nextDate = new Date(today.getFullYear() + 1, m - 1, d);
  }

  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return { diffDays: diffDays, isToday: diffDays === 0 };
}

// LINEにメッセージを送信する関数
function sendLineMessage(to, text, token) {
  if (!to || !token) return;
  const options = {
    'method': 'post',
    'contentType': 'application/json',
    'headers': { 'Authorization': 'Bearer ' + token },
    'payload': JSON.stringify({ to: to, messages: [{ type: 'text', text: text }] }),
    'muteHttpExceptions': true
  };
  UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
}
