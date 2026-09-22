import { GarbageSchedule } from "@/src/lib/firestore/types";

export type { GarbageSchedule };

export interface GarbagePreset {
  name: string;
  color: string;
  icon: string;
  defaultNote?: string;
}

export const GARBAGE_PRESETS: GarbagePreset[] = [
  { name: "可燃ごみ（燃えるごみ）", color: "#F87171", icon: "fa-fire", defaultNote: "朝8時までに集積所へ" },
  { name: "プラスチック（プラ容器包装）", color: "#60A5FA", icon: "fa-bottle-water", defaultNote: "中を水で洗って出す" },
  { name: "ビン・カン", color: "#34D399", icon: "fa-wine-bottle", defaultNote: "キャップとラベルを外す" },
  { name: "ペットボトル", color: "#38BDF8", icon: "fa-recycle", defaultNote: "ラベル・キャップを外して潰す" },
  { name: "古紙・段ボール", color: "#FBBF24", icon: "fa-newspaper", defaultNote: "紐で十字にしばって出す" },
  { name: "不燃ごみ（燃えないごみ）", color: "#A78BFA", icon: "fa-trash-can", defaultNote: "割れ物は厚紙で包む" },
  { name: "有害ごみ（電池・蛍光灯）", color: "#F472B6", icon: "fa-battery-full", defaultNote: "透明な袋に分ける" },
  { name: "粗大ごみ", color: "#9CA3AF", icon: "fa-couch", defaultNote: "事前に収集予約が必要" },
];

export const COLOR_OPTIONS = [
  "#F87171", // 赤/コーラル
  "#FB923C", // オレンジ
  "#FBBF24", // 黄色
  "#34D399", // エメラルドグリーン
  "#2DD4BF", // ティール
  "#38BDF8", // スカイブルー
  "#60A5FA", // ブルー
  "#818CF8", // インディゴ
  "#A78BFA", // パープル
  "#F472B6", // ピンク
  "#FB7185", // ローズ
  "#9CA3AF", // グレー
];

export const ICON_OPTIONS = [
  "fa-trash-can",
  "fa-fire",
  "fa-bottle-water",
  "fa-wine-bottle",
  "fa-recycle",
  "fa-newspaper",
  "fa-box-archive",
  "fa-battery-full",
  "fa-spray-can",
  "fa-plug",
  "fa-couch",
  "fa-leaf",
];

export const DAY_OF_WEEK_LABELS = [
  { value: 0, label: "日", fullLabel: "日曜日" },
  { value: 1, label: "月", fullLabel: "月曜日" },
  { value: 2, label: "火", fullLabel: "火曜日" },
  { value: 3, label: "水", fullLabel: "水曜日" },
  { value: 4, label: "木", fullLabel: "木曜日" },
  { value: 5, label: "金", fullLabel: "金曜日" },
  { value: 6, label: "土", fullLabel: "土曜日" },
];

export const NTH_WEEK_OPTIONS = [
  { value: 1, label: "第1週" },
  { value: 2, label: "第2週" },
  { value: 3, label: "第3週" },
  { value: 4, label: "第4週" },
  { value: 5, label: "第5週" },
];

export const MONTH_OPTIONS = [
  { value: 1, label: "1月" },
  { value: 2, label: "2月" },
  { value: 3, label: "3月" },
  { value: 4, label: "4月" },
  { value: 5, label: "5月" },
  { value: 6, label: "6月" },
  { value: 7, label: "7月" },
  { value: 8, label: "8月" },
  { value: 9, label: "9月" },
  { value: 10, label: "10月" },
  { value: 11, label: "11月" },
  { value: 12, label: "12月" },
];
