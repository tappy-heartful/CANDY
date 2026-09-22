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

// LINEアクセストークン（定期通知用＆イベント通知用で公式アカウントを分離）
// GASの「プロジェクトの設定」>「スクリプトプロパティ」で以下を設定してください：
// ・定期通知用（朝・夜の定期通知）：LINE_PERIODIC_ACCESS_TOKEN
// ・イベント通知用（予定リマインド通知）：LINE_EVENT_ACCESS_TOKEN
// ※未設定の場合は従来の LINE_CHANNEL_ACCESS_TOKEN をフォールバックとして使用します。
const LINE_PERIODIC_ACCESS_TOKEN =
  props.getProperty('LINE_PERIODIC_ACCESS_TOKEN') ||
  props.getProperty('LINE_CHANNEL_ACCESS_TOKEN_PERIODIC') ||
  props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

const LINE_EVENT_ACCESS_TOKEN =
  props.getProperty('LINE_EVENT_ACCESS_TOKEN') ||
  props.getProperty('LINE_CHANNEL_ACCESS_TOKEN_EVENT') ||
  props.getProperty('LINE_CHANNEL_ACCESS_TOKEN');

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

const nightCuteMessages = [
  "今日も一日本当にお疲れさま✨ ゆっくり休んでね🛌",
  "〇〇ちゃん、今日も一日がんばってえらかったね！ぎゅーっ🫂💕",
  "あったかいお布団でいい夢見てね🌙 いつもありがとう🌸",
  "今日も〇〇ちゃんの笑顔が見られて幸せだったよ🍀 おやすみ✨",
  "明日も素敵な一日になりますように。ゆっくり心と体を休めてね🍵",
  "〇〇ちゃんが安心して眠れますように。いつでも味方だよ🌙",
  "今日もお疲れさま！明日に備えてリラックスしてね🍮💤",
];

/**
 * すべての通知（朝のメッセージ＆夜のお休み通知＆予定リマインダー）を監視・送信する統合関数
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

    // 夜のお休み通知の送信対象ユーザーを抽出
    const nightTargets = users.filter(user => {
      if (!lineMessagingIds[user.id]) return false;
      const setting = settingsMap[user.id] || {};
      const nightEnabled = setting.nightEnabled !== false; // デフォルト true
      const nightTime = setting.nightTime || "22:00"; // デフォルト 22:00
      return nightEnabled && nightTime === currentTimeStr;
    });

    // リマインダーの送信対象ユーザーを抽出（有効なユーザーのみ）
    const reminderTargets = users.filter(user => {
      if (!lineMessagingIds[user.id]) return false;
      const setting = settingsMap[user.id] || {};
      return setting.eventReminderEnabled !== false; // デフォルト true
    });

    // 送信対象が誰もいない場合はここで早期リターンし、重いデータ（events, todos等）の取得をスキップする
    if (morningTargets.length === 0 && reminderTargets.length === 0 && nightTargets.length === 0) {
      return;
    }

    // 2. 必要な場合のみ、残りのデータを取得
    let events = [];
    if (morningTargets.length > 0 || reminderTargets.length > 0 || nightTargets.length > 0) {
      const eventsDocs = firestore.getDocuments('events');
      events = eventsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    }

    let todos = [];
    let anniversaries = [];
    let garbageSchedules = [];

    if (morningTargets.length > 0 || nightTargets.length > 0) {
      const todosDocs = firestore.getDocuments('todos');
      todos = todosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    }

    if (morningTargets.length > 0) {
      const anniversariesDocs = firestore.getDocuments('anniversaries');
      anniversaries = anniversariesDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    }

    if (nightTargets.length > 0) {
      try {
        const garbageDocs = firestore.getDocuments('garbageSchedules');
        garbageSchedules = garbageDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
      } catch (e) {
        Logger.log('Failed to fetch garbageSchedules: ' + e.toString());
      }
    }

    // 3. 各通知処理を実行（フェッチ済みの共通データを渡す）
    if (morningTargets.length > 0) {
      sendDailyMorningNotifications(morningTargets, events, todos, anniversaries, lineMessagingIds);
    }

    if (nightTargets.length > 0) {
      sendDailyNightNotifications(nightTargets, events, todos, garbageSchedules, lineMessagingIds);
    }

    if (reminderTargets.length > 0) {
      sendEventReminders(reminderTargets, events, lineMessagingIds, now, lastCheck, settingsMap);
    }

  } catch (e) {
    Logger.log('checkAllNotifications Error: ' + e.toString());
  }
}

/**
 * イベントが通知対象かどうか、および「2人」「自分」の属性を判定する
 */
function checkEventRelation(e, userId, partnerUid) {
  const typeStr = (e.type || "").toString().trim().toLowerCase();
  const isCoupleType = typeStr === "couple";
  const isMe = e.uid === userId;
  const isPartner = partnerUid && e.uid === partnerUid;

  // 1. type が 明示的に couple の場合
  if (isCoupleType) {
    return { isTarget: true, isCouple: true, label: "【2人】" };
  }
  // 2. 自分が作成したイベント
  if (isMe) {
    return { isTarget: true, isCouple: false, label: "【自分】" };
  }
  // 3. パートナーが作成し、かつ type が明示的に personal でない場合（type未指定等の救済）
  if (isPartner && typeStr !== "personal") {
    return { isTarget: true, isCouple: true, label: "【2人】" };
  }

  return { isTarget: false, isCouple: false, label: "" };
}

/**
 * TODOが通知対象かどうか、および「2人」「自分」の属性を判定する
 */
function checkTodoRelation(t, userId, partnerUid) {
  const typeStr = (t.type || "").toString().trim().toLowerCase();
  const isCoupleType = typeStr === "couple";
  const isMe = t.uid === userId;
  const isPartner = partnerUid && t.uid === partnerUid;

  // 1. type が 明示的に couple の場合
  if (isCoupleType) {
    return { isTarget: true, isCouple: true, label: "【2人】" };
  }
  // 2. 自分が担当または作成したTODO
  if (isMe) {
    return { isTarget: true, isCouple: false, label: "【自分】" };
  }
  // 3. パートナーが作成し、かつ type が明示的に personal でない場合（type未指定等の救済）
  if (isPartner && typeStr !== "personal") {
    return { isTarget: true, isCouple: true, label: "【2人】" };
  }

  return { isTarget: false, isCouple: false, label: "" };
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
      const userEvents = events
        .map(e => {
          const relation = checkEventRelation(e, user.id, partnerUid);
          return relation.isTarget ? { ...e, isCouple: relation.isCouple, label: relation.label } : null;
        })
        .filter(Boolean);

      // 今日のイベント
      const todaysEvents = userEvents
        .filter(e => e.startDate <= todayStr && e.endDate >= todayStr)
        .sort((a, b) => {
          // 終日優先、同一なら時間順、同一なら2人を優先
          if (a.isAllDay && !b.isAllDay) return -1;
          if (!a.isAllDay && b.isAllDay) return 1;
          const timeA = a.startTime || "24:00";
          const timeB = b.startTime || "24:00";
          if (timeA !== timeB) return timeA.localeCompare(timeB);
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        });

      // 直近の未来イベント（明日以降開始）をソート
      const nextEvents = userEvents
        .filter(e => e.startDate > todayStr)
        .sort((a, b) => {
          if (a.startDate !== b.startDate) return a.startDate.localeCompare(b.startDate);
          const timeA = a.startTime || "24:00";
          const timeB = b.startTime || "24:00";
          if (timeA !== timeB) return timeA.localeCompare(timeB);
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        })
        .slice(0, 3);

      // 未完了のTODO（カップル用 or 自身）
      const allUserTodos = todos
        .filter(t => !t.isCompleted)
        .map(t => {
          const relation = checkTodoRelation(t, user.id, partnerUid);
          return relation.isTarget ? { ...t, isCouple: relation.isCouple, label: relation.label } : null;
        })
        .filter(Boolean);

      // 1. 期限切れのTODO (日付があり、今日より前)
      const overdueTodos = allUserTodos
        .filter(t => t.date && t.date < todayStr)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        });

      // 2. 本日のTODO (日付があり、今日)
      const todaysTodos = allUserTodos
        .filter(t => t.date === todayStr)
        .sort((a, b) => {
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        });

      // 3. 直近の未来TODO (日付があり、明日以降、最大3件)
      const nextTodos = allUserTodos
        .filter(t => t.date && t.date > todayStr)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        })
        .slice(0, 3);

      // 4. 期限なしのTODO (日付なし、または空文字列)
      const noDeadlineTodos = allUserTodos
        .filter(t => !t.date || t.date === "")
        .sort((a, b) => {
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return (a.createdAt || 0) - (b.createdAt || 0);
        });

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
          message += `・本日 ${timeStr} ${e.label}${e.title}\n`;
          hasEvents = true;
        });
      }
      if (nextEvents.length > 0) {
        nextEvents.forEach(e => {
          const diffDays = calculateDiffDays(todayStr, e.startDate);
          message += `・${e.label}${e.title} (あと${diffDays}日)\n`;
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
          message += `・${t.label}${t.title} (${diffDays}日前)\n`;
        });
        hasTodos = true;
      }

      // ② 今日・これからの予定
      const activeLines = [];
      if (todaysTodos.length > 0) {
        todaysTodos.forEach(t => {
          activeLines.push(`・本日 ${t.label}${t.title}`);
        });
      }
      if (nextTodos.length > 0) {
        nextTodos.forEach(t => {
          const diffDays = calculateDiffDays(todayStr, t.date);
          activeLines.push(`・${t.label}${t.title} (あと${diffDays}日)`);
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
          message += `・${t.label}${t.title}\n`;
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

      // LINEメッセージ送信 (定期通知用公式アカウント)
      sendLineMessage(lineUid, message, LINE_PERIODIC_ACCESS_TOKEN);
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
      const partnerUid = user.partnerUid || null;

      // 設定の取得
      const setting = settingsMap[user.id] || {};
      let minutesList = [10]; // デフォルト 10分
      if (setting.eventReminderMinutes !== undefined) {
        if (Array.isArray(setting.eventReminderMinutes)) {
          minutesList = setting.eventReminderMinutes;
        } else {
          minutesList = [Number(setting.eventReminderMinutes)];
        }
      }

      minutesList.forEach(minutes => {
        // 前回チェック時と今回チェック時のリマインダー対象期間を算出する (トリガ遅延・スキップ対策)
        const currentTargetTime = new Date(now.getTime() + minutes * 60 * 1000);
        const lastTargetTime = new Date(lastCheck.getTime() + minutes * 60 * 1000);

        // 対象時間内に開始されるイベントをフィルタリング (終日イベントは除外)
        const userReminders = events.map(e => {
          if (e.isAllDay || !e.startTime) return null;
          
          const relation = checkEventRelation(e, user.id, partnerUid);
          if (!relation.isTarget) return null;

          // イベント開始時刻を Date オブジェクトにパース (JST基準)
          const eventTime = parseJSTDateTime(e.startDate, e.startTime);
          if (!eventTime) return null;

          const eventTimeMs = eventTime.getTime();
          // 前回のターゲット時刻より後、かつ今回のターゲット時刻までに開始されるものを抽出
          if (eventTimeMs > lastTargetTime.getTime() && eventTimeMs <= currentTargetTime.getTime()) {
            return { ...e, isCouple: relation.isCouple, label: relation.label };
          }
          return null;
        }).filter(Boolean);

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
            const timeText = minutes === 0 ? "まもなく" : `${minutes}分後に`;
            message += `${nickname}ちゃん、${timeText}以下の予定があるよ！準備はできたかな？🍬\n\n`;
            message += `⏰ ${e.startTime}〜\n`;
            message += `📝 ${e.label}${e.title}\n`;
            if (e.note) {
              message += `💡 メモ: ${e.note}\n`;
            }
            message += `\nCANDYで詳細を見る：\n${BASE_URL}/home`;

            // LINEメッセージ送信 (イベント通知用公式アカウント)
            sendLineMessage(lineUid, message, LINE_EVENT_ACCESS_TOKEN);
          });
        }
      });
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

/**
 * 指定日がごみ収集スケジュールに合致するか判定する (JST)
 */
function isGarbageCollectionDay(schedule, date) {
  if (!schedule) return false;

  // 1. 月判定 (1〜12)
  const month = date.getMonth() + 1;
  if (schedule.monthType === "even" && month % 2 !== 0) return false;
  if (schedule.monthType === "odd" && month % 2 === 0) return false;
  if (schedule.monthType === "custom") {
    if (!schedule.customMonths || schedule.customMonths.indexOf(month) === -1) return false;
  }

  // 2. 曜日判定 (0: 日 〜 6: 土)
  const dayOfWeek = date.getDay();
  if (!schedule.daysOfWeek || schedule.daysOfWeek.indexOf(dayOfWeek) === -1) return false;

  // 3. 週判定 (every / biweekly / nth)
  if (schedule.weekType === "biweekly") {
    if (!schedule.biweeklyStartDate) return false;
    const startParts = schedule.biweeklyStartDate.split("-").map(Number);
    if (startParts.length !== 3) return false;
    const uttStart = Date.UTC(startParts[0], startParts[1] - 1, startParts[2]);
    const uttTarget = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const diffDays = Math.round((uttTarget - uttStart) / (1000 * 60 * 60 * 24));
    if (diffDays < 0 || diffDays % 14 !== 0) return false;
  } else if (schedule.weekType === "nth") {
    const nthWeek = Math.ceil(date.getDate() / 7);
    if (!schedule.nthWeeks || schedule.nthWeeks.indexOf(nthWeek) === -1) return false;
  }

  return true;
}

/**
 * 毎夜のお休み通知を対象ユーザーに送信する
 * （明日のイベント、明日のTODO、今日・明日のごみ出し情報）
 */
function sendDailyNightNotifications(targets, events, todos, garbageSchedules, lineMessagingIds) {
  try {
    const todayDate = new Date();
    const todayStr = Utilities.formatDate(todayDate, "Asia/Tokyo", "yyyy-MM-dd");
    const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = Utilities.formatDate(tomorrowDate, "Asia/Tokyo", "yyyy-MM-dd");

    targets.forEach(user => {
      const lineUid = lineMessagingIds[user.id];
      if (!lineUid) return;

      const nickname = user.nickname || "あなた";
      const partnerUid = user.partnerUid || null;

      // 対象ユーザーのイベントをフィルタリング（カップル用 or 自身のイベント）
      const userEvents = events
        .map(e => {
          const relation = checkEventRelation(e, user.id, partnerUid);
          return relation.isTarget ? { ...e, isCouple: relation.isCouple, label: relation.label } : null;
        })
        .filter(Boolean);

      // 明日のイベント
      const tomorrowsEvents = userEvents
        .filter(e => e.startDate <= tomorrowStr && e.endDate >= tomorrowStr)
        .sort((a, b) => {
          if (a.isAllDay && !b.isAllDay) return -1;
          if (!a.isAllDay && b.isAllDay) return 1;
          const timeA = a.startTime || "24:00";
          const timeB = b.startTime || "24:00";
          if (timeA !== timeB) return timeA.localeCompare(timeB);
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        });

      // 未完了TODO（カップル用 or 自身）
      const allUserTodos = todos
        .filter(t => !t.isCompleted)
        .map(t => {
          const relation = checkTodoRelation(t, user.id, partnerUid);
          return relation.isTarget ? { ...t, isCouple: relation.isCouple, label: relation.label } : null;
        })
        .filter(Boolean);

      // 1. 明日期日のTODO
      const tomorrowDueTodos = allUserTodos
        .filter(t => t.date === tomorrowStr)
        .sort((a, b) => {
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        });

      // 2. やり残し・今日以前の未完了TODO (今日または期限切れ)
      const overdueTodos = allUserTodos
        .filter(t => t.date && t.date <= todayStr)
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          if (a.isCouple && !b.isCouple) return -1;
          if (!a.isCouple && b.isCouple) return 1;
          return 0;
        });

      // ごみ出し情報（明日・今日）
      const tomorrowGarbage = garbageSchedules.filter(s => isGarbageCollectionDay(s, tomorrowDate));
      const todayGarbage = garbageSchedules.filter(s => isGarbageCollectionDay(s, todayDate));

      const cuteMessage = nightCuteMessages[Math.floor(Math.random() * nightCuteMessages.length)].replace(/〇〇/g, nickname);

      // ---- メッセージの構築 ----
      let message = `こんばんは！CANDYだよ🍬\n${cuteMessage}\n\nあしたの予定をまとめたよ🌙\nゆっくり休んでいい夢見てね✨\n\n`;

      // 📅明日のイベント
      message += `📅明日のイベント\n`;
      if (tomorrowsEvents.length > 0) {
        tomorrowsEvents.forEach(e => {
          const timeStr = e.isAllDay ? "終日" : (e.startTime ? `${e.startTime}〜` : "時間未定");
          message += `・${timeStr} ${e.label}${e.title}\n`;
        });
      } else {
        message += `予定は特にないよ✨\n`;
      }
      message += `\n`;

      // 📋明日のTODO
      message += `📋明日のTODO\n`;
      let hasTodos = false;
      if (tomorrowDueTodos.length > 0) {
        message += `【明日期日】\n`;
        tomorrowDueTodos.forEach(t => {
          message += `・${t.label}${t.title}\n`;
        });
        hasTodos = true;
      }
      if (overdueTodos.length > 0) {
        message += `【やり残しTODO】\n`;
        overdueTodos.forEach(t => {
          const diffDays = calculateDiffDays(t.date, todayStr);
          const dayLabel = diffDays === 0 ? "今日まで" : `${diffDays}日前`;
          message += `・${t.label}${t.title} (${dayLabel})\n`;
        });
        hasTodos = true;
      }
      if (!hasTodos) {
        message += `明日のTODOはすっきりクリア！👏\n`;
      }
      message += `\n`;

      // 🗑️ごみ出し情報
      message += `🗑️ごみ出し情報\n`;
      let hasGarbage = false;
      if (tomorrowGarbage.length > 0) {
        tomorrowGarbage.forEach(g => {
          const noteStr = g.note ? ` (${g.note})` : "";
          message += `・明日: ${g.name}${noteStr}\n`;
        });
        message += `※夜のうちにまとめておくと安心だよ✨\n`;
        hasGarbage = true;
      }
      if (todayGarbage.length > 0) {
        todayGarbage.forEach(g => {
          message += `・本日: ${g.name}\n`;
        });
        hasGarbage = true;
      }
      if (!hasGarbage) {
        message += `今日・明日のごみ収集はありません🍀\n`;
      }
      message += `\n`;

      message += `CANDYを開く：\n${BASE_URL}/home`;

      // LINEメッセージ送信 (定期通知用公式アカウント)
      sendLineMessage(lineUid, message, LINE_PERIODIC_ACCESS_TOKEN);
    });

  } catch (e) {
    Logger.log('Night Notification Error: ' + e.toString());
  }
}

