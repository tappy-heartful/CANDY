"use client";

import { useEffect, useState, Fragment, useRef } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { User as FirestoreUser, BudgetCategory, BudgetType, DefaultBudget, ActualBudget, BudgetSettlementProof } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import BackToHome from "@/src/components/Common/BackToHome";
import styles from "./BudgetClient.module.css";
import {
  getBudgetMasterData,
  getDefaultBudgets,
  saveDefaultBudget,
  deleteDefaultBudget,
  getActualBudgets,
  saveActualBudget,
  deleteActualBudget,
  copyDefaultToActual,
  updateBudgetMasterData,
  getBudgetSettlementProof,
  uploadBudgetSettlementProof,
  removeBudgetSettlementProof,
  uploadActualBudgetProof,
  removeActualBudgetProofFile,
  generateActualBudgetId
} from "../api/budget-client-service";
import BudgetMasterSettingsModal from "../components/BudgetMasterSettingsModal";
import BudgetAnalysis from "../components/BudgetAnalysis";


export default function BudgetClient() {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  const [partnerUser, setPartnerUser] = useState<FirestoreUser | null>(null);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [types, setTypes] = useState<BudgetType[]>([]);

  // 画面タブ
  const [activeTab, setActiveTab] = useState<"actual" | "default">("actual");

  // ロード状態
  const [isLoading, setIsLoading] = useState(true);

  // coupleKey
  const [coupleKey, setCoupleKey] = useState<string>("");

  // デフォルト設定用のアクティブな月 (1〜12)
  const [defaultMonth, setDefaultMonth] = useState<number>(new Date().getMonth() + 1);

  // デフォルト収支データ
  const [defaultBudgets, setDefaultBudgets] = useState<DefaultBudget[]>([]);

  // デフォルトフォーム
  const [dfId, setDfId] = useState<string | undefined>(undefined);
  const [dfTargetUid, setDfTargetUid] = useState<string>("");
  const [dfCategory, setDfCategory] = useState<string>("");
  const [dfType, setDfType] = useState<string>("");
  const [dfName, setDfName] = useState<string>("");
  const [dfAmount, setDfAmount] = useState<number | "">("");
  const [dfMemo, setDfMemo] = useState<string>("");
  const [dfMonths, setDfMonths] = useState<number[]>([]);
  const [dfOriginalMonth, setDfOriginalMonth] = useState<number | null>(null);
  const [dfSplitMode, setDfSplitMode] = useState<"equal" | "custom">("equal");
  const [dfMyRatio, setDfMyRatio] = useState<number | "">(50);
  const [dfPartnerRatio, setDfPartnerRatio] = useState<number | "">(50);

  // 実際収支用のアクティブな年月
  const [actualYear, setActualYear] = useState<number>(new Date().getFullYear());
  const [actualMonth, setActualMonth] = useState<number>(new Date().getMonth() + 1);

  // 実際収支データ
  const [actualBudgets, setActualBudgets] = useState<ActualBudget[]>([]);

  // 実際フォーム
  const [actId, setActId] = useState<string | undefined>(undefined);
  const [actTargetUid, setActTargetUid] = useState<string>("");
  const [actCategory, setActCategory] = useState<string>("");
  const [actType, setActType] = useState<string>("");
  const [actName, setActName] = useState<string>("");
  const [actAmount, setActAmount] = useState<number | "">("");
  const [actMemo, setActMemo] = useState<string>("");
  const [showActForm, setShowActForm] = useState<boolean>(false);
  const [actSplitMode, setActSplitMode] = useState<"equal" | "custom">("equal");
  const [actMyRatio, setActMyRatio] = useState<number | "">(50);
  const [actPartnerRatio, setActPartnerRatio] = useState<number | "">(50);

  // 詳細モーダル用
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  // マスタ設定モーダル用
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);

  // 清算証明エビデンス用
  const [settlementProof, setSettlementProof] = useState<BudgetSettlementProof | null>(null);
  const [isProofModalOpen, setIsProofModalOpen] = useState<boolean>(false);
  const proofInputRef = useRef<HTMLInputElement | null>(null);

  // 実際収支フォーム内の添付ファイル用
  const [actProofUrl, setActProofUrl] = useState<string>("");
  const [actProofFileName, setActProofFileName] = useState<string>("");
  const [actProofFileType, setActProofFileType] = useState<string>("");
  const actProofInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ title: "家計簿" }]);
  }, [setBreadcrumbs]);

  // 区分が変わったときに、選択可能な種別の1つ目を自動セットする
  useEffect(() => {
    if (dfCategory) {
      const filtered = types.filter(t => t.categoryId === dfCategory);
      if (filtered.length > 0) {
        setDfType(filtered[0].id);
      } else {
        setDfType("");
      }
    }
  }, [dfCategory, types]);

  useEffect(() => {
    if (actCategory) {
      const filtered = types.filter(t => t.categoryId === actCategory);
      if (filtered.length > 0) {
        setActType(filtered[0].id);
      } else {
        setActType("");
      }
    }
  }, [actCategory, types]);

  const myName = userData?.nickname || "自分";
  const partnerName = partnerUser?.nickname || "パートナー";
  const myPictureUrl = userData?.pictureUrl || "/default-avatar.png";
  const partnerPictureUrl = partnerUser?.pictureUrl || "/default-avatar.png";

  const sortBudgets = (list: any[]) => {
    const categoryOrder = ["fixed", "variable", "income"];
    return [...list].sort((a, b) => {
      const aIdx = categoryOrder.indexOf(a.category);
      const bIdx = categoryOrder.indexOf(b.category);
      if (aIdx !== bIdx) return aIdx - bIdx;
      // 種別でソート
      if (a.type !== b.type) return a.type.localeCompare(b.type);
      return a.createdAt - b.createdAt;
    });
  };

  const loadDefaultBudgets = async (cKey: string, month: number) => {
    if (!cKey) return;
    const data = await getDefaultBudgets(cKey, month);
    setDefaultBudgets(sortBudgets(data));
  };

  const loadActualBudgets = async (cKey: string, year: number, month: number) => {
    if (!cKey) return;
    const data = await getActualBudgets(cKey, year, month);
    setActualBudgets(sortBudgets(data));
  };

  const loadSettlementProof = async (cKey: string, year: number, month: number) => {
    if (!cKey) return;
    const proof = await getBudgetSettlementProof(cKey, year, month);
    setSettlementProof(proof);
  };

  const loadMasterAndPartner = async () => {
    if (!user) return;
    try {
      showSpinner();
      const master = await getBudgetMasterData();
      setCategories(master.categories);
      setTypes(master.types);

      if (master.categories.length > 0) {
        setDfCategory(master.categories[0].id);
        setActCategory(master.categories[0].id);
      }

      const partner = await getPartnerData(user.uid);
      setPartnerUser(partner);

      let cKey = user.uid;
      if (partner) {
        cKey = user.uid < partner.id ? `${user.uid}_${partner.id}` : `${partner.id}_${user.uid}`;
      }
      setCoupleKey(cKey);

      setDfTargetUid(user.uid);
      setActTargetUid(user.uid);
      setDfMonths([defaultMonth]);

      await Promise.all([
        loadDefaultBudgets(cKey, defaultMonth),
        loadActualBudgets(cKey, actualYear, actualMonth),
        loadSettlementProof(cKey, actualYear, actualMonth)
      ]);
    } catch (e) {
      console.error(e);
      showDialog("データの読み込み中に問題が発生したようです。");
    } finally {
      setIsLoading(false);
      hideSpinner();
    }
  };

  useEffect(() => {
    loadMasterAndPartner();
  }, [user]);

  // デフォルト月の切り替え
  const handleDefaultMonthChange = async (month: number) => {
    setDefaultMonth(month);
    if (!dfId) {
      setDfMonths([month]);
    }
    if (coupleKey) {
      showSpinner();
      await loadDefaultBudgets(coupleKey, month);
      hideSpinner();
    }
  };

  // 年月の切り替え
  const handleActualMonthChange = async (year: number, month: number) => {
    setActualYear(year);
    setActualMonth(month);
    if (coupleKey) {
      showSpinner();
      await Promise.all([
        loadActualBudgets(coupleKey, year, month),
        loadSettlementProof(coupleKey, year, month)
      ]);
      hideSpinner();
    }
  };

  // 実際収支の前月・翌月ボタン
  const handlePrevMonth = () => {
    let nextMonth = actualMonth - 1;
    let nextYear = actualYear;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    }
    handleActualMonthChange(nextYear, nextMonth);
  };

  const handleNextMonth = () => {
    let nextMonth = actualMonth + 1;
    let nextYear = actualYear;
    if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    handleActualMonthChange(nextYear, nextMonth);
  };

  // デフォルト収支の保存
  const handleSaveDefault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleKey || !dfTargetUid || !dfCategory || !dfType || !dfName || dfAmount === "" || dfMonths.length === 0) {
      showDialog("入力項目に不足があるようです。ご確認ください。");
      return;
    }

    let splitRatio = 50;
    if (dfCategory !== "income") {
      if (dfSplitMode === "equal") {
        splitRatio = 50;
      } else {
        const myRatio = Number(dfMyRatio) || 0;
        const partnerRatio = Number(dfPartnerRatio) || 0;
        if (myRatio + partnerRatio !== 100) {
          showDialog("負担割合の合計が100%になるように設定してください。");
          return;
        }
        splitRatio = dfTargetUid === user?.uid ? myRatio : partnerRatio;
      }
    }

    try {
      showSpinner();
      const savePromises = dfMonths.map((m) => {
        const isOriginal = dfId && m === dfOriginalMonth;
        return saveDefaultBudget({
          id: isOriginal ? dfId : undefined,
          coupleKey,
          uid: dfTargetUid,
          month: m,
          category: dfCategory,
          type: dfType,
          name: dfName,
          amount: Number(dfAmount),
          memo: dfMemo,
          splitRatio
        });
      });

      await Promise.all(savePromises);

      resetDfForm();
      await loadDefaultBudgets(coupleKey, defaultMonth);
      showDialog("デフォルト収支を保存しました✨");
    } catch (e) {
      console.error(e);
      showDialog("保存がうまくいかなかったようです。");
    } finally {
      hideSpinner();
    }
  };

  const resetDfForm = () => {
    setDfId(undefined);
    setDfName("");
    setDfAmount("");
    setDfMemo("");
    setDfMonths([defaultMonth]);
    setDfOriginalMonth(null);
    setDfSplitMode("equal");
    setDfMyRatio(50);
    setDfPartnerRatio(50);
  };

  const handleEditDefault = (item: DefaultBudget) => {
    setDfId(item.id);
    setDfTargetUid(item.uid);
    setDfCategory(item.category);
    setDfType(item.type);
    setDfName(item.name);
    setDfAmount(item.amount);
    setDfMemo(item.memo || "");
    setDfMonths([item.month]);
    setDfOriginalMonth(item.month);

    const ratio = item.splitRatio ?? 50;
    if (ratio === 50) {
      setDfSplitMode("equal");
      setDfMyRatio(50);
      setDfPartnerRatio(50);
    } else {
      setDfSplitMode("custom");
      if (item.uid === user?.uid) {
        setDfMyRatio(ratio);
        setDfPartnerRatio(100 - ratio);
      } else {
        setDfMyRatio(100 - ratio);
        setDfPartnerRatio(ratio);
      }
    }

    // 入力エリアへスクロール
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDeleteDefaultItem = async (id: string) => {
    try {
      showSpinner();
      await deleteDefaultBudget(id);
      await loadDefaultBudgets(coupleKey, defaultMonth);
      showDialog("削除しました。");
    } catch (e) {
      console.error(e);
      showDialog("削除がうまくいかなかったようです。");
    } finally {
      hideSpinner();
    }
  };

  // 実際収支の保存
  const handleSaveActual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleKey || !actTargetUid || !actCategory || !actType || !actName || actAmount === "") {
      showDialog("入力項目に不足があるようです。ご確認ください。");
      return;
    }

    let splitRatio = 50;
    if (actCategory !== "income") {
      if (actSplitMode === "equal") {
        splitRatio = 50;
      } else {
        const myRatio = Number(actMyRatio) || 0;
        const partnerRatio = Number(actPartnerRatio) || 0;
        if (myRatio + partnerRatio !== 100) {
          showDialog("負担割合の合計が100%になるように設定してください。");
          return;
        }
        splitRatio = actTargetUid === user?.uid ? myRatio : partnerRatio;
      }
    }
    try {
      showSpinner();
      await saveActualBudget({
        id: actId,
        coupleKey,
        uid: actTargetUid,
        year: actualYear,
        month: actualMonth,
        category: actCategory,
        type: actType,
        name: actName,
        amount: Number(actAmount),
        memo: actMemo,
        splitRatio,
        proofUrl: actProofUrl || undefined,
        proofFileName: actProofFileName || undefined,
        proofFileType: actProofFileType || undefined
      });
      resetActForm();
      setShowActForm(false);
      await loadActualBudgets(coupleKey, actualYear, actualMonth);
      showDialog("実際収支を保存しました✨");
    } catch (e) {
      console.error(e);
      showDialog("保存がうまくいかなかったようです。");
    } finally {
      hideSpinner();
    }
  };

  const resetActForm = () => {
    setActId(undefined);
    setActName("");
    setActAmount("");
    setActMemo("");
    setActSplitMode("equal");
    setActMyRatio(50);
    setActPartnerRatio(50);
    setActProofUrl("");
    setActProofFileName("");
    setActProofFileType("");
  };

  const handleEditActual = (item: ActualBudget) => {
    setActId(item.id);
    setActTargetUid(item.uid);
    setActCategory(item.category);
    setActType(item.type);
    setActName(item.name);
    setActAmount(item.amount);
    setActMemo(item.memo || "");
    setActProofUrl(item.proofUrl || "");
    setActProofFileName(item.proofFileName || "");
    setActProofFileType(item.proofFileType || "");

    const ratio = item.splitRatio ?? 50;
    if (ratio === 50) {
      setActSplitMode("equal");
      setActMyRatio(50);
      setActPartnerRatio(50);
    } else {
      setActSplitMode("custom");
      if (item.uid === user?.uid) {
        setActMyRatio(ratio);
        setActPartnerRatio(100 - ratio);
      } else {
        setActMyRatio(100 - ratio);
        setActPartnerRatio(ratio);
      }
    }

    setShowActForm(true);
  };

  const handleDeleteActualItem = async (id: string) => {
    try {
      showSpinner();
      await deleteActualBudget(id);
      await loadActualBudgets(coupleKey, actualYear, actualMonth);
      showDialog("削除しました。");
    } catch (e) {
      console.error(e);
      showDialog("削除がうまくいかなかったようです。");
    } finally {
      hideSpinner();
    }
  };

  // デフォルト収支から読み込む
  const handleCopyDefault = async () => {
    if (!coupleKey) return;
    try {
      showSpinner();
      await copyDefaultToActual(coupleKey, actualYear, actualMonth);
      await loadActualBudgets(coupleKey, actualYear, actualMonth);
      showDialog("今月のデフォルト収支を初期設定しました！🏡");
    } catch (e) {
      console.error(e);
      showDialog("データのコピーがうまくいかなかったようです。");
    } finally {
      hideSpinner();
    }
  };

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  const getSubtotals = (list: any[], categoryId: string) => {
    const filtered = list.filter(item => item.category === categoryId);
    const myTotal = filtered.filter(item => item.uid === user?.uid).reduce((sum, item) => sum + (item.amount || 0), 0);
    const partnerTotal = partnerUser ? filtered.filter(item => item.uid === partnerUser.id).reduce((sum, item) => sum + (item.amount || 0), 0) : 0;
    return {
      my: myTotal,
      partner: partnerTotal,
      total: myTotal + partnerTotal
    };
  };

  const getOverallSummary = (list: any[]) => {
    const income = list.filter(item => item.category === "income").reduce((sum, item) => sum + (item.amount || 0), 0);
    const fixed = list.filter(item => item.category === "fixed").reduce((sum, item) => sum + (item.amount || 0), 0);
    const variable = list.filter(item => item.category === "variable").reduce((sum, item) => sum + (item.amount || 0), 0);
    const expense = fixed + variable;
    return {
      income,
      expense,
      balance: income - expense
    };
  };

  const getSettlementSummary = (list: any[]) => {
    if (!user) return null;
    const expenses = list.filter(item => item.category !== "income");
    
    let myPaid = 0;
    let partnerPaid = 0;
    let myBurden = 0;
    let partnerBurden = 0;

    expenses.forEach(item => {
      const amount = item.amount || 0;
      const ratio = item.splitRatio !== undefined ? item.splitRatio : 50;

      if (item.uid === user.uid) {
        myPaid += amount;
        myBurden += amount * (ratio / 100);
        partnerBurden += amount * ((100 - ratio) / 100);
      } else {
        partnerPaid += amount;
        partnerBurden += amount * (ratio / 100);
        myBurden += amount * ((100 - ratio) / 100);
      }
    });

    const diff = myPaid - myBurden;

    return {
      myPaid,
      partnerPaid,
      myBurden,
      partnerBurden,
      diff
    };
  };

  const openDetailModal = (item: any) => {
    setSelectedBudget(item);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedBudget(null);
    setShowDetailModal(false);
  };

  const handleSaveMasterSettings = async (newCategories: BudgetCategory[], newTypes: BudgetType[]) => {
    try {
      const updatedMaster = {
        categories: newCategories,
        types: newTypes
      };
      await updateBudgetMasterData(updatedMaster);
      setCategories(newCategories);
      setTypes(newTypes);
    } catch (e) {
      console.error("Error saving master settings:", e);
      throw e;
    }
  };

  // エビデンス画像のアップロード
  const handleProofFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleKey || !user) return;
    try {
      showSpinner();
      const proof = await uploadBudgetSettlementProof(coupleKey, actualYear, actualMonth, file, user.uid);
      setSettlementProof(proof);
      showDialog("清算証明エビデンスを登録しました！📸");
    } catch (err) {
      console.error("Failed to upload budget settlement proof:", err);
      showDialog("画像のアップロード中に問題が発生したようです。");
    } finally {
      hideSpinner();
      if (proofInputRef.current) {
        proofInputRef.current.value = "";
      }
    }
  };

  // エビデンス画像の登録解除 (削除)
  const handleRemoveProof = async () => {
    if (!coupleKey) return;
    if (window.confirm("この証明書の登録を解除してもよろしいですか？\n※画像データも削除されます。")) {
      try {
         showSpinner();
         await removeBudgetSettlementProof(coupleKey, actualYear, actualMonth);
         setSettlementProof(null);
         setIsProofModalOpen(false);
         showDialog("証明書の登録を解除しました。");
      } catch (err) {
         console.error("Failed to remove proof:", err);
         showDialog("解除処理中に問題が発生したようです。");
      } finally {
         hideSpinner();
      }
    }
  };

  // 収支項目の添付ファイルをアップロードする
  const handleActProofFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleKey) return;
    try {
      showSpinner();
      
      // すでにファイルが添付されている場合は、古いファイルを Storage から自動で削除
      if (actProofUrl) {
        await removeActualBudgetProofFile(actProofUrl).catch(err => 
          console.warn("Failed to delete old file during replace:", err)
        );
      }

      // IDが無い場合は事前生成
      let targetId = actId;
      if (!targetId) {
        targetId = generateActualBudgetId();
        setActId(targetId);
      }

      const uploaded = await uploadActualBudgetProof(coupleKey, targetId, file);
      setActProofUrl(uploaded.proofUrl);
      setActProofFileName(uploaded.proofFileName);
      setActProofFileType(uploaded.proofFileType);
      showDialog("添付ファイルを更新しました！📎");
    } catch (err) {
      console.error("Failed to upload/replace actual budget proof:", err);
      showDialog("ファイルの添付中に問題が発生したようです。");
    } finally {
      hideSpinner();
      if (actProofInputRef.current) {
        actProofInputRef.current.value = "";
      }
    }
  };

  // 収支項目の添付ファイルの登録を解除する
  const handleRemoveActProofFile = async () => {
    if (!actProofUrl) return;
    if (window.confirm("このファイルの添付を解除してもよろしいですか？")) {
      try {
        showSpinner();
        await removeActualBudgetProofFile(actProofUrl);
        setActProofUrl("");
        setActProofFileName("");
        setActProofFileType("");
        showDialog("添付ファイルを解除しました。");
      } catch (err) {
        console.error("Failed to remove actual budget proof file:", err);
        showDialog("ファイルの解除中に問題が発生したようです。");
      } finally {
        hideSpinner();
      }
    }
  };

  const renderBudgetTable = (list: any[], onDelete: (id: string) => void, onEdit: (item: any) => void, isDefault: boolean) => {
    const sections = [
      { id: "fixed", title: "固定費 🏠" },
      { id: "variable", title: "変動費 🛒" },
      { id: "income", title: "収入 💰" }
    ];

    const hasData = list.length > 0;

    if (!hasData) {
      return (
        <div className={styles.emptyNotice}>
          {isDefault ? (
            <p>この月のデフォルト設定はまだ登録されていないようです。フォームから最初の収支見込みを追加してみましょう！🌱</p>
          ) : (
            <div className={styles.initialActionBlock}>
              <p>今月の実際の収支がまだ登録されていません。まずは下のボタンからデフォルトの収支を読み込んでみましょう！🌱</p>
              <button className={styles.copyBtn} onClick={handleCopyDefault}>
                <i className="fa-solid fa-cloud-arrow-down"></i> デフォルト収支から読み込む
              </button>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={styles.tableWrapper}>
        {/* PC用テーブル */}
        <table className={styles.budgetTable}>
          <thead>
            <tr>
              <th>区分</th>
              <th>種別</th>
              <th>人</th>
              <th>名前</th>
              <th>金額</th>
              <th>負担割合</th>
              <th>備考</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sections.map(section => {
              const filtered = list.filter(item => item.category === section.id);
              if (filtered.length === 0) return null;

              const subtotals = getSubtotals(list, section.id);

              return (
                <Fragment key={section.id}>
                  <tr className={styles.sectionHeaderRow}>
                    <td colSpan={8}>{section.title}</td>
                  </tr>

                  {filtered.map(item => {
                    const categoryName = categories.find(c => c.id === item.category)?.name || item.category;
                    const typeName = types.find(t => t.id === item.type)?.name || item.type;
                    const itemUserName = item.uid === user?.uid ? myName : partnerName;

                    return (
                      <tr key={item.id} className={styles.budgetRow}>
                        <td className={styles.categoryCell}>{categoryName}</td>
                        <td className={styles.typeCell}>{typeName}</td>
                        <td className={styles.userCell}>
                          <span className={item.uid === user?.uid ? styles.userBadgeMe : styles.userBadgePartner}>
                            {itemUserName}
                          </span>
                        </td>
                        <td className={styles.nameCell}>{item.name}</td>
                        <td className={styles.amountCell}>{formatCurrency(item.amount)}</td>
                        <td className={styles.ratioCell}>
                          {item.category === "income" ? "-" : (
                            item.splitRatio === undefined || item.splitRatio === 50 ? "折半" :
                            item.uid === user?.uid ? `自分:${item.splitRatio}% / 相手:${100 - item.splitRatio}%` :
                            `自分:${100 - item.splitRatio}% / 相手:${item.splitRatio}%`
                          )}
                        </td>
                        <td className={styles.memoCell}>{item.memo || "-"}</td>
                        <td className={styles.actionCell}>
                          <button className={styles.editRowBtn} onClick={() => onEdit(item)}>
                            <i className="fa-solid fa-pen"></i>
                          </button>
                          <button className={styles.deleteRowBtn} onClick={() => {
                            if (window.confirm("この項目を削除してもよろしいですか？")) {
                              onDelete(item.id);
                            }
                          }}>
                            <i className="fa-solid fa-trash"></i>
                          </button>
                        </td>
                      </tr>
                    );
                  })}

                  <tr className={styles.subtotalRow}>
                    <td colSpan={2} className={styles.subtotalLabel}>小計</td>
                    <td colSpan={6} className={styles.subtotalValue}>
                      <span className={styles.subtotalPerson}>{myName}: <strong>{formatCurrency(subtotals.my)}</strong></span>
                      {partnerUser && (
                        <span className={styles.subtotalPerson}>{partnerName}: <strong>{formatCurrency(subtotals.partner)}</strong></span>
                      )}
                      <span className={styles.subtotalTotal}>合計: <strong>{formatCurrency(subtotals.total)}</strong></span>
                    </td>
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>

        {/* スマホ用カードリスト */}
        <div className={styles.mobileList}>
          {sections.map(section => {
            const filtered = list.filter(item => item.category === section.id);
            if (filtered.length === 0) return null;
            const subtotals = getSubtotals(list, section.id);

            return (
              <div key={section.id} className={styles.mobileSection}>
                <div className={styles.mobileSectionTitle}>{section.title}</div>
                {filtered.map(item => {
                  const typeName = types.find(t => t.id === item.type)?.name || item.type;
                  const itemUserName = item.uid === user?.uid ? myName : partnerName;
                  return (
                    <div key={item.id} className={styles.mobileCard} onClick={() => openDetailModal(item)}>
                      <div className={styles.mobileCardMain}>
                        <span className={styles.mobileCardName}>{item.name}</span>
                        <span className={styles.mobileCardAmount}>{formatCurrency(item.amount)}</span>
                      </div>
                      <div className={styles.mobileCardSub}>
                        <span className={item.uid === user?.uid ? styles.mobileUserBadgeMe : styles.mobileUserBadgePartner}>
                          {itemUserName}
                        </span>
                        <span className={styles.mobileTypeName}>{typeName}</span>
                        {item.category !== "income" && (
                          <span className={styles.mobileCardRatio}>
                            負担: {item.splitRatio === undefined || item.splitRatio === 50 ? "折半" : 
                              item.uid === user?.uid ? `自分:${item.splitRatio}%` :
                              `相手:${item.splitRatio}%`
                            }
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div className={styles.mobileSubtotalCard}>
                  <div className={styles.mobileSubtotalTitle}>小計</div>
                  <div className={styles.mobileSubtotalGrid}>
                    <div className={styles.mobileSubtotalPerson}>
                      <span>{myName}:</span>
                      <strong>{formatCurrency(subtotals.my)}</strong>
                    </div>
                    {partnerUser && (
                      <div className={styles.mobileSubtotalPerson}>
                        <span>{partnerName}:</span>
                        <strong>{formatCurrency(subtotals.partner)}</strong>
                      </div>
                    )}
                  </div>
                  <div className={styles.mobileSubtotalTotal}>
                    <span>合計:</span>
                    <strong>{formatCurrency(subtotals.total)}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <div className="page-container" />;
  }

  const activeBudgets = activeTab === "actual" ? actualBudgets : defaultBudgets;
  const summary = getOverallSummary(activeBudgets);

  return (
    <div className="page-container">
      <div className={styles.headerRow}>
        <div className="card-title-main">
          <i className="fa-solid fa-wallet"></i> 二人の家計簿
        </div>
        <button className={styles.settingsMenuBtn} onClick={() => setShowSettingsModal(true)}>
          <i className="fa-solid fa-sliders"></i> 区分・種別の設定
        </button>
      </div>

      {/* タブ切り替え */}
      <div className={styles.tabContainer}>
        <button
          className={`${styles.tabBtn} ${activeTab === "actual" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("actual")}
        >
          <i className="fa-solid fa-calendar-days"></i> 毎月の収支登録
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === "default" ? styles.tabActive : ""}`}
          onClick={() => setActiveTab("default")}
        >
          <i className="fa-solid fa-gear"></i> デフォルト収支設定
        </button>
      </div>

      {/* 収支サマリーカード */}
      <div className={styles.summaryCard}>
        <div className={styles.summaryTitle}>
          <i className="fa-solid fa-chart-pie"></i> {activeTab === "actual" ? `${actualYear}年${actualMonth}月` : `${defaultMonth}月`} の収支要約
        </div>
        <div className={styles.summaryGrid}>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>総収入</span>
            <span className={`${styles.summaryVal} ${styles.incomeVal}`}>{formatCurrency(summary.income)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>総支出</span>
            <span className={`${styles.summaryVal} ${styles.expenseVal}`}>{formatCurrency(summary.expense)}</span>
          </div>
          <div className={styles.summaryItem}>
            <span className={styles.summaryLabel}>余剰金</span>
            <span className={`${styles.summaryVal} ${summary.balance >= 0 ? styles.plusVal : styles.minusVal}`}>
              {formatCurrency(summary.balance)}
            </span>
          </div>
        </div>
      </div>

      {/* 清算・負担のまとめエリア */}
      {activeTab === "actual" && (
        <div className={styles.settlementSection}>
          <div className={styles.settlementTitle}>
            <i className="fa-solid fa-hand-holding-dollar"></i> 清算・負担のまとめ
          </div>
          {(() => {
            const setSum = getSettlementSummary(actualBudgets);
            if (!setSum) return null;
            return (
              <div className={styles.settlementContent}>
                <div className={styles.settlementGrid}>
                  <div className={styles.settlementCard}>
                    <div className={styles.settlementCardLabel}>{myName}の状況</div>
                    <div className={styles.settlementCardRow}>
                      <span>支払った額:</span>
                      <strong>{formatCurrency(setSum.myPaid)}</strong>
                    </div>
                    <div className={styles.settlementCardRow}>
                      <span>実質負担額:</span>
                      <strong>{formatCurrency(setSum.myBurden)}</strong>
                    </div>
                  </div>
                  {partnerUser && (
                    <div className={styles.settlementCard}>
                      <div className={styles.settlementCardLabel}>{partnerName}の状況</div>
                      <div className={styles.settlementCardRow}>
                        <span>支払った額:</span>
                        <strong>{formatCurrency(setSum.partnerPaid)}</strong>
                      </div>
                      <div className={styles.settlementCardRow}>
                        <span>実質負担額:</span>
                        <strong>{formatCurrency(setSum.partnerBurden)}</strong>
                      </div>
                    </div>
                  )}
                </div>

                {/* 視覚的清算フロー表示 */}
                <div className={styles.settlementResult}>
                  {setSum.diff === 0 ? (
                    <div className={styles.settlementClean}>現在、二人の清算額はピッタリ折半で清算なしです！✨</div>
                  ) : (
                    <div className={styles.settlementFlowBlock}>
                      <div className={styles.settlementFlow}>
                        {/* 送金元 */}
                        <div className={styles.userNode}>
                          <img
                            src={setSum.diff < 0 ? myPictureUrl : partnerPictureUrl}
                            alt="送金元"
                            className={styles.userAvatar}
                          />
                          <span className={styles.userName}>
                            {setSum.diff < 0 ? myName : partnerName}
                          </span>
                        </div>

                        {/* 矢印 & 金額 */}
                        <div className={styles.flowArrow}>
                          <span className={styles.amountHighlight}>
                            {formatCurrency(Math.abs(setSum.diff))}
                          </span>
                          <i
                            className="fa-solid fa-arrow-right-long"
                            style={{ fontSize: "24px" }}
                          ></i>
                        </div>

                        {/* 送金先 */}
                        <div className={styles.userNode}>
                          <img
                            src={setSum.diff < 0 ? partnerPictureUrl : myPictureUrl}
                            alt="送金先"
                            className={styles.userAvatar}
                          />
                          <span className={styles.userName}>
                            {setSum.diff < 0 ? partnerName : myName}
                          </span>
                        </div>
                      </div>
                      <div className={styles.settlementActionText}>
                        {setSum.diff < 0 ? (
                          <>
                            <strong>{myName}</strong> から <strong>{partnerName}</strong> へ <strong>{formatCurrency(Math.abs(setSum.diff))}</strong> 送金して調整します。💸
                          </>
                        ) : (
                          <>
                            <strong>{partnerName}</strong> から <strong>{myName}</strong> へ <strong>{formatCurrency(setSum.diff)}</strong> 送金して調整します。💰
                          </>
                        )}
                      </div>

                      {/* PayPay支払いのエビデンス登録 */}
                      <div className={styles.settlementProofArea}>
                        <input
                          type="file"
                          accept="image/*"
                          ref={proofInputRef}
                          style={{ display: "none" }}
                          onChange={handleProofFileSelect}
                        />
                        {settlementProof ? (
                          <div className={styles.proofInfoBox}>
                            <span className={styles.proofLabel}>清算エビデンス：</span>
                            <button type="button" className={styles.proofBadgeBtn} onClick={() => setIsProofModalOpen(true)}>
                              <i className="fa-solid fa-image"></i> 送金完了の証明を確認
                            </button>
                          </div>
                        ) : (
                          <button type="button" className={styles.uploadProofBtn} onClick={() => proofInputRef.current?.click()}>
                            <i className="fa-solid fa-file-arrow-up"></i> PayPay支払いのエビデンスを登録
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

              </div>
            );
          })()}
        </div>
      )}

      {/* タブコンテンツ */}
      {activeTab === "actual" && (
        <div className={styles.contentBlock}>
          {/* 月選択 */}
          <div className={styles.monthSelector}>
            <button className={styles.monthNavBtn} onClick={handlePrevMonth}>
              <i className="fa-solid fa-chevron-left"></i> 前月
            </button>
            <span className={styles.currentMonthDisplay}>
              {actualYear}年 {actualMonth}月
            </span>
            <button className={styles.monthNavBtn} onClick={handleNextMonth}>
              翌月 <i className="fa-solid fa-chevron-right"></i>
            </button>
          </div>

          {/* 新規登録フォームトグルボタン */}
          {!showActForm && (
            <div className={styles.actionHeader}>
              <button className={styles.addBtn} onClick={() => {
                resetActForm();
                setShowActForm(true);
              }}>
                <i className="fa-solid fa-plus"></i> 新しい実際の収支を登録
              </button>

            </div>
          )}

          {/* 実際収支フォームモーダル */}
          {showActForm && (
            <div className={styles.modalOverlay} onClick={() => { resetActForm(); setShowActForm(false); }}>
              <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.modalHeader}>
                  <h2 className={styles.modalTitle}>
                    <i className="fa-solid fa-pen-to-square"></i> {actId ? "実際の収支を編集" : "実際の収支を登録"}
                  </h2>
                  <button type="button" className={styles.modalClose} onClick={() => { resetActForm(); setShowActForm(false); }}>
                    <i className="fa-solid fa-xmark"></i>
                  </button>
                </div>
                <form onSubmit={handleSaveActual} className={styles.formModalForm}>
                  <div className={styles.formModalBody}>
                    <div className={styles.formGrid}>
                  {/* 人 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>人</label>
                    <div className={styles.radioGroup}>
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="actTargetUid"
                          value={user?.uid}
                          checked={actTargetUid === user?.uid}
                          onChange={() => setActTargetUid(user?.uid || "")}
                        />
                        {myName}
                      </label>
                      {partnerUser && (
                        <label className={styles.radioLabel}>
                          <input
                            type="radio"
                            name="actTargetUid"
                            value={partnerUser.id}
                            checked={actTargetUid === partnerUser.id}
                            onChange={() => setActTargetUid(partnerUser.id)}
                          />
                          {partnerName}
                        </label>
                      )}
                    </div>
                  </div>

                  {/* 区分 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>区分</label>
                    <select
                      className={styles.appSelect}
                      value={actCategory}
                      onChange={(e) => setActCategory(e.target.value)}
                    >
                      {categories.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 種別 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>種別</label>
                    <select
                      className={styles.appSelect}
                      value={actType}
                      onChange={(e) => setActType(e.target.value)}
                    >
                      {types.filter(t => t.categoryId === actCategory).map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* 名前 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>名前</label>
                    <input
                      type="text"
                      className={styles.appInput}
                      placeholder="例: 食費、携帯代"
                      value={actName}
                      onChange={(e) => setActName(e.target.value)}
                      required
                    />
                  </div>

                  {/* 金額 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>金額 (円)</label>
                    <input
                      type="number"
                      className={styles.appInput}
                      placeholder="例: 10000"
                      value={actAmount}
                      onChange={(e) => setActAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                      required
                    />
                  </div>

                  {/* 備考 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>備考</label>
                    <input
                      type="text"
                      className={styles.appInput}
                      placeholder="例: 光熱費が高め"
                      value={actMemo}
                      onChange={(e) => setActMemo(e.target.value)}
                    />
                  </div>

                  {/* エビデンス添付 */}
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>エビデンス (画像・PDF)</label>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      ref={actProofInputRef}
                      style={{ display: "none" }}
                      onChange={handleActProofFileSelect}
                    />
                    {actProofUrl ? (
                      <div className={styles.attachedProofBox}>
                        <span className={styles.attachedProofName} title={actProofFileName}>
                          {actProofFileType === "pdf" ? "📄" : "📷"} {actProofFileName}
                        </span>
                        <div className={styles.attachedProofActions}>
                          <a
                            href={actProofUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.viewAttachBtn}
                          >
                            確認
                          </a>
                          <button
                            type="button"
                            className={styles.changeAttachBtn}
                            onClick={() => actProofInputRef.current?.click()}
                          >
                            変更
                          </button>
                          <button
                            type="button"
                            className={styles.removeAttachBtn}
                            onClick={handleRemoveActProofFile}
                          >
                            解除
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.attachBtn}
                        onClick={() => actProofInputRef.current?.click()}
                      >
                        <i className="fa-solid fa-paperclip"></i> ファイルを添付
                      </button>
                    )}
                  </div>

                  {/* 負担設定 */}
                  {actCategory !== "income" && (
                    <div className={`${styles.formGroup} ${styles.ratioFormGroup}`}>
                      <label className={styles.formLabel}>負担設定</label>
                      <div className={styles.splitModeSelector}>
                        <label className={styles.radioLabelInline}>
                          <input
                            type="radio"
                            name="actSplitMode"
                            value="equal"
                            checked={actSplitMode === "equal"}
                            onChange={() => setActSplitMode("equal")}
                          />
                          折半 (5:5)
                        </label>
                        <label className={styles.radioLabelInline}>
                          <input
                            type="radio"
                            name="actSplitMode"
                            value="custom"
                            checked={actSplitMode === "custom"}
                            onChange={() => setActSplitMode("custom")}
                          />
                          比率を指定
                        </label>
                      </div>
                      {actSplitMode === "custom" && (
                        <div className={styles.ratioInputs}>
                          <div className={styles.ratioInputWrapper}>
                            <span>{myName}:</span>
                            <input
                              type="number"
                              className={styles.ratioInput}
                              min="0"
                              max="100"
                              value={actMyRatio}
                              placeholder="50"
                              onChange={(e) => {
                                const val = e.target.value !== "" ? Number(e.target.value) : "";
                                setActMyRatio(val);
                                if (typeof val === "number") {
                                  setActPartnerRatio(100 - val);
                                }
                              }}
                            />
                            <span>%</span>
                          </div>
                          <div className={styles.ratioInputWrapper}>
                            <span>{partnerName}:</span>
                            <input
                              type="number"
                              className={styles.ratioInput}
                              min="0"
                              max="100"
                              value={actPartnerRatio}
                              placeholder="50"
                              onChange={(e) => {
                                const val = e.target.value !== "" ? Number(e.target.value) : "";
                                setActPartnerRatio(val);
                                if (typeof val === "number") {
                                  setActMyRatio(100 - val);
                                }
                              }}
                            />
                            <span>%</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalActions}>
                <button type="submit" className={styles.submitBtn}>
                  <i className="fa-solid fa-check"></i> 保存する
                </button>
                <button type="button" className={styles.cancelBtn} onClick={() => {
                  resetActForm();
                  setShowActForm(false);
                }}>
                  キャンセル
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

          {/* 表表示 */}
          {renderBudgetTable(actualBudgets, handleDeleteActualItem, handleEditActual, false)}
        </div>
      )}

      {activeTab === "default" && (
        <div className={styles.contentBlock}>
          {/* 月選択タブ (1〜12月) */}
          <div className={styles.monthSelectorScroll}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
              <button
                key={m}
                className={`${styles.monthTabBtn} ${defaultMonth === m ? styles.monthTabActive : ""}`}
                onClick={() => handleDefaultMonthChange(m)}
              >
                {m}月
              </button>
            ))}
          </div>

          {/* 表表示 */}
          {renderBudgetTable(defaultBudgets, handleDeleteDefaultItem, handleEditDefault, true)}

          {/* デフォルト収支登録フォーム */}
          <div className={styles.formCard}>
            <div className={styles.formTitle}>
              <i className="fa-solid fa-pen-to-square"></i> {dfId ? `デフォルト収支を編集` : `デフォルト収支を登録`}
            </div>
            <form onSubmit={handleSaveDefault}>
              <div className={styles.formGrid}>
                {/* 人 */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>人</label>
                  <div className={styles.radioGroup}>
                    <label className={styles.radioLabel}>
                      <input
                        type="radio"
                        name="dfTargetUid"
                        value={user?.uid}
                        checked={dfTargetUid === user?.uid}
                        onChange={() => setDfTargetUid(user?.uid || "")}
                      />
                      {myName}
                    </label>
                    {partnerUser && (
                      <label className={styles.radioLabel}>
                        <input
                          type="radio"
                          name="dfTargetUid"
                          value={partnerUser.id}
                          checked={dfTargetUid === partnerUser.id}
                          onChange={() => setDfTargetUid(partnerUser.id)}
                        />
                        {partnerName}
                      </label>
                    )}
                  </div>
                </div>

                {/* 対象月 */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>対象月 (複数選択可)</label>
                  <div className={styles.checkboxGroup}>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => {
                      const isOriginal = dfId && m === dfOriginalMonth;
                      const isChecked = dfMonths.includes(m);
                      return (
                        <label key={m} className={`${styles.checkboxLabel} ${isOriginal ? styles.disabledLabel : ""}`}>
                          <input
                            type="checkbox"
                            value={m}
                            checked={isChecked}
                            disabled={!!isOriginal}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setDfMonths([...dfMonths, m].sort((a, b) => a - b));
                              } else {
                                setDfMonths(dfMonths.filter((x) => x !== m));
                              }
                            }}
                          />
                          {m}月
                        </label>
                      );
                    })}
                  </div>
                  <div className={styles.checkboxActions}>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      onClick={() => {
                        const allMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                        setDfMonths(allMonths);
                      }}
                    >
                      すべて選択
                    </button>
                    <button
                      type="button"
                      className={styles.miniBtn}
                      onClick={() => {
                        if (dfOriginalMonth !== null) {
                          setDfMonths([dfOriginalMonth]);
                        } else {
                          setDfMonths([]);
                        }
                      }}
                    >
                      選択解除
                    </button>
                  </div>
                </div>

                {/* 区分 */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>区分</label>
                  <select
                    className={styles.appSelect}
                    value={dfCategory}
                    onChange={(e) => setDfCategory(e.target.value)}
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* 種別 */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>種別</label>
                  <select
                    className={styles.appSelect}
                    value={dfType}
                    onChange={(e) => setDfType(e.target.value)}
                  >
                    {types.filter(t => t.categoryId === dfCategory).map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                {/* 名前 */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>名前</label>
                  <input
                    type="text"
                    className={styles.appInput}
                    placeholder="例: 家賃、食費、給料"
                    value={dfName}
                    onChange={(e) => setDfName(e.target.value)}
                    required
                  />
                </div>

                {/* 金額 */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>金額 (円)</label>
                  <input
                    type="number"
                    className={styles.appInput}
                    placeholder="例: 65000"
                    value={dfAmount}
                    onChange={(e) => setDfAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                    required
                  />
                </div>

                {/* 備考 */}
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>備考</label>
                  <input
                    type="text"
                    className={styles.appInput}
                    placeholder="例: 2028年4月まで"
                    value={dfMemo}
                    onChange={(e) => setDfMemo(e.target.value)}
                  />
                </div>

                {/* 負担設定 */}
                {dfCategory !== "income" && (
                  <div className={`${styles.formGroup} ${styles.ratioFormGroup}`}>
                    <label className={styles.formLabel}>負担設定</label>
                    <div className={styles.splitModeSelector}>
                      <label className={styles.radioLabelInline}>
                        <input
                          type="radio"
                          name="dfSplitMode"
                          value="equal"
                          checked={dfSplitMode === "equal"}
                          onChange={() => setDfSplitMode("equal")}
                        />
                        折半 (5:5)
                      </label>
                      <label className={styles.radioLabelInline}>
                        <input
                          type="radio"
                          name="dfSplitMode"
                          value="custom"
                          checked={dfSplitMode === "custom"}
                          onChange={() => setDfSplitMode("custom")}
                        />
                        比率を指定
                      </label>
                    </div>
                    {dfSplitMode === "custom" && (
                      <div className={styles.ratioInputs}>
                        <div className={styles.ratioInputWrapper}>
                          <span>{myName}:</span>
                          <input
                            type="number"
                            className={styles.ratioInput}
                            min="0"
                            max="100"
                            value={dfMyRatio}
                            placeholder="50"
                            onChange={(e) => {
                              const val = e.target.value !== "" ? Number(e.target.value) : "";
                              setDfMyRatio(val);
                              if (typeof val === "number") {
                                setDfPartnerRatio(100 - val);
                              }
                            }}
                          />
                          <span>%</span>
                        </div>
                        <div className={styles.ratioInputWrapper}>
                          <span>{partnerName}:</span>
                          <input
                            type="number"
                            className={styles.ratioInput}
                            min="0"
                            max="100"
                            value={dfPartnerRatio}
                            placeholder="50"
                            onChange={(e) => {
                              const val = e.target.value !== "" ? Number(e.target.value) : "";
                              setDfPartnerRatio(val);
                              if (typeof val === "number") {
                                setDfMyRatio(100 - val);
                              }
                            }}
                          />
                          <span>%</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className={styles.formActions}>
                <button type="submit" className={styles.submitBtn}>
                  <i className="fa-solid fa-check"></i> {dfId ? "更新する" : "登録する"}
                </button>
                {dfId && (
                  <button type="button" className={styles.cancelBtn} onClick={resetDfForm}>
                    キャンセル
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 詳細確認モーダル */}
      {showDetailModal && selectedBudget && (
        <div className={styles.modalOverlay} onClick={closeDetailModal}>
          <div className={styles.detailModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <i className="fa-solid fa-file-invoice-dollar"></i> 収支の詳細
              </h2>
              <button className={styles.modalClose} onClick={closeDetailModal}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>区分・種別:</span>
                <span className={styles.detailValue}>
                  {categories.find(c => c.id === selectedBudget.category)?.name || selectedBudget.category} /{" "}
                  {types.find(t => t.id === selectedBudget.type)?.name || selectedBudget.type}
                </span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>品名・名前:</span>
                <span className={styles.detailValue}><strong>{selectedBudget.name}</strong></span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>金額:</span>
                <span className={`${styles.detailValue} ${styles.detailAmount}`}>{formatCurrency(selectedBudget.amount)}</span>
              </div>
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>支払者:</span>
                <span className={styles.detailValue}>
                  <span className={selectedBudget.uid === user?.uid ? styles.userBadgeMe : styles.userBadgePartner}>
                    {selectedBudget.uid === user?.uid ? myName : partnerName}
                  </span>
                </span>
              </div>
              {selectedBudget.category !== "income" && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>負担割合:</span>
                  <div className={styles.detailRatioBlock}>
                    {(() => {
                      const ratio = selectedBudget.splitRatio !== undefined ? selectedBudget.splitRatio : 50;
                      const isMe = selectedBudget.uid === user?.uid;
                      const myShare = isMe ? ratio : 100 - ratio;
                      const partnerShare = isMe ? 100 - ratio : ratio;
                      return (
                        <>
                          <div className={styles.detailRatioItem}>
                            <span>{myName}:</span>
                            <strong>{myShare}%</strong> ({formatCurrency(selectedBudget.amount * (myShare / 100))})
                          </div>
                          <div className={styles.detailRatioItem}>
                            <span>{partnerName}:</span>
                            <strong>{partnerShare}%</strong> ({formatCurrency(selectedBudget.amount * (partnerShare / 100))})
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              )}
              <div className={styles.detailRow}>
                <span className={styles.detailLabel}>備考:</span>
                <span className={styles.detailValue}>{selectedBudget.memo || "（なし）"}</span>
              </div>
              {selectedBudget.proofUrl && (
                <div className={styles.detailRow}>
                  <span className={styles.detailLabel}>添付エビデンス:</span>
                  <span className={styles.detailValue}>
                    <a
                      href={selectedBudget.proofUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.detailProofLink}
                    >
                      {selectedBudget.proofFileType === "pdf" ? (
                        <>
                          <i className="fa-solid fa-file-pdf" style={{ color: "#e53935", marginRight: "6px" }}></i>
                          領収書PDFを確認する 📄
                        </>
                      ) : (
                        <>
                          <i className="fa-solid fa-image" style={{ color: "#3949ab", marginRight: "6px" }}></i>
                          添付画像を確認する 📷
                        </>
                      )}
                    </a>
                  </span>
                </div>
              )}
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalEditBtn} onClick={() => {
                closeDetailModal();
                if (activeTab === "actual") {
                  handleEditActual(selectedBudget);
                } else {
                  handleEditDefault(selectedBudget);
                }
              }}>
                <i className="fa-solid fa-pen"></i> 編集する
              </button>
              <button className={styles.modalDeleteBtn} onClick={() => {
                if (window.confirm("この項目を削除してもよろしいですか？")) {
                  closeDetailModal();
                  if (activeTab === "actual") {
                    handleDeleteActualItem(selectedBudget.id);
                  } else {
                    handleDeleteDefaultItem(selectedBudget.id);
                  }
                }
              }}>
                <i className="fa-solid fa-trash"></i> 削除する
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 区分・種別設定モーダル */}
      <BudgetMasterSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        categories={categories}
        types={types}
        onSave={handleSaveMasterSettings}
      />
      {/* 今月の家計分析（実際の収支タブかつデータがある場合のみ表示） */}
      {activeTab === "actual" && actualBudgets.length > 0 && (
        <BudgetAnalysis
          actualBudgets={actualBudgets}
          categories={categories}
          types={types}
          user={userData}
          partnerUser={partnerUser}
          year={actualYear}
          month={actualMonth}
        />
      )}

      {/* 計算プロセスの詳細 */}
      {activeTab === "actual" && (() => {
        const setSum = getSettlementSummary(actualBudgets);
        if (!setSum) return null;
        return (
          <div className={styles.formulaBox} style={{ marginTop: "24px", marginBottom: "24px" }}>
            <div className={styles.formulaTitle}>
              <i className="fa-solid fa-calculator"></i>
              <span>精算額の計算プロセスと詳細</span>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>1</span>
              <div>
                <span>二人の支出（固定費＋変動費）の実支払額</span>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                  • 全体の支出合計: <strong>{formatCurrency(setSum.myPaid + setSum.partnerPaid)}</strong><br />
                  • {myName} の支払額: {formatCurrency(setSum.myPaid)}<br />
                  • {partnerName} の支払額: {formatCurrency(setSum.partnerPaid)}
                </div>
              </div>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>2</span>
              <div>
                <span>各項目の負担割合に基づく目標負担額</span>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                  • {myName} の目標負担額: <strong>{formatCurrency(setSum.myBurden)}</strong><br />
                  • {partnerName} の目標負担額: <strong>{formatCurrency(setSum.partnerBurden)}</strong><br />
                  <span style={{ fontSize: "11px", color: "#888" }}>
                    (※ 各支出項目ごとの設定割合「金額 × 負担率 %」の合算値です。未設定項目は折半 50% として計算されます)
                  </span>
                </div>
              </div>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>3</span>
              <div>
                <span>支払済みの金額と目標負担額の差額</span>
                <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
                  • {myName}: {formatCurrency(setSum.myPaid)} (支払額) - {formatCurrency(setSum.myBurden)} (目標) = <strong>{setSum.diff > 0 ? `+${formatCurrency(setSum.diff)}` : formatCurrency(setSum.diff)}</strong><br />
                  • {partnerName}: {formatCurrency(setSum.partnerPaid)} (支払額) - {formatCurrency(setSum.partnerBurden)} (目標) = <strong>{-setSum.diff > 0 ? `+${formatCurrency(-setSum.diff)}` : formatCurrency(-setSum.diff)}</strong>
                </div>
              </div>
            </div>
            <div className={styles.formulaStep}>
              <span className={styles.stepNum}>4</span>
              <div>
                <span><strong>精算のアクション</strong></span>
                <div style={{ fontSize: "12px", color: "#c2185b", fontWeight: "bold", marginTop: "2px" }}>
                  {setSum.diff === 0 ? (
                    <span>支払額と目標負担が一致しているため、送金による清算は不要です。⚖️</span>
                  ) : setSum.diff < 0 ? (
                    <span>
                      目標の負担額に合わせるため、{myName} から {partnerName} へ <strong>{formatCurrency(Math.abs(setSum.diff))}</strong> を送金して調整します。💸
                      {partnerUser?.paypayId && (
                        <div style={{ fontSize: "11px", color: "#666", fontWeight: "normal", marginTop: "4px" }}>
                          👉 送金先 ({partnerName}) の PayPay ID: <strong>{partnerUser.paypayId}</strong>
                        </div>
                      )}
                    </span>
                  ) : (
                    <span>
                      目標の負担額に合わせるため、{partnerName} から {myName} へ <strong>{formatCurrency(setSum.diff)}</strong> を送金して調整します。💰
                      {userData?.paypayId && (
                        <div style={{ fontSize: "11px", color: "#666", fontWeight: "normal", marginTop: "4px" }}>
                          👉 送金先 ({myName}) の PayPay ID: <strong>{userData.paypayId}</strong>
                        </div>
                      )}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* エビデンス画像プレビューモーダル */}
      {isProofModalOpen && settlementProof && (
        <div className={styles.modalOverlay} onClick={() => setIsProofModalOpen(false)}>
          <div className={styles.proofModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                <i className="fa-solid fa-image"></i> 清算エビデンス
              </h2>
              <button className={styles.modalClose} onClick={() => setIsProofModalOpen(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className={styles.modalBody} style={{ textAlign: "center", padding: "16px" }}>
              <img
                src={settlementProof.proofUrl}
                alt="清算証明"
                className={styles.proofFullImage}
              />
              <div className={styles.proofMetaInfo}>
                <p>登録ファイル名: {settlementProof.proofFileName}</p>
                <p>登録日時: {new Date(settlementProof.proofUploadedAt).toLocaleString()}</p>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button className={styles.modalDeleteBtn} onClick={handleRemoveProof}>
                <i className="fa-solid fa-trash"></i> 登録を解除する
              </button>
              <button className={styles.cancelBtn} onClick={() => setIsProofModalOpen(false)}>
                閉じる
              </button>
            </div>
          </div>
        </div>
      )}

      <BackToHome />
    </div>
  );
}
