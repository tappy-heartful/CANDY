import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // 改行コードの処理を忘れずに
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();

/**
 * サーバーサイド（API Route / Server Actions）でのエラーログを errorLogs コレクションに登録する
 */
export async function serverErrorLog(
  action: string,
  error: unknown,
  dataId: string = "server",
  uid: string = "server"
) {
  try {
    const now = new Date();
    const jst = new Date(now.getTime() + (now.getTimezoneOffset() + 540) * 60000);
    const createdAtFormatted = `${jst.getFullYear()}/${String(jst.getMonth() + 1).padStart(2, "0")}/${String(jst.getDate()).padStart(2, "0")} ${String(jst.getHours()).padStart(2, "0")}:${String(jst.getMinutes()).padStart(2, "0")}:${String(jst.getSeconds()).padStart(2, "0")}`;

    const errorRecord: Record<string, any> = {
      action,
      message: error instanceof Error ? error.message : (typeof error === "string" ? error : JSON.stringify(error)),
      dataId: dataId || "server",
      uid: uid || "server",
      userAgent: "server",
      createdAt: now.getTime(),
      createdAtFormatted,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (error instanceof Error && error.stack) {
      errorRecord.stack = error.stack;
    }
    if (error && typeof error === "object" && "code" in error && (error as any).code) {
      errorRecord.code = String((error as any).code);
    }

    await adminDb.collection("errorLogs").add(errorRecord);
  } catch (e) {
    console.error("serverErrorLog failed:", e);
  }
}
