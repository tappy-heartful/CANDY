export interface User {
  id: string;
  displayName?: string;
  pictureUrl?: string;
  nickname?: string;
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
  eventReminderMinutes: number; // 何分前か (1〜60)
  createdAt: number;
  updatedAt: number;
}


