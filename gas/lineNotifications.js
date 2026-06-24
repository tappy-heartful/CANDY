/**
 * CANDY LINE通知自動送信スクリプト (GAS用)
 *
 * 【このスクリプトがやること】
 * 1. 毎朝の定期通知 (sendDailyMorningNotifications)
 *    - 各ユーザーの指定時間（例: 朝7時や8時）に送信。
 *    - 各ユーザーに対して、今日の予定、未完了のTODO、直近の記念日をLINEで送信。
 * 2. 予定の数分前リマインダー通知 (sendEventReminders)
 *    - 前回の実行時間以降、設定された時間（デフォルト10分前など）を迎えた予定がある場合、対象のユーザーにリマインダーをLINEで送信。
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
 * すべての通知（朝のメッセージ＆予定リマインダー）を監視・送信する統合関数
 * GASのエディタでこの関数に対して「時間主導型」-「分ベースのタイマー」-「1分おき」のトリガーを設定してください。
 */
function checkAllNotifications() {
  try {
    const now = new Date();
    const currentTimeStr = Utilities.formatDate(now, "Asia/Tokyo", "HH:mm");

    // 1分おきトリガー用の前回実行時刻を取得（スキップ・遅延対策）
    const lastCheckStr = props.getProperty('LAST_REMINDER_CHECK_TIME');
    const lastCheck = lastCheckStr ? new Date(Number(lastCheckStr)) : new Date(now.getTime() - 5 * 60 * 1000); // 取得できない場合は仮で5分前
    props.setProperty('LAST_REMINDER_CHECK_TIME', now.getTime().toString());

    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);

    // 1. まずは最小限の共通データをフェッチ（users, lineMessagingIds, notificationSettings）
    // これにより、通知対象がいない時間帯の無駄な通信を削減します
    const usersDocs = firestore.getDocuments('users');
    const lineMessagingIdsDocs = firestore.getDocuments('lineMessagingIds');
    let settingsDocs = [];
    try {
      settingsDocs = firestore.getDocuments('notificationSettings');
    } catch (e) {
      Logger.log('Failed to fetch notificationSettings: ' + e.toString());
    }

    const users = usersDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    
    // LINE Messaging IDsをマッピング
    const lineMessagingIds = {};
    lineMessagingIdsDocs.forEach(doc => {
      const uid = doc.name.split('/').pop();
      lineMessagingIds[uid] = doc.obj.lineUid;
    });

    // 通知設定をマッピング
    const settingsMap = {};
    settingsDocs.forEach(doc => {
      const uid = doc.name.split('/').pop();
      settingsMap[uid] = doc.obj;
    });

    // 朝の通知の送信対象ユーザーを抽出
    const morningTargets = users.filter(user => {
      if (!lineMessagingIds[user.id]) return false;
      const setting = settingsMap[user.id] || {};
      const morningEnabled = setting.morningEnabled !== false; // デフォルト true
      const morningTime = setting.morningTime || "08:00"; // デフォルト 08:00
      return morningEnabled && morningTime === currentTimeStr;
    });

    // リマインダーの送信対象ユーザーを抽出（有効なユーザーのみ）
    const reminderTargets = users.filter(user => {
      if (!lineMessagingIds[user.id]) return false;
      const setting = settingsMap[user.id] || {};
      return setting.eventReminderEnabled !== false; // デフォルト true
    });

    // 送信対象が誰もいない場合はここで早期リターンし、重いデータ（events, todos等）の取得をスキップする
    if (morningTargets.length === 0 && reminderTargets.length === 0) {
      return;
    }

    // 2. 必要な場合のみ、残りのデータを取得
    let events = [];
    if (morningTargets.length > 0 || reminderTargets.length > 0) {
      const eventsDocs = firestore.getDocuments('events');
      events = eventsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    }

    let todos = [];
    let anniversaries = [];
    if (morningTargets.length > 0) {
      const todosDocs = firestore.getDocuments('todos');
      const anniversariesDocs = firestore.getDocuments('anniversaries');
      todos = todosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
      anniversaries = anniversariesDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    }

    // 3. 各通知処理を実行（フェッチ済みの共通データを渡す）
    if (morningTargets.length > 0) {
      sendDailyMorningNotifications(morningTargets, events, todos, anniversaries, lineMessagingIds);
    }

    if (reminderTargets.length > 0) {
      sendEventReminders(reminderTargets, events, lineMessagingIds, now, lastCheck, settingsMap);
    }

  } catch (e) {
    Logger.log('checkAllNotifications Error: ' + e.toString());
  }
}

/**
 * 毎朝の定期通知を対象ユーザーに送信する
 */
function sendDailyMorningNotifications(targets, events, todos, anniversaries, lineMessagingIds) {
  try {
    const todayDate = new Date();
    const todayStr = Utilities.formatDate(todayDate, "Asia/Tokyo", "yyyy-MM-dd");

    targets.forEach(user => {
      const lineUid = lineMessagingIds[user.id];
      if (!lineUid) return;

      const nickname = user.nickname || "あなた";
      const partnerUid = user.partnerUid || null;

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
    Logger.log('Morning Notification Error: ' + e.toString());
  }
}

/**
 * 予定開始の数分前のリマインダー通知を実行する (前回チェック時からの範囲判定)
 */
function sendEventReminders(targets, events, lineMessagingIds, now, lastCheck, settingsMap) {
  try {
    targets.forEach(user => {
      const lineUid = lineMessagingIds[user.id];
      if (!lineUid) return;

      const nickname = user.nickname || "あなた";

      // 設定の取得
      const setting = settingsMap[user.id] || {};
      const eventReminderMinutes = setting.eventReminderMinutes !== undefined ? setting.eventReminderMinutes : 10; // デフォルト 10分

      // 前回チェック時と今回チェック時のリマインダー対象期間を算出する (トリガ遅延・スキップ対策)
      const currentTargetTime = new Date(now.getTime() + eventReminderMinutes * 60 * 1000);
      const lastTargetTime = new Date(lastCheck.getTime() + eventReminderMinutes * 60 * 1000);

      // 対象時間内に開始されるイベントをフィルタリング (終日イベントは除外)
      const userReminders = events.filter(e => {
        if (e.isAllDay || !e.startTime) return false;
        
        const isRelated = e.type === 'couple' || e.uid === user.id;
        if (!isRelated) return false;

        // イベント開始時刻を Date オブジェクトにパース (JST基準)
        const eventTime = parseJSTDateTime(e.startDate, e.startTime);
        if (!eventTime) return false;

        const eventTimeMs = eventTime.getTime();
        // 前回のターゲット時刻より後、かつ今回のターゲット時刻までに開始されるものを抽出
        return eventTimeMs > lastTargetTime.getTime() && eventTimeMs <= currentTargetTime.getTime();
      });

      if (userReminders.length > 0) {
        const hour = Number(Utilities.formatDate(now, "Asia/Tokyo", "H"));
        let greeting = "こんにちは！☀️";
        if (hour >= 5 && hour < 11) {
          greeting = "おはよう！☀️";
        } else if (hour >= 18 || hour < 5) {
          greeting = "こんばんは！🌙";
        }

        userReminders.forEach(e => {
          let message = `${greeting}\n`;
          message += `${nickname}ちゃん、${eventReminderMinutes}分後に以下の予定があるよ！準備はできたかな？🍬\n\n`;
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
    Logger.log('Event Reminder Error: ' + e.toString());
  }
}

/**
 * "YYYY-MM-DD" と "HH:mm" から日本時間(JST)の Date オブジェクトを作成するヘルパー
 */
function parseJSTDateTime(dateStr, timeStr) {
  try {
    const dateParts = dateStr.split("-").map(Number);
    const timeParts = timeStr.split(":").map(Number);
    
    // GAS環境は通常タイムゾーンが Asia/Tokyo に設定されているため、
    // new Date で年月日・時分を指定することでJSTとしてパースされます。
    return new Date(dateParts[0], dateParts[1] - 1, dateParts[2], timeParts[0], timeParts[1], 0, 0);
  } catch (e) {
    Logger.log('parseJSTDateTime Error: ' + e.toString());
    return null;
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
