// 既存の個別の関数はそのまま活用
export const rules = {
  required: (v: any) => isRequired(v) || "必須項目です",
  googleDrive: (v: string) => isValidGoogleDriveUrl(v) || "Google Driveの形式が不正です",
  youtube: (v: string) => isValidYouTubeUrl(v) || "YouTubeの形式が不正です",
  max8: (v: string) => isMaxLength(v, 8) || "8文字以内で入力してください",
  instagramOptional: (v: string) => !v || isValidInstagramUrl(v) || "InstagramのURLの形式が不正です",
  youtubeOptional: (v: string) => !v || isValidYouTubeUrl(v) || "YouTubeの形式が不正です",
  googleDriveOptional: (v: string) => !v || isValidGoogleDriveUrl(v) || "Google Driveの形式が不正です",
};

/**
 * バリデーション用ユーティリティ
 */
// 必須チェック
export const isRequired = (value: any): boolean => {
  if (value === null || value === undefined) return false;
  return String(value).trim().length > 0;
};

// 文字数制限
export const isMaxLength = (value: string, max: number): boolean => {
  return value.length <= max;
};

// Google Drive URL (ファイルまたはフォルダ)
export const isValidGoogleDriveUrl = (url: string): boolean => {
  const pattern = /^https:\/\/drive\.google\.com\/(file\/d\/[\w\-]+\/view|drive\/folders\/[\w\-]+)/;
  return pattern.test(url);
};

// YouTube URL (通常URLまたは短縮URL)
export const isValidYouTubeUrl = (url: string): boolean => {
  const pattern = /^https:\/\/((www\.)?youtube\.com\/watch\?v=|youtu\.be\/)[\w\-]+/;
  return pattern.test(url);
};

// Instagram URL (投稿URL)
export const isValidInstagramUrl = (url: string): boolean => {
  const pattern = /^https:\/\/www\.instagram\.com\/p\/[A-Za-z0-9_\-]+/;
  return pattern.test(url);
};
