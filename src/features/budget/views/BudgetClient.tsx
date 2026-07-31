"use client";

import { useEffect, useState, Fragment } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { User as FirestoreUser, BudgetCategory, BudgetType, DefaultBudget, ActualBudget } from "@/src/lib/firestore/types";
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
  copyDefaultToActual
} from "../api/budget-client-service";

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

      await Promise.all([
        loadDefaultBudgets(cKey, defaultMonth),
        loadActualBudgets(cKey, actualYear, actualMonth)
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
      await loadActualBudgets(coupleKey, year, month);
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
    if (!coupleKey || !dfTargetUid || !dfCategory || !dfType || !dfName || dfAmount === "") {
      showDialog("入力項目に不足があるようです。ご確認ください。");
      return;
    }

    try {
      showSpinner();
      await saveDefaultBudget({
        id: dfId,
        coupleKey,
        uid: dfTargetUid,
        month: defaultMonth,
        category: dfCategory,
        type: dfType,
        name: dfName,
        amount: Number(dfAmount),
        memo: dfMemo
      });
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
  };

  const handleEditDefault = (item: DefaultBudget) => {
    setDfId(item.id);
    setDfTargetUid(item.uid);
    setDfCategory(item.category);
    setDfType(item.type);
    setDfName(item.name);
    setDfAmount(item.amount);
    setDfMemo(item.memo || "");
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
        memo: actMemo
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
  };

  const handleEditActual = (item: ActualBudget) => {
    setActId(item.id);
    setActTargetUid(item.uid);
    setActCategory(item.category);
    setActType(item.type);
    setActName(item.name);
    setActAmount(item.amount);
    setActMemo(item.memo || "");
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
        <table className={styles.budgetTable}>
          <thead>
            <tr>
              <th>区分</th>
              <th>種別</th>
              <th>人</th>
              <th>名前</th>
              <th>金額</th>
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
                    <td colSpan={7}>{section.title}</td>
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
                    <td colSpan={5} className={styles.subtotalValue}>
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
      <div className="card-title-main">
        <i className="fa-solid fa-wallet"></i> 二人の家計簿
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
              {actualBudgets.length > 0 && (
                <button className={styles.copyBtnSecondary} onClick={handleCopyDefault}>
                  <i className="fa-solid fa-rotate"></i> デフォルトから再読み込み
                </button>
              )}
            </div>
          )}

          {/* 実際収支フォーム */}
          {showActForm && (
            <div className={styles.formCard}>
              <div className={styles.formTitle}>
                <i className="fa-solid fa-pen-to-square"></i> {actId ? "実際の収支を編集" : "実際の収支を登録"}
              </div>
              <form onSubmit={handleSaveActual}>
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
                      placeholder="例: 高熱費が高め"
                      value={actMemo}
                      onChange={(e) => setActMemo(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.formActions}>
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

          {/* デフォルト収支登録フォーム */}
          <div className={styles.formCard}>
            <div className={styles.formTitle}>
              <i className="fa-solid fa-pen-to-square"></i> {dfId ? `${defaultMonth}月のデフォルト収支を編集` : `${defaultMonth}月のデフォルト収支を登録`}
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

          {/* 表表示 */}
          {renderBudgetTable(defaultBudgets, handleDeleteDefaultItem, handleEditDefault, true)}
        </div>
      )}

      <BackToHome />
    </div>
  );
}
