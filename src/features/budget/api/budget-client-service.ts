import { db, storage } from "@/src/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { BudgetMasterData, DefaultBudget, ActualBudget, MonthlyBudget, BudgetSettlementProof, BudgetSettlementPayment } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

// マスタデータ
const DEFAULT_MASTER_DATA: BudgetMasterData = {
  categories: [],
  types: []
};

/**
 * オブジェクトから値が undefined のプロパティを排除する
 */
function cleanUndefined<T extends object>(obj: T): T {
  const activeObj = { ...obj } as any;
  Object.keys(activeObj).forEach((key) => {
    if (activeObj[key] === undefined) {
      delete activeObj[key];
    }
  });
  return activeObj;
}

let cachedMasterData: BudgetMasterData | null = null;

/**
 * 家計簿のマスタデータを取得する (DBにない場合は初期作成)
 * インメモリキャッシュにより画面遷移ごとの再取得を抑制
 */
export async function getBudgetMasterData(forceRefresh = false): Promise<BudgetMasterData> {
  if (cachedMasterData && !forceRefresh) {
    return cachedMasterData;
  }
  try {
    const docRef = doc(db, "budgetSettings", "master");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      cachedMasterData = snap.data() as BudgetMasterData;
      return cachedMasterData;
    } else {
      // 初期データを投入
      await setDoc(docRef, DEFAULT_MASTER_DATA);
      cachedMasterData = DEFAULT_MASTER_DATA;
      return DEFAULT_MASTER_DATA;
    }
  } catch (error) {
    console.error("Error getting budget master data:", error);
    return cachedMasterData || DEFAULT_MASTER_DATA;
  }
}

/**
 * デフォルト収支の一覧を取得する（単一化対応）
 */
export async function getDefaultBudgets(coupleKey: string, _month?: number): Promise<DefaultBudget[]> {
  try {
    const colRef = collection(db, "defaultBudgets");
    const q = query(
      colRef,
      where("coupleKey", "==", coupleKey)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => toPlainObject(doc) as DefaultBudget);
  } catch (error) {
    console.error("Error getting default budgets:", error);
    return [];
  }
}

/**
 * デフォルト収支を保存する
 */
export async function saveDefaultBudget(data: Omit<DefaultBudget, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<void> {
  const now = Date.now();
  const cleaned = cleanUndefined(data);
  if (data.id) {
    const docRef = doc(db, "defaultBudgets", data.id);
    await setDoc(docRef, {
      ...cleaned,
      updatedAt: now
    }, { merge: true });
  } else {
    const { id, ...rest } = cleaned;
    const colRef = collection(db, "defaultBudgets");
    await addDoc(colRef, {
      ...rest,
      createdAt: now,
      updatedAt: now
    });
  }
}

/**
 * デフォルト収支を削除する
 */
export async function deleteDefaultBudget(id: string): Promise<void> {
  const docRef = doc(db, "defaultBudgets", id);
  await deleteDoc(docRef);
}

/**
 * 指定年月の実際収支の一覧を取得する
 */
export async function getActualBudgets(coupleKey: string, year: number, month: number): Promise<ActualBudget[]> {
  try {
    const colRef = collection(db, "actualBudgets");
    const q = query(
      colRef,
      where("coupleKey", "==", coupleKey),
      where("year", "==", year),
      where("month", "==", month)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => toPlainObject(doc) as ActualBudget);
  } catch (error) {
    console.error("Error getting actual budgets:", error);
    return [];
  }
}

/**
 * 実際収支を保存する
 */
export async function saveActualBudget(data: Omit<ActualBudget, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<void> {
  const now = Date.now();
  const cleaned = cleanUndefined(data);
  if (data.id) {
    const docRef = doc(db, "actualBudgets", data.id);
    await setDoc(docRef, {
      ...cleaned,
      updatedAt: now
    }, { merge: true });
  } else {
    const { id, ...rest } = cleaned;
    const colRef = collection(db, "actualBudgets");
    await addDoc(colRef, {
      ...rest,
      createdAt: now,
      updatedAt: now
    });
  }
}

/**
 * 実際収支を削除する
 */
export async function deleteActualBudget(id: string): Promise<void> {
  const docRef = doc(db, "actualBudgets", id);
  await deleteDoc(docRef);
}

/**
 * デフォルト収支設定から実際収支をコピーして作成する
 */
export async function copyDefaultToActual(coupleKey: string, year: number, month: number): Promise<void> {
  const defaults = await getDefaultBudgets(coupleKey);
  const now = Date.now();
  const d = new Date(now);
  const todayStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const colRef = collection(db, "actualBudgets");

  // すでに登録されている同一月の実際収支をすべて削除してからコピーする（重複防止）
  const existing = await getActualBudgets(coupleKey, year, month);
  await Promise.all(existing.map(item => deleteDoc(doc(db, "actualBudgets", item.id))));

  // コピー処理
  await Promise.all(
    defaults.map(item => 
      addDoc(colRef, {
        coupleKey,
        uid: item.uid,
        year,
        month,
        date: todayStr,
        category: item.category,
        type: item.type,
        name: item.name,
        amount: item.amount,
        memo: item.memo || "",
        splitRatio: item.splitRatio ?? 50,
        createdAt: now,
        updatedAt: now
      })
    )
  );
}

/**
 * 毎月の予算の一覧を取得する
 */
export async function getMonthlyBudgets(coupleKey: string, year: number, month: number): Promise<MonthlyBudget[]> {
  try {
    const colRef = collection(db, "monthlyBudgets");
    const q = query(
      colRef,
      where("coupleKey", "==", coupleKey),
      where("year", "==", year),
      where("month", "==", month)
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => toPlainObject(doc) as MonthlyBudget);
  } catch (error) {
    console.error("Error getting monthly budgets:", error);
    return [];
  }
}

/**
 * 毎月の予算を保存する
 */
export async function saveMonthlyBudget(data: Omit<MonthlyBudget, "id" | "createdAt" | "updatedAt"> & { id?: string }): Promise<void> {
  const now = Date.now();
  const cleaned = cleanUndefined(data);
  if (data.id) {
    const docRef = doc(db, "monthlyBudgets", data.id);
    await setDoc(docRef, {
      ...cleaned,
      updatedAt: now
    }, { merge: true });
  } else {
    const { id, ...rest } = cleaned;
    const colRef = collection(db, "monthlyBudgets");
    await addDoc(colRef, {
      ...rest,
      createdAt: now,
      updatedAt: now
    });
  }
}

/**
 * 毎月の予算を削除する
 */
export async function deleteMonthlyBudget(id: string): Promise<void> {
  const docRef = doc(db, "monthlyBudgets", id);
  await deleteDoc(docRef);
}

/**
 * デフォルト収支設定から毎月の予算をコピーして初期設定する
 */
export async function copyDefaultToMonthlyBudget(coupleKey: string, year: number, month: number): Promise<void> {
  const defaults = await getDefaultBudgets(coupleKey);
  const now = Date.now();
  const colRef = collection(db, "monthlyBudgets");

  // すでに登録されている同一月の予算をすべて削除してからコピー（重複防止）
  const existing = await getMonthlyBudgets(coupleKey, year, month);
  await Promise.all(existing.map(item => deleteDoc(doc(db, "monthlyBudgets", item.id))));

  // コピー処理
  await Promise.all(
    defaults.map(item =>
      addDoc(colRef, {
        coupleKey,
        uid: item.uid,
        year,
        month,
        category: item.category,
        type: item.type,
        name: item.name,
        amount: item.amount,
        memo: item.memo || "",
        splitRatio: item.splitRatio ?? 50,
        createdAt: now,
        updatedAt: now
      })
    )
  );
}

/**
 * 家計簿のマスタデータを更新する
 */
export async function updateBudgetMasterData(data: BudgetMasterData): Promise<void> {
  const docRef = doc(db, "budgetSettings", "master");
  await setDoc(docRef, data);
  cachedMasterData = data;
}

/**
 * 指定年月の家計簿清算証明データを取得する
 */
export async function getBudgetSettlementProof(coupleKey: string, year: number, month: number): Promise<BudgetSettlementProof | null> {
  try {
    const docId = `proof_${coupleKey}_${year}_${month}`;
    const docRef = doc(db, "budgetSettlementProofs", docId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as BudgetSettlementProof;
      // 下位互換性: paymentsがなく単一proofUrlがある場合はpayments配列を自動生成
      if ((!data.payments || data.payments.length === 0) && data.proofUrl) {
        data.payments = [
          {
            id: "legacy_1",
            installmentNumber: 1,
            amount: 0,
            proofUrl: data.proofUrl,
            proofFileName: data.proofFileName || "送金履歴スクショ",
            uploadedAt: data.proofUploadedAt || Date.now(),
            uploadedUid: data.uploadedUid || "",
          },
        ];
      }
      return data;
    }
    return null;
  } catch (error) {
    console.error("Error getting budget settlement proof:", error);
    return null;
  }
}

/**
 * 家計簿の清算証明画像 (楽天銀行の振込履歴等) をアップロードして登録する (単一または初回用)
 */
export async function uploadBudgetSettlementProof(
  coupleKey: string,
  year: number,
  month: number,
  file: File,
  uid: string
): Promise<BudgetSettlementProof> {
  return uploadBudgetSettlementPayment(coupleKey, year, month, file, 1, 0, "", uid);
}

/**
 * 楽天銀行の振込履歴スクショを分割回数・送金額とともに登録する
 */
export async function uploadBudgetSettlementPayment(
  coupleKey: string,
  year: number,
  month: number,
  file: File,
  installmentNumber: number,
  amount: number,
  note: string,
  uid: string
): Promise<BudgetSettlementProof> {
  const fileName = `${Date.now()}_installment${installmentNumber}_${file.name}`;
  const storageRef = ref(storage, `budgets/${coupleKey}/proofs/${fileName}`);
  await uploadBytes(storageRef, file);
  const proofUrl = await getDownloadURL(storageRef);

  const docId = `proof_${coupleKey}_${year}_${month}`;
  const docRef = doc(db, "budgetSettlementProofs", docId);
  const snap = await getDoc(docRef);

  let existingPayments: BudgetSettlementPayment[] = [];
  if (snap.exists()) {
    const data = snap.data() as BudgetSettlementProof;
    if (data.payments && Array.isArray(data.payments)) {
      existingPayments = [...data.payments];
    } else if (data.proofUrl) {
      existingPayments.push({
        id: "legacy_1",
        installmentNumber: 1,
        amount: 0,
        proofUrl: data.proofUrl,
        proofFileName: data.proofFileName || "送金履歴スクショ",
        uploadedAt: data.proofUploadedAt || Date.now(),
        uploadedUid: data.uploadedUid || uid,
      });
    }
  }

  const newPayment: BudgetSettlementPayment = {
    id: `payment_${Date.now()}`,
    installmentNumber,
    amount,
    proofUrl,
    proofFileName: file.name,
    uploadedAt: Date.now(),
    uploadedUid: uid,
    note: note || undefined,
  };

  // 同じ回数のものが既に存在する場合は上書き、それ以外は追加
  const filteredExisting = existingPayments.filter((p) => p.installmentNumber !== installmentNumber);
  const updatedPayments = [...filteredExisting, newPayment].sort(
    (a, b) => a.installmentNumber - b.installmentNumber
  );

  const proofData: BudgetSettlementProof = {
    id: docId,
    coupleKey,
    year,
    month,
    payments: updatedPayments,
    proofUrl: updatedPayments[0]?.proofUrl || proofUrl,
    proofFileName: updatedPayments[0]?.proofFileName || file.name,
    proofUploadedAt: Date.now(),
    uploadedUid: uid,
  };

  await setDoc(docRef, proofData);
  return proofData;
}

/**
 * 特定の分割送金エビデンスを削除する
 */
export async function removeBudgetSettlementPayment(
  coupleKey: string,
  year: number,
  month: number,
  paymentId: string
): Promise<BudgetSettlementProof | null> {
  const docId = `proof_${coupleKey}_${year}_${month}`;
  const docRef = doc(db, "budgetSettlementProofs", docId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;

  const data = snap.data() as BudgetSettlementProof;
  const payments = data.payments || [];
  const targetPayment = payments.find((p) => p.id === paymentId);

  if (targetPayment?.proofUrl) {
    try {
      const fileRef = ref(storage, targetPayment.proofUrl);
      await deleteObject(fileRef).catch((e) => console.warn("Failed to delete storage file:", e));
    } catch (e) {
      console.warn("Storage deletion error:", e);
    }
  }

  const remainingPayments = payments.filter((p) => p.id !== paymentId);
  if (remainingPayments.length === 0) {
    await deleteDoc(docRef);
    return null;
  }

  const updatedProof: BudgetSettlementProof = {
    ...data,
    payments: remainingPayments,
    proofUrl: remainingPayments[0]?.proofUrl || "",
    proofFileName: remainingPayments[0]?.proofFileName || "",
  };
  await setDoc(docRef, updatedProof);
  return updatedProof;
}

/**
 * 家計簿の清算証明画像（全分割履歴含む）を削除する
 */
export async function removeBudgetSettlementProof(coupleKey: string, year: number, month: number): Promise<void> {
  const docId = `proof_${coupleKey}_${year}_${month}`;
  const docRef = doc(db, "budgetSettlementProofs", docId);
  
  try {
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as BudgetSettlementProof;
      // 分割支払い内のすべての画像を削除
      if (data.payments && data.payments.length > 0) {
        for (const payment of data.payments) {
          if (payment.proofUrl) {
            const fileRef = ref(storage, payment.proofUrl);
            await deleteObject(fileRef).catch((e) => console.warn("Failed to delete storage file:", e));
          }
        }
      } else if (data.proofUrl) {
        const fileRef = ref(storage, data.proofUrl);
        await deleteObject(fileRef).catch((e) => console.warn("Failed to delete storage file:", e));
      }
    }
  } catch (e) {
    console.warn("Storage file delete attempt failed:", e);
  }
  
  await deleteDoc(docRef);
}

/**
 * 実際の収支項目のエビデンスファイル (画像・PDF) を Firebase Storage にアップロードする
 */
export async function uploadActualBudgetProof(
  coupleKey: string,
  actualId: string,
  file: File
): Promise<{ proofUrl: string; proofFileName: string; proofFileType: "image" | "pdf" }> {
  const fileName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `budgets/${coupleKey}/actuals/${actualId}/${fileName}`);
  await uploadBytes(storageRef, file);
  const proofUrl = await getDownloadURL(storageRef);

  let proofFileType: "image" | "pdf" = "image";
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
    proofFileType = "pdf";
  }

  return { proofUrl, proofFileName: file.name, proofFileType };
}

/**
 * 実際の収支項目のエビデンスファイルをごみ箱削除する
 */
export async function removeActualBudgetProofFile(proofUrl: string): Promise<void> {
  try {
    const fileRef = ref(storage, proofUrl);
    await deleteObject(fileRef);
  } catch (error) {
    console.warn("Failed to delete actual budget proof file from Storage:", error);
  }
}

/**
 * 実際の収支項目のためにクライアント側で新規ドキュメントIDを事前生成する
 */
export function generateActualBudgetId(): string {
  return doc(collection(db, "actualBudgets")).id;
}
