"use client";

import { useState, useEffect } from "react";
import styles from "./CommonDialog.module.css";

export interface DialogOptions {
  message: string;
  isOKOnly?: boolean;
  isPrompt?: boolean;
  promptPlaceholder?: string;
  resolve: (value: boolean | string | null) => void;
}

// グローバルに呼び出すためのsetterを保持
let setter: (options: DialogOptions | null) => void;

/**
 * プロミスを返すダイアログ表示関数
 * @param message 表示するテキスト
 * @param isOKOnly OKボタンのみにするかどうか
 * @param isPrompt 入力フィールドを表示するかどうか
 * @param promptPlaceholder 入力フィールドのプレースホルダー
 */
export const showDialog = (
  message: string,
  isOKOnly = false,
  isPrompt = false,
  promptPlaceholder = ""
): Promise<boolean | string | null> => {
  return new Promise((resolve) => {
    if (setter) {
      setter({ message, isOKOnly, isPrompt, promptPlaceholder, resolve });
    }
  });
};

export default function CommonDialog() {
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const [promptValue, setPromptValue] = useState("");

  useEffect(() => {
    setter = setOptions;
  }, []);

  useEffect(() => {
    if (options?.isPrompt) {
      setPromptValue("");
    }
  }, [options]);

  // オプションがない（ダイアログを閉じている）ときは何も描画しない
  if (!options) return null;

  const handleClose = (result: boolean) => {
    if (options.isPrompt) {
      if (result) {
        options.resolve(promptValue);
      } else {
        options.resolve(null);
      }
    } else {
      options.resolve(result);
    }
    setOptions(null);
  };

  return (
    <div className={styles.dialogOverlay}>
      <div className={styles.dialogBox}>
        <div className={styles.message}>{options.message}</div>
        {options.isPrompt && (
          <input
            type="text"
            className={styles.promptInput}
            placeholder={options.promptPlaceholder}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            autoFocus
          />
        )}
        <div className={styles.dialogButtons}>
          {!options.isOKOnly && (
            <button className={`${styles.dialogBtn} ${styles.btnCancel}`} onClick={() => handleClose(false)}>
              キャンセル
            </button>
          )}
          <button className={`${styles.dialogBtn} ${styles.btnOk}`} onClick={() => handleClose(true)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
