'use client';

import { useEffect } from 'react';
import styles from "./error.module.css";
import { errorLog } from "@/src/lib/functions";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
    errorLog("ルート画面エラー", error);
  }, [error]);

  return (
    <div className={`page-container ${styles.container}`}>
      <h2 className={styles.title}>申し訳ありません。エラーが発生しました。</h2>
      <button
        onClick={() => reset()}
        className={styles.button}
      >
        再試行する
      </button>
    </div>
  );
}
