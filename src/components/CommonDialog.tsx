"use client";

import { useState, useEffect } from "react";

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
    <div className="dialog-overlay">
      <style jsx>{`
        .dialog-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background-color: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .dialog-box {
          background: white;
          padding: 24px;
          border-radius: 12px;
          width: 90%;
          max-width: 400px;
          min-width: 280px;
          text-align: center;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          border: 3px solid #9B7CC3; /* Purple outline */
        }

        #dialog-message {
          font-size: 16px;
          line-height: 1.6;
          margin-bottom: 20px;
          color: #333;
          white-space: pre-wrap;
          word-break: break-all;
          font-weight: 500;
        }

        .dialog-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
        }

        .dialog-btn {
          padding: 10px 24px;
          border-radius: 20px;
          border: none;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer;
          transition: transform 0.1s, opacity 0.2s;
        }

        .dialog-btn:active {
          transform: scale(0.95);
        }

        .btn-ok {
          background-color: #F7A8C4; /* Pink */
          color: white;
        }

        .btn-cancel {
          background-color: #E0E0E0;
          color: #666;
        }

        .prompt-input {
          width: 100%;
          padding: 10px;
          border: 2px solid #A0E7D2; /* Mint */
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 16px;
          outline: none;
        }
      `}</style>
      <div className="dialog-box">
        <div id="dialog-message">{options.message}</div>
        {options.isPrompt && (
          <input
            type="text"
            className="prompt-input"
            placeholder={options.promptPlaceholder}
            value={promptValue}
            onChange={(e) => setPromptValue(e.target.value)}
            autoFocus
          />
        )}
        <div className="dialog-buttons">
          {!options.isOKOnly && (
            <button className="dialog-btn btn-cancel" onClick={() => handleClose(false)}>
              キャンセル
            </button>
          )}
          <button className="dialog-btn btn-ok" onClick={() => handleClose(true)}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
