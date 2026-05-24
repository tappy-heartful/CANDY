export interface Announcement {
  type: "pending" | "item" | "empty";
  message?: string;
  link?: string;
  label?: string;
}

export interface Score {
  id: string;
  title: string;
  abbreviation?: string;
  note?: string;
  scoreUrl?: string;
  genres?: string[];
  referenceTrack?: string;
  youtubeId?: string;
  isDispTop?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export interface BlueNote {
  id: string;
  title: string;
  youtubeId: string;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Media {
  id: string;
  title: string;
  date: string;
  instagramUrl?: string;
  youtubeUrl?: string;
  driveUrl?: string;
  isDispTop?: boolean;
  createdAt?: number;
  updatedAt?: number;
}

export type Genre = {
  id: string;
  name: string;
};

export interface User {
  id: string;
  displayName?: string;
  pictureUrl?: string;
  sectionId?: string;
  roleId?: string;
  instrumentIds?: string[];
  abbreviation?: string;
  paypayId?: string;
  agreedAt?: number;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
  isSystemAdmin?: boolean;
  [key: string]: any; // 動的フラグ (e.g. isScoreAdmin)
}

/** users/{uid}/private/location に保存する居住地情報 */
export interface UserLocation {
  prefectureId?: string;
  municipalityId?: string;
}

export interface Section {
  id: string;
  name: string;
}

export interface Role {
  id: string;
  name: string;
}

export interface Instrument {
  id: string;
  name: string;
  sectionId: string;
}

export interface SecretWord {
  id: string;
  label: string;
  roleField: string;
  word?: string;
}

export interface EventWithSetlist {
  id: string;
  title: string;
  date: string;
  scoreIdsInSetlist: string[];
}

export interface Prefecture {
  id: string;
  name: string;
  order?: number;
}

export interface Municipality {
  id: string;
  name: string;
  prefectureCode: string;
}

export interface Studio {
  id: string;
  prefecture?: string;
  name: string;
  hp?: string;
  map?: string;
  availabilityInfo?: string;
  fee?: string;
  rooms?: string[];
  roomsUrl?: string;
  tel?: string;
  reserve?: string;
  access?: string;
  note?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface Call {
  id: string;
  title: string;
  description?: string;
  acceptStartDate: string;  // "yyyy.MM.dd"
  acceptEndDate: string;    // "yyyy.MM.dd"
  items: string[];          // 募集ジャンル一覧
  maxSongsPerGenre?: number;
  isAnonymous?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export type CallAnswerSong = {
  title: string;
  url?: string;
  scorestatus?: string;
  purchase?: string;
  note?: string;
};

export interface CallAnswer {
  id: string;
  uid: string;
  answers: { [genre: string]: CallAnswerSong[] };
}

export interface ScoreStatus {
  id: string;
  name: string;
}

export interface Board {
  id: string;
  title: string;
  content: string;
  sectionId: string | null;
  files?: { name: string; url: string; path: string }[];
  createdBy?: string;
  createdByName?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface VoteChoice {
  name: string;
  link?: string;
  difficulty?: number; // 1-10評価
}

export interface VoteItem {
  name: string;
  link?: string;
  choices: VoteChoice[];
}

export interface Vote {
  id: string;
  name: string;
  description: string;
  descriptionLink?: string;
  acceptStartDate: string;
  acceptEndDate: string;
  isAnonymous?: boolean;
  hideVotes?: boolean;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
  items: VoteItem[];
  type?: "single" | "borda"; // 投票形式 (デフォルトは single)
  bordaConfig?: {
    maxRanks: number;         // 何位まで選べるか
    scoring: "linear" | "weighted"; // linear: 3,2,1 / weighted: 5,3,1
  };
}

export interface VoteAnswer {
  id: string;
  voteId: string;
  uid: string;
  displayName?: string;
  answers: Record<string, string | string[] | null>; // borda の場合は string[]
  updatedAt?: number;
}

// ===== イベント =====

export interface SetlistGroup {
  title: string;
  songIds: string[];
}

export interface InstrumentPart {
  partName: string;
  instrumentId?: string;
}

export interface EventYouTubeTimestamp {
  time: string; // "mm:ss"
  comment: string;
}

export interface Event {
  id: string;
  title: string;
  attendanceType: "schedule" | "attendance";
  date?: string;              // "yyyy.MM.dd" (出欠タイプ)
  candidateDates?: string[];  // "yyyy.MM.dd"[] (日程調整タイプ)
  acceptStartDate: string;
  acceptEndDate: string;
  placeName?: string;
  website?: string;
  access?: string;
  googleMap?: string;
  youtubeUrl?: string;
  youtubeTimestamps?: EventYouTubeTimestamp[];
  schedule?: string;
  dress?: string;
  bring?: string;
  rent?: string;
  other?: string;
  allowAssign?: boolean;
  setlist?: SetlistGroup[];
  instrumentConfig?: Record<string, InstrumentPart[]>;
  createdBy?: string;
  createdAt?: number;
  updatedAt?: number;
}

export interface EventAttendanceAnswer {
  id: string;
  eventId: string;
  uid: string;
  status: string;
  updatedAt?: number;
}

export interface EventAdjustAnswer {
  id: string;
  eventId: string;
  uid: string;
  answers: Record<string, string>; // { "yyyy.MM.dd": statusId }
  updatedAt?: number;
}

export interface AttendanceStatus {
  id: string;
  name: string;
}

export interface EventAdjustStatus {
  id: string;
  name: string;
}

export interface EventRecording {
  id: string;
  eventId: string;
  uid: string;
  title: string;
  url: string;
  createdAt?: number;
}

// ===== ライブ =====

export interface Live {
  id: string;
  title: string;
  date: string;              // "yyyy.MM.dd"
  open?: string;             // "HH:mm" 開場時間
  start?: string;            // "HH:mm" 開演時間
  venue?: string;
  venueUrl?: string;
  venueGoogleMap?: string;
  advance?: number | string;  // 前売料金
  door?: number | string;     // 当日料金（HP表示用）
  feeAdvance?: number;        // 前売料金（集計用数値）
  feeDoor?: number;           // 当日料金（集計用数値）
  flyerUrl?: string;
  isAcceptReserve?: boolean;
  acceptStartDate?: string;  // "yyyy.MM.dd"
  acceptEndDate?: string;    // "yyyy.MM.dd"
  ticketStock?: number | string;
  totalReserved?: number;    // 予約済み数（集計値）
  maxCompanions?: number | string;
  notes?: string;
  setlist?: SetlistGroup[];
  createdAt?: number;
  updatedAt?: number;
}

export interface LiveCheckIn {
  id: string;
  liveId: string;
  ticketId: string | null;
  reservationNo?: string;
  name?: string;
  type?: string; // "door" = 当日受付, undefined = 予約来場
  createdAt?: number;
}

// ===== チケット・予約 =====

export interface TicketGroup {
  groupName: string;
  companions: string[];
}

export interface Ticket {
  id: string;
  liveId: string;
  uid?: string;
  reservationNo: string;
  resType?: "invite" | string; // "invite" = 招待, その他 = 一般
  representativeName?: string;
  companions?: string[];        // 一般予約の同行者
  groups?: TicketGroup[];       // 招待予約のグループ
  createdAt?: number;
  updatedAt?: number;
}

export interface EnqueteQuestion {
  id: string;
  label: string;
  type: "rating" | "radio" | "textarea" | "text";
  options?: string[];
}

export interface EnqueteAnswer {
  id: string;
  liveId: string;
  common: Record<string, string | number>;
}

// ===== 通知設定 (Notice) =====

export interface NoticeScheduleItem {
  scheduledTime: string; // "HH:mm"
  message: string;
}

export interface NoticeSchedule {
  scheduledDate: string; // "yyyy.MM.dd"
  notifications: NoticeScheduleItem[];
}

export interface Notice {
  id: string;
  relatedType: string;   // "none" | "events" | "votes" | "calls"
  relatedId?: string;
  relatedTitle?: string;
  schedules: NoticeSchedule[];
  activeDate?: string;   // "yyyy.MM.dd" 最初のschedule日付
  createdAt?: number;
  updatedAt?: number;
}

export interface NoticeBaseNotification {
  days: number;
  beforeAfter: "before" | "after";
  interval?: number;
  message: string;
}

// ===== 旅費補助額 (TravelSubsidy) =====

export interface TravelPoint {
  prefectureId: string;
  municipalityId: string;
}

export interface TravelSubsidy {
  id: string;
  departurePrefectureId: string;
  departureMunicipalityId: string;
  arrivalPrefectureId: string;
  arrivalMunicipalityId: string;
  amount: number;
  updatedAt?: number;
}

export interface TravelConfig {
  arrivalPoints: TravelPoint[];
  departurePoints: TravelPoint[];
}

// ===== 譜割り (Assign) =====

export interface Assign {
  id: string;
  eventId: string;
  songId: string;
  partName: string;
  userId?: string;
  assignValue: string;
  isRehearsal?: boolean;
  createdAt?: number;
}

// ===== 経費マスタ =====

export interface ExpenseType {
  id: string; // 001, 002
  name: string;
  isIncome?: boolean; // 収入か支出か（true = 収入）
}

export interface ExpenseCategory {
  id: string; // 001_001
  typeId: string;
  name: string;
}

export interface ExpenseItem {
  id: string; // 001_001_001
  categoryId: string;
  name: string;
  isTravel?: boolean;
  isEventRequired?: boolean;
}

// ===== 経費申請 (ExpenseApply) =====

export interface ExpenseApply {
  id: string;
  uid: string;
  typeId: string;     // 001
  expenseTypeId?: string; // 経費種別のドキュメントID
  category: string;   // 互換性のため表示名も持つ
  categoryId: string; // 001_001
  itemId: string;     // 001_001_001
  name: string;
  amount: number;
  date: string; // yyyy.MM.dd
  status: 'pending' | 'approved' | 'returned';

  // 旅費の場合のみ使用
  isTravel?: boolean;
  isEventRequired?: boolean;
  eventId?: string;
  eventTitle?: string;
  departurePrefectureId?: string;
  departureMunicipalityId?: string;
  arrivalPrefectureId?: string;
  arrivalMunicipalityId?: string;

  files?: { name: string; url: string; path: string }[];
  adminComment?: string;
  reviewerId?: string;      // 審査者UID
  reviewerName?: string;    // 審査者名
  reviewedAt?: any;         // 審査日時
  createdAt: any;
  updatedAt: any;
}

// ===== 経費申請履歴 (ExpenseApplyHistory) =====
export interface ExpenseApplyHistory {
  id: string;
  type: 'created' | 'updated' | 'reviewed' | 'commented';
  status: 'pending' | 'approved' | 'returned';
  comment?: string;
  actorId: string;
  actorName: string;
  createdAt: any;
}
// ===== 経費申請フォームデータ (ExpenseApplyFormData) =====
export interface ExpenseApplyFormData {
  typeId: string;
  expenseTypeId?: string;
  category: string;
  categoryId: string;
  itemId: string;
  name: string;
  amount: number;
  date: string;
  isTravel?: boolean;
  isEventRequired?: boolean;
  eventId?: string;
  eventTitle?: string;
  departurePrefectureId?: string;
  departureMunicipalityId?: string;
  arrivalPrefectureId?: string;
  arrivalMunicipalityId?: string;
  files?: { name: string; url: string; path: string }[];
}
// ===== 会計 (Accounting) =====

export type AccountingSeasonKey = "winter" | "spring" | "summer" | "autumn";

export interface AccountingConfig {
  id: string;
  seasons: Record<AccountingSeasonKey, {
    name: string;
    startMonth: number;
    endMonth: number;
  }>;
  travelUnitRate?: number; // 旅費計算用の単価（将来用）
}

export interface AccountingSeason {
  id: string; // e.g. "2026-spring"
  year: number;
  seasonKey: AccountingSeasonKey;
  memberIds: string[];
  managerId?: string; // シーズン担当者（サックスパートから選出）
  evidenceUrls?: Record<string, string>; // uid -> downloadUrl
  settledAt?: number;
  createdAt: number;
  updatedAt: number;
}

export interface Income {
  id: string;
  uid: string;       // 代表受取者
  userName?: string; // 表示用名前
  title: string;
  amount: number;
  date: string;      // yyyy.MM.dd
  note?: string;
  status: 'pending' | 'approved';
  createdAt: number;
  updatedAt: number;
}
