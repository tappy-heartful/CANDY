import { db } from "@/src/lib/firebase";
import { doc, getDoc, setDoc, deleteDoc, collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { BudgetMasterData, DefaultBudget, ActualBudget } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

// マスタデータ
const DEFAULT_MASTER_DATA: BudgetMasterData = {
  categories: [
    { id: "fixed", name: "固定費" },
    { id: "variable", name: "変動費" },
    { id: "income", name: "収入" }
  ],
  types: [
    { id: "rent", categoryId: "fixed", name: "マンション" },
    { id: "telecom", categoryId: "fixed", name: "通信費" },
    { id: "tax", categoryId: "fixed", name: "税金" },
    { id: "loan", categoryId: "fixed", name: "ローン" },
    { id: "food", categoryId: "variable", name: "生活費" },
    { id: "entertainment", categoryId: "variable", name: "娯楽" },
    { id: "daily", categoryId: "variable", name: "日用品費" },
    { id: "medical", categoryId: "variable", name: "医療費" },
    { id: "salary", categoryId: "income", name: "給料" },
    { id: "other_expense", categoryId: "variable", name: "その他支出" },
    { id: "other_income", categoryId: "income", name: "その他収入" }
  ]
};

/**
 * 家計簿のマスタデータを取得する (DBにない場合は初期作成)
 */
export async function getBudgetMasterData(): Promise<BudgetMasterData> {
  try {
    const docRef = doc(db, "budgetSettings", "master");
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return snap.data() as BudgetMasterData;
    } else {
      // 初期データを投入
      await setDoc(docRef, DEFAULT_MASTER_DATA);
      return DEFAULT_MASTER_DATA;
    }
  } catch (error) {
    console.error("Error getting budget master data:", error);
    return DEFAULT_MASTER_DATA;
  }
}

/**
 * デフォルト収支の一覧を取得する
 */
export async function getDefaultBudgets(coupleKey: string, month: number): Promise<DefaultBudget[]> {
  try {
    const colRef = collection(db, "defaultBudgets");
    const q = query(
      colRef,
      where("coupleKey", "==", coupleKey),
      where("month", "==", month)
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
  if (data.id) {
    const docRef = doc(db, "defaultBudgets", data.id);
    await setDoc(docRef, {
      ...data,
      updatedAt: now
    }, { merge: true });
  } else {
    const { id, ...rest } = data;
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
  if (data.id) {
    const docRef = doc(db, "actualBudgets", data.id);
    await setDoc(docRef, {
      ...data,
      updatedAt: now
    }, { merge: true });
  } else {
    const { id, ...rest } = data;
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
  const defaults = await getDefaultBudgets(coupleKey, month);
  const now = Date.now();
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
}

