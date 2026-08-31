"use client";

import { useEffect } from "react";
import { errorLog } from "@/src/lib/functions";

export default function ErrorLogger() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      // 無限ループを防ぐため、エラーログ書き込みエラー自体は除外する
      if (
        event.message?.includes("Log write failed") ||
        event.message?.includes("errorLog failed") ||
        event.message?.includes("Firebase")
      ) {
        return;
      }
      errorLog("未処理の例外 (Global Window Error)", event.error || event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason);
      if (
        reasonStr.includes("Log write failed") ||
        reasonStr.includes("errorLog failed") ||
        reasonStr.includes("Firebase")
      ) {
        return;
      }
      errorLog("未処理のPromise拒否 (Global Promise Rejection)", event.reason);
    };

    window.addEventListener("error", handleWindowError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleWindowError);
      window.removeEventListener("unhandledrejection", handleUnhandledRejection);
    };
  }, []);

  return null;
}
