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
 * キャッシュ付きでFirestoreのドキュメント一覧を取得するヘルパー (15分間キャッシュ)
 * users, lineMessagingIds, notificationSettings などのマスタデータ読み取り回数を激減させます
 */
function getCachedFirestoreDocuments(firestore, collectionName, cacheMinutes) {
  cacheMinutes = cacheMinutes || 15;
  const cache = CacheService.getScriptCache();
  const cacheKey = 'candy_cache_' + collectionName;
  const cachedJson = cache.get(cacheKey);
  if (cachedJson) {
    try {
      return JSON.parse(cachedJson);
    } catch (e) {}
  }

  const docs = firestore.getDocuments(collectionName);
  const data = docs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));

  try {
    cache.put(cacheKey, JSON.stringify(data), cacheMinutes * 60);
  } catch (e) {
    Logger.log('Cache put failed for ' + collectionName + ': ' + e.toString());
  }

  return data;
}

/**
 * リマインダー／夜通知用に「今日〜明日」の直近イベントのみをクエリ取得するヘルパー
 * 全件（過去〜未来すべての数百件）を毎分・5分ごとに取得するのを防ぎ、読み取りを数件に激減させます
 */
function fetchUpcomingEvents(firestore, todayStr, tomorrowStr) {
  try {
    if (firestore.query) {
      const q = firestore.query('events');
      const queryObj = (q.Where ? q.Where('startDate', '>=', todayStr).Where('startDate', '<=', tomorrowStr)
                                : q.where('startDate', '>=', todayStr).where('startDate', '<=', tomorrowStr));
      const res = queryObj.Execute ? queryObj.Execute() : queryObj.execute();
      if (Array.isArray(res)) {
        return res.map(doc => ({
          id: doc.name ? doc.name.split('/').pop() : (doc.id || ''),
          ...(doc.obj || doc.fields || doc)
        }));
      }
    }
  } catch (err) {
    Logger.log('Firestore query failed for upcoming events: ' + err.toString());
  }

  // クエリが失敗した、または未対応の場合のフォールバック
  try {
    const eventsDocs = firestore.getDocuments('events');
    return eventsDocs
      .map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }))
      .filter(e => (e.startDate >= todayStr && e.startDate <= tomorrowStr) || (e.startDate <= todayStr && e.endDate >= todayStr));
  } catch (e) {
    Logger.log('Failed to fetch events fallback: ' + e.toString());
    return [];
  }
}

/**
 * 指定の時刻（HH:mm）が直近の実行期間（lastCheck 〜 now）の間に到来したか判定するヘルパー
 * 5分おきトリガーでも確実かつ同日に二重送信されないようにします
 */
function isTimeToTrigger(targetTimeStr, lastCheck, now, lastSentPropKey) {
  if (!targetTimeStr) return false;
  const todayStr = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd");

  // 今日すでに送信済みならスキップ
  const lastSentDate = props.getProperty(lastSentPropKey);
  if (lastSentDate === todayStr) {
    return false;
  }

  const parts = targetTimeStr.split(":").map(Number);
  if (parts.length !== 2) return false;
  const targetDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), parts[0], parts[1], 0, 0);
  const targetMs = targetDate.getTime();

  const lastCheckMs = lastCheck ? lastCheck.getTime() : (now.getTime() - 6 * 60 * 1000);
  // 前回チェック〜今回チェックまでの間にその時刻が含まれていたか判定
  return targetMs > lastCheckMs && targetMs <= now.getTime();
}

/**
 * すべての通知（朝のメッセージ＆夜のお休み通知＆予定リマインダー）を監視・送信する統合関数
 * 【推奨トリガー設定】
 * GASのエディタでこの関数に対して「時間主導型」-「分ベースのタイマー」-「5分おき」のトリガーを設定してください。
 * （※1分おきでも正常に動作しますが、5分おきにすることで実行回数とFirestore読み取り量を大幅に削減できます）
 */
function checkAllNotifications() {
  try {
    const now = new Date();
    const todayStr = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd");
    const tomorrowDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = Utilities.formatDate(tomorrowDate, "Asia/Tokyo", "yyyy-MM-dd");

    // 前回実行時刻を取得（5分おきトリガー等の遅延・スキップ対策）
    const lastCheckStr = props.getProperty('LAST_REMINDER_CHECK_TIME');
    const lastCheck = lastCheckStr ? new Date(Number(lastCheckStr)) : new Date(now.getTime() - 6 * 60 * 1000);
    props.setProperty('LAST_REMINDER_CHECK_TIME', now.getTime().toString());

    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);

    // 1. キャッシュを活用してマスタデータを取得 (15分間キャッシュ)
    const users = getCachedFirestoreDocuments(firestore, 'users', 15);
    const lineMessagingIdsList = getCachedFirestoreDocuments(firestore, 'lineMessagingIds', 15);
    let settingsList = [];
    try {
      settingsList = getCachedFirestoreDocuments(firestore, 'notificationSettings', 15);
    } catch (e) {
      Logger.log('Failed to fetch notificationSettings: ' + e.toString());
    }
    
    // LINE Messaging IDsをマッピング
    const lineMessagingIds = {};
    lineMessagingIdsList.forEach(item => {
      lineMessagingIds[item.id] = item.lineUid;
    });

    // 通知設定をマッピング
    const settingsMap = {};
    settingsList.forEach(item => {
      settingsMap[item.id] = item;
    });

    // 朝の通知の送信対象ユーザーを抽出（5分おきトリガー対応：lastCheck〜nowの間に時間到来したか判定）
    const morningTargets = users.filter(user => {
      if (!lineMessagingIds[user.id]) return false;
      const setting = settingsMap[user.id] || {};
      const morningEnabled = setting.morningEnabled !== false; // デフォルト true
      const morningTime = setting.morningTime || "08:00"; // デフォルト 08:00
      return morningEnabled && isTimeToTrigger(morningTime, lastCheck, now, 'LAST_MORNING_SENT_' + user.id);
    });

    // 夜のお休み通知の送信対象ユーザーを抽出（5分おきトリガー対応）
    const nightTargets = users.filter(user => {
      if (!lineMessagingIds[user.id]) return false;
      const setting = settingsMap[user.id] || {};
      const nightEnabled = setting.nightEnabled !== false; // デフォルト true
      const nightTime = setting.nightTime || "22:00"; // デフォルト 22:00
      return nightEnabled && isTimeToTrigger(nightTime, lastCheck, now, 'LAST_NIGHT_SENT_' + user.id);
    });

    // リマインダーの送信対象ユーザーを抽出（有効なユーザーのみ）
    const reminderTargets = users.filter(user => {
      if (!lineMessagingIds[user.id]) return false;
      const setting = settingsMap[user.id] || {};
      return setting.eventReminderEnabled !== false; // デフォルト true
    });

    // 送信対象が誰もいない場合は早期リターン
    if (morningTargets.length === 0 && reminderTargets.length === 0 && nightTargets.length === 0) {
      return;
    }

    // 2. 必要な場合のみ、イベントデータを取得
    // ★重要：通常のリマインダー実行では「今日〜明日」の直近イベントのみを取得（読み取り量を99%削減）
    let reminderEvents = [];
    if (reminderTargets.length > 0 || nightTargets.length > 0) {
      reminderEvents = fetchUpcomingEvents(firestore, todayStr, tomorrowStr);
    }

    // 朝の通知は直近未来3件の予定も表示するため、朝の通知対象がいる時（1日1回のみ）だけ全件取得
    let morningEvents = [];
    if (morningTargets.length > 0) {
      try {
        const eventsDocs = firestore.getDocuments('events');
        morningEvents = eventsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
      } catch (e) {
        morningEvents = reminderEvents;
      }
    }

    let todos = [];
    let anniversaries = [];
    let garbageSchedules = [];
    let photos = [];
    let albums = [];

    if (morningTargets.length > 0 || nightTargets.length > 0) {
      const todosDocs = firestore.getDocuments('todos');
      todos = todosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    }

    if (morningTargets.length > 0) {
      const anniversariesDocs = firestore.getDocuments('anniversaries');
      anniversaries = anniversariesDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));

      try {
        const photosDocs = firestore.getDocuments('photos');
        photos = photosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
      } catch (e) {
        Logger.log('Failed to fetch photos: ' + e.toString());
      }

      try {
        const albumsDocs = firestore.getDocuments('albums');
        albums = albumsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
      } catch (e) {
        Logger.log('Failed to fetch albums: ' + e.toString());
      }
    }

    if (nightTargets.length > 0) {
      try {
        const garbageDocs = firestore.getDocuments('garbageSchedules');
        garbageSchedules = garbageDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
      } catch (e) {
        Logger.log('Failed to fetch garbageSchedules: ' + e.toString());
      }
    }

    // 3. 各通知処理を実行
    if (morningTargets.length > 0) {
      sendDailyMorningNotifications(morningTargets, morningEvents, todos, anniversaries, photos, albums, lineMessagingIds, firestore);
      // 今日の送信済みフラグを記録
      morningTargets.forEach(user => {
        props.setProperty('LAST_MORNING_SENT_' + user.id, todayStr);
      });
    }

    if (nightTargets.length > 0) {
      sendDailyNightNotifications(nightTargets, reminderEvents, todos, garbageSchedules, lineMessagingIds, firestore);
      // 今日の送信済みフラグを記録
      nightTargets.forEach(user => {
        props.setProperty('LAST_NIGHT_SENT_' + user.id, todayStr);
      });
    }

    if (reminderTargets.length > 0) {
      sendEventReminders(reminderTargets, reminderEvents, lineMessagingIds, now, lastCheck, settingsMap, firestore);
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
function sendDailyMorningNotifications(targets, events, todos, anniversaries, photos, albums, lineMessagingIds, firestore) {
  try {
    const todayDate = new Date();
    const todayStr = Utilities.formatDate(todayDate, "Asia/Tokyo", "yyyy-MM-dd");

    // アルバム情報のマップ化
    const albumMap = {};
    if (albums && Array.isArray(albums)) {
      albums.forEach(a => {
        albumMap[a.id] = a;
      });
    }

    // 有効な写真の抽出（画像URLが存在し、「今日の一枚」が有効なアルバムの写真）
    // ※includeInDailyPhoto !== false (デフォルト有効)
    const validPhotos = (photos || []).filter(p => {
      if (!p.url) return false;
      const album = albumMap[p.albumId];
      if (album && album.includeInDailyPhoto === false) return false;
      return true;
    });

    // 安定ソート
    validPhotos.sort((a, b) => (a.id || "").localeCompare(b.id || ""));

    // 今日の1枚をランダムに選定
    // ※日付（todayStr）のハッシュを用いて、同日であれば送信時間が異なっても2人に同じ今日の一枚が届くように設計
    let todayPhoto = null;
    if (validPhotos.length > 0) {
      let hash = 5381;
      for (let i = 0; i < todayStr.length; i++) {
        hash = ((hash << 5) + hash) + todayStr.charCodeAt(i);
        hash |= 0;
      }
      const photoIndex = Math.abs(hash) % validPhotos.length;
      todayPhoto = validPhotos[photoIndex];
    }

    // 天気データのキャッシュ（同一地域の重複fetch防止）
    const weatherCache = {};

    targets.forEach(user => {
      const lineUid = lineMessagingIds[user.id];
      if (!lineUid) return;

      const nickname = user.nickname || "あなた";
      const partnerUid = user.partnerUid || null;

      // 居住地情報から今日の天気を取得
      const userLoc = getUserLocation(user);
      const cacheKey = userLoc.lat + "_" + userLoc.lon;
      if (!weatherCache[cacheKey]) {
        weatherCache[cacheKey] = fetchWeatherData(userLoc.lat, userLoc.lon);
      }
      const weatherDaily = weatherCache[cacheKey];

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

      // ☀️ きょうの天気 セクション
      const weatherSection = formatWeatherSection(weatherDaily, 0, userLoc.areaLabel, false);
      if (weatherSection) {
        message += weatherSection;
      }

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

      // 📸今日の一枚 セクション
      if (todayPhoto) {
        message += `📸今日の一枚\n`;
        const album = albumMap[todayPhoto.albumId];
        const albumName = album ? album.name : null;

        const photoDetails = [];
        if (albumName) {
          photoDetails.push(`「${albumName}」`);
        }
        if (todayPhoto.takenAt) {
          const takenDate = new Date(todayPhoto.takenAt);
          const takenDateStr = Utilities.formatDate(takenDate, "Asia/Tokyo", "yyyy/MM/dd");
          photoDetails.push(`${takenDateStr} 撮影`);
        }

        if (photoDetails.length > 0) {
          message += `・${photoDetails.join("・")}\n`;
        } else {
          message += `・アルバムの思い出写真をお届け✨\n`;
        }

        if (todayPhoto.albumId) {
          message += `アルバムを見る：\n${BASE_URL}/albums/${todayPhoto.albumId}\n`;
        }
        message += `\n`;
      }

      // LINEメッセージ群の構築
      const lineMessages = [
        { type: 'text', text: message }
      ];

      // 今日の一枚の写真があれば画像メッセージとして追加
      if (todayPhoto && todayPhoto.url) {
        lineMessages.push({
          type: 'image',
          originalContentUrl: todayPhoto.url,
          previewImageUrl: todayPhoto.url
        });
      }

      // LINEメッセージ送信 (定期通知用公式アカウント) と Firestore ログ記録
      const logMeta = {
        accountType: "periodic",
        accountName: "定期通知公式アカウント",
        notificationType: "morning",
        notificationTitle: "朝の定期通知",
        recipientUid: user.id,
        recipientName: nickname,
        summary: `朝の定期通知 (予定${todaysEvents.length}件 / TODO${todaysTodos.length}件${todayPhoto ? " / 写真添付" : ""})`,
        details: {
          areaLabel: userLoc.areaLabel,
          weather: weatherDaily && weatherDaily.weather_code && weatherDaily.weather_code[0] !== undefined ? {
            code: weatherDaily.weather_code[0],
            tempMax: weatherDaily.temperature_2m_max ? Math.round(weatherDaily.temperature_2m_max[0]) : null,
            tempMin: weatherDaily.temperature_2m_min ? Math.round(weatherDaily.temperature_2m_min[0]) : null,
            pop: weatherDaily.precipitation_probability_max ? weatherDaily.precipitation_probability_max[0] : 0,
          } : null,
          todayEventsCount: todaysEvents.length,
          todayEvents: todaysEvents.map(function(e) {
            return { title: e.title, startTime: e.startTime || "", isAllDay: !!e.isAllDay, label: e.label || "" };
          }),
          nextEventsCount: nextEvents.length,
          overdueTodosCount: overdueTodos.length,
          todaysTodosCount: todaysTodos.length,
          anniversariesCount: userAnniversaries.length,
          anniversaries: userAnniversaries.map(function(a) {
            return { title: a.title, diffDays: a.diffDays, isToday: !!a.isToday };
          }),
          hasDailyPhoto: !!(todayPhoto && todayPhoto.url),
          dailyPhotoAlbumName: todayPhoto && albumMap[todayPhoto.albumId] ? albumMap[todayPhoto.albumId].name : null,
        }
      };

      sendLineMessagesWithLog(firestore, lineUid, lineMessages, LINE_PERIODIC_ACCESS_TOKEN, logMeta);
    });

  } catch (e) {
    Logger.log('Morning Notification Error: ' + e.toString());
  }
}

/**
 * 予定開始の数分前のリマインダー通知を実行する (前回チェック時からの範囲判定)
 */
function sendEventReminders(targets, events, lineMessagingIds, now, lastCheck, settingsMap, firestore) {
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

            // LINEメッセージ送信 (イベント通知用公式アカウント) と Firestore ログ記録
            const logMeta = {
              accountType: "event",
              accountName: "イベント通知公式アカウント",
              notificationType: "event_reminder",
              notificationTitle: `予定リマインダー (${timeText})`,
              recipientUid: user.id,
              recipientName: nickname,
              summary: `【${timeText}】${e.label}${e.title} (${e.startTime}〜)`,
              details: {
                eventId: e.id || "",
                eventTitle: e.title || "",
                eventStartTime: e.startTime || "",
                eventStartDate: e.startDate || "",
                label: e.label || "",
                reminderMinutes: minutes,
                note: e.note || ""
              }
            };

            sendLineMessagesWithLog(firestore, lineUid, [{ type: 'text', text: message }], LINE_EVENT_ACCESS_TOKEN, logMeta);
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

// 47都道府県の代表緯度経度（県庁所在地）マップ
const PREFECTURE_COORDINATES = {
  "01": { lat: 43.0642, lon: 141.3469, name: "北海道" },
  "02": { lat: 40.8244, lon: 140.7400, name: "青森県" },
  "03": { lat: 39.7036, lon: 141.1527, name: "岩手県" },
  "04": { lat: 38.2682, lon: 140.8694, name: "宮城県" },
  "05": { lat: 39.7186, lon: 140.1024, name: "秋田県" },
  "06": { lat: 38.2404, lon: 140.3633, name: "山形県" },
  "07": { lat: 37.7500, lon: 140.4678, name: "福島県" },
  "08": { lat: 36.3418, lon: 140.4468, name: "茨城県" },
  "09": { lat: 36.5657, lon: 139.8836, name: "栃木県" },
  "10": { lat: 36.3907, lon: 139.0604, name: "群馬県" },
  "11": { lat: 35.8569, lon: 139.6489, name: "埼玉県" },
  "12": { lat: 35.6051, lon: 140.1233, name: "千葉県" },
  "13": { lat: 35.6895, lon: 139.6917, name: "東京都" },
  "14": { lat: 35.4478, lon: 139.6425, name: "神奈川県" },
  "15": { lat: 37.9022, lon: 139.0236, name: "新潟県" },
  "16": { lat: 36.6953, lon: 137.2113, name: "富山県" },
  "17": { lat: 36.5947, lon: 136.6256, name: "石川県" },
  "18": { lat: 36.0652, lon: 136.2216, name: "福井県" },
  "19": { lat: 35.6639, lon: 138.5683, name: "山梨県" },
  "20": { lat: 36.6513, lon: 138.1812, name: "長野県" },
  "21": { lat: 35.3912, lon: 136.7223, name: "岐阜県" },
  "22": { lat: 34.9756, lon: 138.3828, name: "静岡県" },
  "23": { lat: 35.1802, lon: 136.9066, name: "愛知県" },
  "24": { lat: 34.7303, lon: 136.5086, name: "三重県" },
  "25": { lat: 35.0045, lon: 135.8686, name: "滋賀県" },
  "26": { lat: 35.0211, lon: 135.7556, name: "京都府" },
  "27": { lat: 34.6863, lon: 135.5200, name: "大阪府" },
  "28": { lat: 34.6913, lon: 135.1830, name: "兵庫県" },
  "29": { lat: 34.6853, lon: 135.8327, name: "奈良県" },
  "30": { lat: 34.2260, lon: 135.1675, name: "和歌山県" },
  "31": { lat: 35.5036, lon: 134.2383, name: "鳥取県" },
  "32": { lat: 35.4723, lon: 133.0505, name: "島根県" },
  "33": { lat: 34.6618, lon: 133.9350, name: "岡山県" },
  "34": { lat: 34.3963, lon: 132.4594, name: "広島県" },
  "35": { lat: 34.1858, lon: 131.4705, name: "山口県" },
  "36": { lat: 34.0658, lon: 134.5594, name: "徳島県" },
  "37": { lat: 34.3401, lon: 134.0433, name: "香川県" },
  "38": { lat: 33.8417, lon: 132.7661, name: "愛媛県" },
  "39": { lat: 33.5597, lon: 133.5311, name: "高知県" },
  "40": { lat: 33.6064, lon: 130.4183, name: "福岡県" },
  "41": { lat: 33.2494, lon: 130.2988, name: "佐賀県" },
  "42": { lat: 32.7448, lon: 129.8737, name: "長崎県" },
  "43": { lat: 32.7898, lon: 130.7417, name: "熊本県" },
  "44": { lat: 33.2382, lon: 131.6126, name: "大分県" },
  "45": { lat: 31.9111, lon: 131.4239, name: "宮崎県" },
  "46": { lat: 31.5602, lon: 130.5581, name: "鹿児島県" },
  "47": { lat: 26.2124, lon: 127.6809, name: "沖縄県" },
};

/**
 * ユーザーの登録情報から居住地の緯度・経度・表示エリア名を取得する
 */
function getUserLocation(user) {
  let prefCode = user.prefectureCode ? String(user.prefectureCode).padStart(2, "0") : null;
  const prefName = user.prefectureName || (prefCode && PREFECTURE_COORDINATES[prefCode] ? PREFECTURE_COORDINATES[prefCode].name : "東京都");
  if (!prefCode) prefCode = "13"; // デフォルト東京都

  const muniName = user.municipalityName || "";
  const areaLabel = muniName || prefName;

  // デフォルト代表座標（都道府県基準）
  let lat = PREFECTURE_COORDINATES[prefCode] ? PREFECTURE_COORDINATES[prefCode].lat : 35.6895;
  let lon = PREFECTURE_COORDINATES[prefCode] ? PREFECTURE_COORDINATES[prefCode].lon : 139.6917;

  // 市区町村名が指定されている場合、ジオコーディングでピンポイントの座標を取得
  if (muniName) {
    try {
      const geoQuery = encodeURIComponent(prefName + " " + muniName);
      const geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + geoQuery + "&count=1&language=ja&format=json";
      const res = UrlFetchApp.fetch(geoUrl, { muteHttpExceptions: true });
      if (res.getResponseCode() === 200) {
        const geoData = JSON.parse(res.getContentText());
        if (geoData.results && geoData.results.length > 0) {
          lat = geoData.results[0].latitude;
          lon = geoData.results[0].longitude;
        }
      }
    } catch (e) {
      Logger.log("Geocoding failed for " + muniName + ": " + e.toString());
    }
  }

  return { lat: lat, lon: lon, areaLabel: areaLabel };
}

/**
 * Open-Meteo APIから天気予報データ(daily)を取得する
 */
function fetchWeatherData(lat, lon) {
  try {
    const url = "https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo";
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      const data = JSON.parse(res.getContentText());
      if (data && data.daily) {
        return data.daily;
      }
    }
  } catch (e) {
    Logger.log("fetchWeatherData error: " + e.toString());
  }
  return null;
}

/**
 * WMO Weather Code をテキストと絵文字に変換
 */
function getWeatherInfoFromCode(code) {
  switch (code) {
    case 0:
      return { text: "快晴", emoji: "☀️", isRain: false };
    case 1:
      return { text: "晴れ", emoji: "☀️", isRain: false };
    case 2:
      return { text: "晴れ時々曇り", emoji: "🌤️", isRain: false };
    case 3:
      return { text: "曇り", emoji: "☁️", isRain: false };
    case 45:
    case 48:
      return { text: "霧", emoji: "🌫️", isRain: false };
    case 51:
    case 53:
    case 55:
      return { text: "霧雨", emoji: "🌦️", isRain: true };
    case 61:
    case 63:
    case 65:
      return { text: "雨", emoji: "🌧️", isRain: true };
    case 66:
    case 67:
      return { text: "みぞれ", emoji: "🌨️", isRain: true };
    case 71:
    case 73:
    case 75:
    case 77:
      return { text: "雪", emoji: "❄️", isRain: true };
    case 80:
    case 81:
    case 82:
      return { text: "にわか雨", emoji: "🌧️", isRain: true };
    case 85:
    case 86:
      return { text: "にわか雪", emoji: "❄️", isRain: true };
    case 95:
    case 96:
    case 99:
      return { text: "雷雨", emoji: "⛈️", isRain: true };
    default:
      return { text: "晴れ", emoji: "☀️", isRain: false };
  }
}

/**
 * 気温・降水確率・天候に基づく温かいアドバイス
 */
function getWeatherAdvice(weather, maxTemp, minTemp, pop, isTomorrow) {
  const dayText = isTomorrow ? "明日" : "今日";
  if (weather.isRain || pop >= 50) {
    if (pop >= 70) {
      return "※" + dayText + "は雨が降りそうだから、傘を忘れないでね☂️";
    } else {
      return "※雨が降るかもしれないから、折りたたみ傘があると安心だよ☂️";
    }
  } else if (pop >= 30) {
    return "※念のため、折りたたみ傘があると安心だよ☂️";
  } else if (maxTemp >= 30) {
    return "※日中は暑くなりそう！水分補給をしっかりしてね🌻";
  } else if (maxTemp - minTemp >= 10) {
    return "※朝晩の寒暖差が大きいから、羽織るものがあると快適だよ✨";
  } else if (minTemp <= 10) {
    return "※冷え込みそうだから、暖かくして過ごしてね🍵";
  } else {
    return "※過ごしやすいお天気になりそう！素敵な一日を過ごしてね🍀";
  }
}

/**
 * 天気通知ブロックの文字列を生成する
 */
function formatWeatherSection(dailyData, index, areaLabel, isTomorrow) {
  if (!dailyData || !dailyData.time || !dailyData.time[index]) return "";

  const code = dailyData.weather_code[index];
  const maxTemp = Math.round(dailyData.temperature_2m_max[index]);
  const minTemp = Math.round(dailyData.temperature_2m_min[index]);
  const pop = dailyData.precipitation_probability_max ? dailyData.precipitation_probability_max[index] : 0;

  const weather = getWeatherInfoFromCode(code);
  const advice = getWeatherAdvice(weather, maxTemp, minTemp, pop, isTomorrow);

  const titlePrefix = isTomorrow ? "あす" : "きょう";
  const headerIcon = weather.emoji;

  let text = headerIcon + titlePrefix + "の天気（" + areaLabel + "）\n";
  text += "・" + weather.text + " " + weather.emoji + "\n";
  text += "・気温：最高 " + maxTemp + "℃ / 最低 " + minTemp + "℃\n";
  if (pop !== undefined && pop !== null) {
    text += "・降水確率：" + pop + "%\n";
  }
  text += advice + "\n\n";
  return text;
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

// LINEにメッセージ群を送信し、送信ログをFirestore（lineNotificationLogs）に保存する関数
function sendLineMessagesWithLog(firestore, to, messages, token, logMeta) {
  if (!to || !token || !messages || messages.length === 0) return;

  const now = new Date();
  const sentAt = now.getTime();
  const sentAtFormatted = Utilities.formatDate(now, "Asia/Tokyo", "yyyy/MM/dd HH:mm:ss");
  const yearMonth = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM");
  const dateStr = Utilities.formatDate(now, "Asia/Tokyo", "yyyy-MM-dd");

  let lastStatusCode = 200;
  let lastErrorMessage = null;
  let overallSuccess = true;

  // 1. LINE Messaging API に送信
  for (let i = 0; i < messages.length; i += 5) {
    const chunk = messages.slice(i, i + 5);
    const options = {
      'method': 'post',
      'contentType': 'application/json',
      'headers': { 'Authorization': 'Bearer ' + token },
      'payload': JSON.stringify({ to: to, messages: chunk }),
      'muteHttpExceptions': true
    };
    try {
      const response = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', options);
      const code = response.getResponseCode();
      lastStatusCode = code;
      if (code < 200 || code >= 300) {
        overallSuccess = false;
        lastErrorMessage = "LINE API Error (status " + code + "): " + response.getContentText();
        Logger.log('sendLineMessagesWithLog error response: ' + lastErrorMessage);
      }
    } catch (e) {
      overallSuccess = false;
      lastErrorMessage = e.toString();
      Logger.log('sendLineMessagesWithLog fetch error: ' + e.toString());
    }
  }

  // 2. Firestore に送信ログを保存
  if (firestore) {
    try {
      const meta = logMeta || {};

      // サマリー生成
      let summary = meta.summary || "";
      if (!summary) {
        const firstText = messages.find(function(m) { return m.type === 'text'; });
        if (firstText && firstText.text) {
          const lines = firstText.text.split('\n').filter(function(l) { return l.trim().length > 0; });
          summary = lines.slice(0, 2).join(' / ');
          if (summary.length > 80) summary = summary.substring(0, 80) + '...';
        } else {
          summary = (meta.notificationTitle || "LINEメッセージ") + " (" + messages.length + "件)";
        }
      }

      // 保存するメッセージオブジェクト（軽量化して保存）
      const sanitizedMessages = messages.map(function(m) {
        if (m.type === 'text') {
          return { type: 'text', text: m.text };
        } else if (m.type === 'image') {
          return {
            type: 'image',
            originalContentUrl: m.originalContentUrl,
            previewImageUrl: m.previewImageUrl
          };
        }
        return m;
      });

      const isEventAccount = (token === LINE_EVENT_ACCESS_TOKEN);
      const logDoc = {
        accountType: meta.accountType || (isEventAccount ? "event" : "periodic"),
        accountName: meta.accountName || (isEventAccount ? "イベント通知公式アカウント" : "定期通知公式アカウント"),
        notificationType: meta.notificationType || "other",
        notificationTitle: meta.notificationTitle || "LINE通知",
        recipientUid: meta.recipientUid || "",
        recipientName: meta.recipientName || "ユーザー",
        recipientLineId: to,
        messages: sanitizedMessages,
        messageCount: messages.length, // LINE公式アカウントの配信通数消費は吹き出し数単位
        summary: summary,
        details: meta.details || {},
        status: overallSuccess ? "success" : "error",
        statusCode: lastStatusCode,
        errorMessage: lastErrorMessage,
        sentAt: sentAt,
        sentAtFormatted: sentAtFormatted,
        yearMonth: yearMonth,
        date: dateStr
      };

      firestore.createDocument("lineNotificationLogs", logDoc);
      Logger.log("lineNotificationLog saved: " + logDoc.notificationTitle + " to " + logDoc.recipientName + " (" + logDoc.messageCount + "通)");
    } catch (logErr) {
      Logger.log("Failed to save lineNotificationLog: " + logErr.toString());
    }
  }
}

// LINEにメッセージ群を送信する関数 (既存互換用・ログなし/フォールバック)
function sendLineMessages(to, messages, token) {
  sendLineMessagesWithLog(null, to, messages, token, null);
}

// LINEに単一テキストメッセージを送信する関数 (既存互換用)
function sendLineMessage(to, text, token) {
  sendLineMessagesWithLog(null, to, [{ type: 'text', text: text }], token, null);
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
 * （明日のイベント、明日のTODO、明日のごみ出し情報・出し方/分別表写真）
 */
function sendDailyNightNotifications(targets, events, todos, garbageSchedules, lineMessagingIds, firestore) {
  try {
    const todayDate = new Date();
    const todayStr = Utilities.formatDate(todayDate, "Asia/Tokyo", "yyyy-MM-dd");
    const tomorrowDate = new Date(todayDate.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowStr = Utilities.formatDate(tomorrowDate, "Asia/Tokyo", "yyyy-MM-dd");

    // 天気データのキャッシュ（同一地域の重複fetch防止）
    const weatherCache = {};

    targets.forEach(user => {
      const lineUid = lineMessagingIds[user.id];
      if (!lineUid) return;

      const nickname = user.nickname || "あなた";
      const partnerUid = user.partnerUid || null;

      // 居住地情報から明日の天気を取得
      const userLoc = getUserLocation(user);
      const cacheKey = userLoc.lat + "_" + userLoc.lon;
      if (!weatherCache[cacheKey]) {
        weatherCache[cacheKey] = fetchWeatherData(userLoc.lat, userLoc.lon);
      }
      const weatherDaily = weatherCache[cacheKey];

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

      // ごみ出し情報（明日のみ）
      const tomorrowGarbage = garbageSchedules.filter(s => isGarbageCollectionDay(s, tomorrowDate));

      const cuteMessage = nightCuteMessages[Math.floor(Math.random() * nightCuteMessages.length)].replace(/〇〇/g, nickname);

      // ---- メッセージの構築 ----
      let message = `こんばんは！CANDYだよ🍬\n${cuteMessage}\n\nあしたの予定をまとめたよ🌙\nゆっくり休んでいい夢見てね✨\n\n`;

      // 🌙 あすの天気 セクション
      const weatherSection = formatWeatherSection(weatherDaily, 1, userLoc.areaLabel, true);
      if (weatherSection) {
        message += weatherSection;
      }

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

      // 🗑️明日のごみ出し情報（きょうのごみ情報は含めず明日のみ）
      message += `🗑️明日のごみ出し\n`;
      if (tomorrowGarbage.length > 0) {
        const hasImages = tomorrowGarbage.some(g => !!g.imageUrl);
        tomorrowGarbage.forEach(g => {
          const noteStr = g.note ? ` (${g.note})` : "";
          message += `・${g.name}${noteStr}\n`;
        });
        if (hasImages) {
          message += `※分別・出し方の写真も下にお送りします📸\n`;
        }
        message += `※夜のうちにまとめておくと安心だよ✨\n`;
      } else {
        message += `明日のごみ収集はありません🍀\n`;
      }
      message += `\n`;

      message += `CANDYを開く：\n${BASE_URL}/home`;

      // LINEメッセージ群の構築
      const lineMessages = [
        { type: 'text', text: message }
      ];

      // 明日のごみ出しの画像・分別表の写真があれば画像メッセージとして追加
      tomorrowGarbage.forEach(g => {
        if (g.imageUrl) {
          lineMessages.push({
            type: 'image',
            originalContentUrl: g.imageUrl,
            previewImageUrl: g.imageUrl
          });
        }
      });

      // LINEメッセージ送信 (定期通知用公式アカウント) と Firestore ログ記録
      const logMeta = {
        accountType: "periodic",
        accountName: "定期通知公式アカウント",
        notificationType: "night",
        notificationTitle: "夜のおやすみ通知",
        recipientUid: user.id,
        recipientName: nickname,
        summary: `夜のおやすみ通知 (明日の予定${tomorrowsEvents.length}件 / 明日のTODO${tomorrowDueTodos.length}件 / ごみ出し${tomorrowGarbage.length}件)`,
        details: {
          areaLabel: userLoc.areaLabel,
          weather: weatherDaily && weatherDaily.weather_code && weatherDaily.weather_code[1] !== undefined ? {
            code: weatherDaily.weather_code[1],
            tempMax: weatherDaily.temperature_2m_max ? Math.round(weatherDaily.temperature_2m_max[1]) : null,
            tempMin: weatherDaily.temperature_2m_min ? Math.round(weatherDaily.temperature_2m_min[1]) : null,
            pop: weatherDaily.precipitation_probability_max ? weatherDaily.precipitation_probability_max[1] : 0,
          } : null,
          tomorrowEventsCount: tomorrowsEvents.length,
          tomorrowEvents: tomorrowsEvents.map(function(e) {
            return { title: e.title, startTime: e.startTime || "", isAllDay: !!e.isAllDay, label: e.label || "" };
          }),
          tomorrowDueTodosCount: tomorrowDueTodos.length,
          overdueTodosCount: overdueTodos.length,
          tomorrowGarbageCount: tomorrowGarbage.length,
          tomorrowGarbage: tomorrowGarbage.map(function(g) {
            return { name: g.name, note: g.note || "", hasImage: !!g.imageUrl };
          }),
        }
      };

      sendLineMessagesWithLog(firestore, lineUid, lineMessages, LINE_PERIODIC_ACCESS_TOKEN, logMeta);
    });

  } catch (e) {
    Logger.log('Night Notification Error: ' + e.toString());
  }
}

/**
 * 朝の通知（今日の一枚を含む）の手動テスト実行関数
 * GASエディタ上で「testMorningNotification」を選択して実行することで、
 * 朝の指定時刻を待たずに即時送信テストを行えます。
 */
function testMorningNotification() {
  try {
    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
    const usersDocs = firestore.getDocuments('users');
    const lineMessagingIdsDocs = firestore.getDocuments('lineMessagingIds');
    const eventsDocs = firestore.getDocuments('events');
    const todosDocs = firestore.getDocuments('todos');
    const anniversariesDocs = firestore.getDocuments('anniversaries');
    let photosDocs = [];
    let albumsDocs = [];
    try {
      photosDocs = firestore.getDocuments('photos');
    } catch (e) {
      Logger.log('Photos fetch failed: ' + e.toString());
    }
    try {
      albumsDocs = firestore.getDocuments('albums');
    } catch (e) {
      Logger.log('Albums fetch failed: ' + e.toString());
    }

    const users = usersDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const lineMessagingIds = {};
    lineMessagingIdsDocs.forEach(doc => {
      lineMessagingIds[doc.name.split('/').pop()] = doc.obj.lineUid;
    });

    const events = eventsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const todos = todosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const anniversaries = anniversariesDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const photos = photosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const albums = albumsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));

    // LINE IDが設定されているユーザーをテスト送信対象とする
    const testTargets = users.filter(user => !!lineMessagingIds[user.id]);
    if (testTargets.length === 0) {
      Logger.log('LINE連携済みのユーザーが見つかりませんでした。');
      return;
    }

    Logger.log(`朝の通知テスト実行中... 対象ユーザー数: ${testTargets.length}`);
    sendDailyMorningNotifications(testTargets, events, todos, anniversaries, photos, albums, lineMessagingIds, firestore);
    Logger.log('朝の通知テスト送信が完了しました！');
  } catch (e) {
    Logger.log('testMorningNotification Error: ' + e.toString());
  }
}

/**
 * 夜の通知（明日の天気・予定・TODO・ごみ出し）の手動テスト実行関数
 * GASエディタ上で「testNightNotification」を選択して実行することで、
 * 夜の指定時刻を待たずに即時送信テストを行えます。
 */
function testNightNotification() {
  try {
    const firestore = FirestoreApp.getFirestore(FIRESTORE_EMAIL, FIRESTORE_KEY, FIRESTORE_PROJECT_ID);
    const usersDocs = firestore.getDocuments('users');
    const lineMessagingIdsDocs = firestore.getDocuments('lineMessagingIds');
    const eventsDocs = firestore.getDocuments('events');
    const todosDocs = firestore.getDocuments('todos');
    let garbageSchedules = [];
    try {
      const garbageDocs = firestore.getDocuments('garbageSchedules');
      garbageSchedules = garbageDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    } catch (e) {
      Logger.log('garbageSchedules fetch failed: ' + e.toString());
    }

    const users = usersDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const lineMessagingIds = {};
    lineMessagingIdsDocs.forEach(doc => {
      lineMessagingIds[doc.name.split('/').pop()] = doc.obj.lineUid;
    });

    const events = eventsDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));
    const todos = todosDocs.map(doc => ({ id: doc.name.split('/').pop(), ...doc.obj }));

    const testTargets = users.filter(user => !!lineMessagingIds[user.id]);
    if (testTargets.length === 0) {
      Logger.log('LINE連携済みのユーザーが見つかりませんでした。');
      return;
    }

    Logger.log(`夜の通知テスト実行中... 対象ユーザー数: ${testTargets.length}`);
    sendDailyNightNotifications(testTargets, events, todos, garbageSchedules, lineMessagingIds, firestore);
    Logger.log('夜の通知テスト送信が完了しました！');
  } catch (e) {
    Logger.log('testNightNotification Error: ' + e.toString());
  }
}


