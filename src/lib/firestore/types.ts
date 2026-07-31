export interface User {
  id: string;
  displayName?: string;
  pictureUrl?: string;
  nickname?: string;
  paypayId?: string;
  mbti?: string;
  birthday?: string;
  phone?: string;
  emergencyContact?: string;
  allergies?: string;
  medications?: string;
  medicalHistory?: string;
  dislikedFoods?: string;
  favoriteFoods?: string;
  happyThings?: string;
  dislikedThings?: string;
  strengths?: string;
  weaknesses?: string;
  favoritePlaces?: string;
  dislikedPlaces?: string;
  agreedAt?: number;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
  isSystemAdmin?: boolean;
  clockTheme?: string;
  clockType?: "digital" | "analog";
  goal?: string;
  calendarMode?: "grid" | "timeline";
  timelineMode?: "list" | "columns";
  dailyAgendaMode?: "list" | "timeline";
  splitRatio?: number; // 希望ワリカン率 (0〜100, デフォルト 50)
  [key: string]: any;
}

export interface Todo {
  id: string;
  title: string;
  note?: string;
  date?: string;
  dateMode?: "due" | "on";
  steps?: TodoStep[];
  isCompleted: boolean;
  type: "personal" | "couple";
  groupId: string;
  uid: string; // 作成者
  createdAt: number;
  updatedAt: number;
}

export interface TodoStep {
  id: string;
  title: string;
  isCompleted: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Wishlist {
  id: string;
  title: string;
  note?: string;
  isAchieved: boolean;
  type: "personal" | "couple";
  groupId: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
  urgency?: number;
  season?: ("spring" | "summer" | "autumn" | "winter")[];
}

export interface Group {
  id: string;
  name: string;
  type: "todo" | "wishlist" | "anniversary";
  uid: string; // 作成者（2人の場合は共有だが管理上）
  createdAt: number;
}

export interface Anniversary {
  id: string;
  title: string;
  date: string; // "MM-DD"
  note?: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
}

export interface CalendarEvent {
  id: string;
  title: string;
  isAllDay: boolean;
  startDate: string; // "YYYY-MM-DD"
  startTime?: string; // "HH:MM"
  endDate: string; // "YYYY-MM-DD"
  endTime?: string; // "HH:MM"
  note?: string;
  link?: string;
  type: "personal" | "couple";
  uid: string; // 作成者
  createdAt: number;
  updatedAt: number;
  isRecurring?: boolean;
  recurrenceId?: string;
}

export interface DailyStatus {
  id: string;
  uid: string;
  date: string; // "YYYY-MM-DD"
  mood: number; // 1 to 5
  health: number; // 1 to 5
  comment: string;
  partnerComment?: string;
  commentReactions?: { [emoji: string]: string[] };
  partnerCommentReactions?: { [emoji: string]: string[] };
  commentReactionOrder?: string[];
  partnerCommentReactionOrder?: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Album {
  id: string;
  name: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
  prefectureCode?: string;
  prefectureName?: string;
  municipalityCode?: string;
  municipalityName?: string;
  dateMode?: "single" | "range";
  startDate?: string;
  endDate?: string;
}

export interface Photo {
  id: string;
  albumId: string;
  url: string;
  uid: string;
  createdAt: number;
  takenAt?: number;
  latitude?: number;
  longitude?: number;
  favoriteUids?: string[];
}

export interface Prefecture {
  code: number;
  name: string;
}

export interface Municipality {
  code: string;
  name: string;
  prefCode: string;
}

export interface InvestmentSimulation {
  id: string; // 通常は uid
  uid: string;
  annualRate: number; // 想定年利 (%)
  startAge: number; // 開始年齢 (例: 26)
  startYear: number; // 開始年 (例: 2024)
  endAge: number; // 終了年齢 (例: 80)
  endYear: number; // 終了年 (例: 2078)
  investments: { [age: string]: number }; // 年齢ごとの投資額 (年齢の文字列 -> 金額)
  createdAt: number;
  updatedAt: number;
}

export interface NotificationSetting {
  id: string; // uid (ユーザーID)
  uid: string;
  morningEnabled: boolean; // 朝の通知メッセージ有効フラグ
  morningTime: string; // 朝の通知時間 (例: "08:00")
  eventReminderEnabled: boolean; // イベント前通知有効フラグ
  eventReminderMinutes: number[]; // 何分前か (0〜60) の配列
  dailyStatusEnabled?: boolean; // パートナーの今日のひとこと通知を受け取るか
  dailyStatusCommentEnabled?: boolean; // 自分のひとことへのパートナーのコメント通知を受け取るか
  createdAt: number;
  updatedAt: number;
}

export interface SettlementEvent {
  id: string;
  name: string; // イベント名
  isSettled: boolean; // 清算完了フラグ
  settlementMode?: "even" | "my" | "partner"; // 清算方式モード (均等, 自分の希望, 相手の希望)
  settledRatio?: number; // 清算時の自分の負担割合 (%)
  proofUrl?: string; // 清算証明画像 (PayPay送金画面等) のURL
  proofFileName?: string; // 証明画像ファイル名
  proofUploadedAt?: number; // 証明画像アップロード日時
  uid: string; // 作成者
  createdAt: number;
  updatedAt: number;
  prefectureCode?: string;
  prefectureName?: string;
  municipalityCode?: string;
  municipalityName?: string;
  dateMode?: "single" | "range";
  startDate?: string;
  endDate?: string;
}

export interface SettlementItem {
  id: string;
  eventId: string; // 属するイベントID
  title: string; // 項目名
  amount: number; // 金額
  type: "expense" | "income"; // 支払 | 収入
  payerUid: string; // 支払った/収入を得たユーザー
  uid: string; // 登録者
  date: string; // 支払日 ("YYYY-MM-DD")
  time: string; // 支払時間 ("HH:MM")
  receiptUrl?: string; // 領収書ダウンロードURL
  receiptFileName?: string; // 領収書ファイル名
  receiptFileType?: string; // 領収書ファイル種別 ("image/*" | "application/pdf")
  createdAt: number;
  updatedAt: number;
}

export interface PropertyPreference {
  id: string; // ドキュメントID (uid)
  uid: string; // ユーザーID
  areaMemo?: string; // 希望エリアのメモ
  rentMin: number; // 賃料下限 (0: 下限なし)
  rentMax: number; // 賃料上限 (999: 上限なし)
  includeCommonFee: number; // 管理費・共益費込み
  noKeyMoney: number; // 礼金なし
  noDeposit: number; // 敷金・保証金なし
  roomLayouts: string[]; // 希望の間取り
  buildingTypes: string[]; // 希望の建物種別
  structures: string[]; // 希望の構造
  stationWalkMin: number; // 駅徒歩 (999: 指定なし)
  areaMin: number; // 専有面積下限
  areaMax: number; // 専有面積上限
  buildingAgeMax: number; // 築年数 (999: 指定なし)
  directions: string[]; // 希望の方位

  // 1. 冷暖房
  airConditioning: number; // エアコン付き
  floorHeating: number; // 床暖房
  keroseneHeating: number; // 灯油暖房
  gasHeating: number; // ガス暖房

  // 2. 収納
  underfloorStorage: number; // 床下収納
  shoesBox: number; // シューズボックス
  trunkRoom: number; // トランクルーム
  walkInCloset: number; // ウォークインクローゼット

  // 3. セキュリティ
  autoLock: number; // オートロック
  caretaker: number; // 管理人有り
  tvIntercom: number; // TVモニタ付きインタホン
  securityCamera: number; // 防犯カメラ
  securityCompany: number; // セキュリティ会社加入済

  // 4. 建物設備
  parkingAvailable: number; // 駐車場あり
  parkingTwoOrMore: number; // 駐車場2台以上
  onSiteParking: number; // 敷地内駐車場
  bicycleParking: number; // 駐輪場あり
  motorcycleParking: number; // バイク置場あり
  elevator: number; // エレベーター
  deliveryBox: number; // 宅配ボックス
  onSiteGarbage: number; // 敷地内ゴミ置場
  balcony: number; // バルコニー付
  roofBalcony: number; // ルーフバルコニー付
  privateGarden: number; // 専用庭
  cityGas: number; // 都市ガス
  lpg: number; // プロパンガス
  barrierFree: number; // バリアフリー

  // 5. その他
  designers: number; // デザイナーズ物件
  itExplanation: number; // IT重説対応物件
  condominiumRental: number; // 分譲賃貸
  noGuarantor: number; // 保証人不要
  towerMansion: number; // タワーマンション
  renovated: number; // リフォーム済み
  renovation: number; // リノベーション物件

  // 6. 入居条件
  immediateOccupancy: number; // 即入居可
  womenOnly: number; // 女性限定
  elderlyWelcomed: number; // 高齢者歓迎
  lgbtFriendly: number; // LGBTフレンドリー
  petNegotiable: number; // ペット相談可
  instrumentNegotiable: number; // 楽器相談可
  officeUse: number; // 事務所利用可
  roomShare: number; // ルームシェア可
  customizable: number; // カスタマイズ可
  diy: number; // DIY可
  noFixedTerm: number; // 定期借家を含まない

  // 7. お得条件
  freeRent: number; // フリーレント
  tokuyuRent: number; // 特定優良賃貸住宅

  // 8. 表示情報
  todayNew: number; // 本日の新着物件
  recentNew: number; // 新着（2-7日前）
  videoAttached: number; // 物件動画・スライドショー付き
  panoramaAttached: number; // パノラマ付き
  floorPlanAttached: number; // 間取り図付き
  photoAttached: number; // 写真付き

  // 9. 位置
  firstFloor: number; // 1階の物件
  secondFloorOrAbove: number; // 2階以上
  topFloor: number; // 最上階
  cornerRoom: number; // 角部屋
  southFacing: number; // 南向き

  // 10. キッチン
  gasStove: number; // ガスコンロ対応
  ihStove: number; // IHコンロ
  twoOrMoreStoves: number; // コンロ2口以上
  allElectric: number; // オール電化
  systemKitchen: number; // システムキッチン
  counterKitchen: number; // カウンターキッチン

  // 11. バス・トイレ
  bathToiletSeparate: number; // バス・トイレ別
  washlet: number; // 温水洗浄便座
  bathroomDryer: number; // 浴室乾燥機
  reheatingBath: number; // 追い焚き風呂
  showerRoom: number; // シャワールーム

  // 12. テレビ・通信
  internetConnected: number; // インターネット接続可
  bsAntenna: number; // BSアンテナ
  csAntenna: number; // CSアンテナ
  cableTv: number; // ケーブルテレビ
  internetFree: number; // インターネット無料

  // 13. 室内設備
  indoorLaundry: number; // 室内洗濯機置場
  independentWashroom: number; // 洗面所独立
  flooring: number; // フローリング
  maisonette: number; // メゾネット
  loft: number; // ロフト
  soundproof: number; // 防音室
  basement: number; // 地下室
  furnished: number; // 家具付
  appliancesAttached: number; // 家電付

  createdAt?: number;
  updatedAt?: number;
}


