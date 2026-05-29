import { db } from "./firebase";
import {
  doc,
  collection,
  setDoc,
  serverTimestamp
} from "firebase/firestore";
import { showDialog } from "@/src/components/CommonDialog";

// --- 定数 ---
export const isLocal = typeof window !== 'undefined' && window.location.hostname.includes('localhost');
export const globalAppName = 'candy';

// --- セッション管理 (localStorage/sessionStorage) ---
const getStorageKey = (key: string) => `${globalAppName}.${key}`;

export function setSession(key: string, value: any) {
  if (typeof window === 'undefined') return;
  const val = typeof value === 'string' ? value : JSON.stringify(value);
  sessionStorage.setItem(getStorageKey(key), val);
}

export function getSession(key: string): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem(getStorageKey(key));
}

export function removeSession(key: string) {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(getStorageKey(key));
}

export function clearAllAppSession() {
  if (typeof window === 'undefined') return;
  const prefix = globalAppName + '.';
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key?.startsWith(prefix)) keysToRemove.push(key);
  }
  keysToRemove.forEach((key) => sessionStorage.removeItem(key));
}

// --- スピナー制御 ---
export const LOADING_MESSAGES = [
  "キャンディを包んでいます...",
  "甘い香りを届けています...",
  "カラフルに彩っています...",
  "おいしくなる魔法をかけています...",
  "リボンを結んでいます...",
  "準備中です。少し待ってね...",
];

let spinnerInterval: ReturnType<typeof setInterval> | null = null;

export function showSpinner() {
  if (typeof document === 'undefined') return;
  let overlay = document.getElementById('spinner-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'spinner-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(255, 255, 255, 0.8);
      display: none;
      align-items: center;
      justify-content: center;
      z-index: 10001;
      flex-direction: column;
    `;
    overlay.innerHTML = `
      <div class="candy-spinner"></div>
      <p id="spinner-message" style="margin-top: 20px; font-weight: bold; color: #9B7CC3;"></p>
      <style>
        .candy-spinner {
          width: 50px;
          height: 50px;
          border: 5px solid #A0E7D2;
          border-top: 5px solid #F7A8C4;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;
    document.body.appendChild(overlay);
  }
  overlay.style.display = 'flex';

  if (spinnerInterval) clearInterval(spinnerInterval);
  spinnerInterval = setInterval(() => {
    const el = document.getElementById('spinner-message');
    if (el) el.textContent = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
  }, 1000);
}

export function hideSpinner() {
  if (typeof document === 'undefined') return;
  const overlay = document.getElementById('spinner-overlay');
  if (overlay) overlay.style.display = 'none';
  if (spinnerInterval) {
    clearInterval(spinnerInterval);
    spinnerInterval = null;
  }
}

// --- ログ記録 ---
export async function writeLog({ dataId, action, status = 'success', errorDetail = {} }: any) {
  try {
    const uid = getSession('uid') || 'unknown';
    const now = new Date();
    const dateStr =
      now.getFullYear() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0');

    const logRef = doc(collection(db, 'logs'), dateStr, 'items', now.getTime().toString());
    await setDoc(logRef, {
      uid,
      dataId,
      action,
      status,
      errorDetail,
      timestamp: serverTimestamp(),
      userAgent: typeof window !== 'undefined' ? navigator.userAgent : 'server',
    });
  } catch (e) {
    console.error('Log write failed:', e);
  }
}

export { showDialog };

// 次の記念日までの日数を計算するロジック（MM-DD 形式）
export function getNextAnniversaryDiff(dateStr: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const [m, d] = dateStr.split("-").map(Number);
  let nextDate = new Date(today.getFullYear(), m - 1, d);
  
  // 既に今年の記念日が過ぎている場合は来年
  if (nextDate.getTime() < today.getTime()) {
    nextDate = new Date(today.getFullYear() + 1, m - 1, d);
  }

  const diffTime = nextDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return { diffDays, isToday: diffDays === 0 };
}
