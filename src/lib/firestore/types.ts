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
  strengths?: string;
  weaknesses?: string;
  favoritePlaces?: string;
  dislikedPlaces?: string;
  agreedAt?: number;
  lastLoginAt?: number;
  createdAt?: number;
  updatedAt?: number;
  isSystemAdmin?: boolean;
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
  showToPartner: boolean; // type="personal" の場合のみ有効
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
  showToPartner: boolean;
  groupId: string;
  uid: string;
  createdAt: number;
  updatedAt: number;
  urgency?: number;
}

export interface Group {
  id: string;
  name: string;
  type: "todo" | "wishlist";
  uid: string; // 作成者（2人の場合は共有だが管理上）
  createdAt: number;
}
