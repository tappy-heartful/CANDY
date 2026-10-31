"use client";

import { useEffect } from "react";
import { errorLog } from "@/src/lib/functions";

export default function ErrorLogger() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      // 無限ループを防ぐため、errorLogsへの書き込みエラー自体は除外する
      const msg = event.message || "";
      if (
        msg.includes("errorLog to errorLogs") ||
        msg.includes("Log write failed")
      ) {
        return;
      }
      errorLog("未処理の例外 (Global Window Error)", event.error || event.message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reasonStr = String(event.reason);
      if (
        reasonStr.includes("errorLog to errorLogs") ||
        reasonStr.includes("Log write failed")
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
