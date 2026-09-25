"use client";

import { useState, useEffect, useRef } from "react";
import { User as FirestoreUser, BudgetCategory, BudgetType, ActualBudget } from "@/src/lib/firestore/types";
import { showDialog, showSpinner, hideSpinner, errorLog } from "@/src/lib/functions";
import {
  getBudgetMasterData,
  saveActualBudget,
  uploadActualBudgetProof,
  removeActualBudgetProofFile,
  generateActualBudgetId,
} from "../api/budget-client-service";
import styles from "./ActualBudgetModal.module.css";

interface ActualBudgetModalProps {
  isOpen: boolean;
  onClose: () => void;
  year: number;
  month: number;
  currentUserId: string;
  myNickname?: string;
  partnerUser: FirestoreUser | null;
  partnerNickname?: string;
  coupleKey?: string;
  onSuccess?: (savedItem: ActualBudget) => void;
}

export default function ActualBudgetModal({
  isOpen,
  onClose,
  year,
  month,
  currentUserId,
  myNickname = "自分",
  partnerUser,
  partnerNickname = "パートナー",
  coupleKey: providedCoupleKey,
  onSuccess,
}: ActualBudgetModalProps) {
  // coupleKeyの決定
  const coupleKey =
    providedCoupleKey ||
    (partnerUser
      ? currentUserId < partnerUser.id
        ? `${currentUserId}_${partnerUser.id}`
        : `${partnerUser.id}_${currentUserId}`
      : currentUserId);

  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [types, setTypes] = useState<BudgetType[]>([]);

  // フォームステート
  const [actDate, setActDate] = useState<string>("");
  const [actTargetUid, setActTargetUid] = useState<string>(currentUserId);
  const [actCategory, setActCategory] = useState<string>("");
  const [actType, setActType] = useState<string>("");
  const [actName, setActName] = useState<string>("");
  const [actAmount, setActAmount] = useState<number | "">("");
  const [actMemo, setActMemo] = useState<string>("");
  const [actSplitMode, setActSplitMode] = useState<"equal" | "custom">("equal");
  const [actMyRatio, setActMyRatio] = useState<number | "">(50);
  const [actPartnerRatio, setActPartnerRatio] = useState<number | "">(50);

  // 添付エビデンス
  const [actProofUrl, setActProofUrl] = useState<string>("");
  const [actProofFileName, setActProofFileName] = useState<string>("");
  const [actProofFileType, setActProofFileType] = useState<string>("");
  const actProofInputRef = useRef<HTMLInputElement | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // 変動費と日用品のデフォルトIDを取得
  const getDefaultVariableAndDailyGoods = (
    catList: BudgetCategory[],
    typeList: BudgetType[]
  ): { categoryId: string; typeId: string } => {
    const variableCat = catList.find(c => c.id === "variable" || c.name.includes("変動費")) || catList[0];
    const categoryId = variableCat ? variableCat.id : "";
    const catTypes = typeList.filter(t => t.categoryId === categoryId);
    const dailyGoods = catTypes.find(t => t.name.includes("日用品")) || catTypes[0];
    const typeId = dailyGoods ? dailyGoods.id : "";
    return { categoryId, typeId };
  };

  // 年月・日時の初期設定
  const getInitialDate = (y: number, m: number): string => {
    const now = new Date();
    if (now.getFullYear() === y && now.getMonth() + 1 === m) {
      const pad = (n: number) => String(n).padStart(2, "0");
      return `${y}-${pad(m)}-${pad(now.getDate())}`;
    }
    return `${y}-${String(m).padStart(2, "0")}-01`;
  };

  // モーダルを開いたときの初期化
  useEffect(() => {
    if (!isOpen) return;

    // マスタデータの読み込み
    const initMaster = async () => {
      try {
        const master = await getBudgetMasterData();
        setCategories(master.categories);
        setTypes(master.types);

        const { categoryId, typeId } = getDefaultVariableAndDailyGoods(master.categories, master.types);
        setActCategory(categoryId);
        setActType(typeId);
      } catch (err) {
        console.error("Failed to load budget master data:", err);
      }
    };

    initMaster();

    // フォーム初期化
    setActDate(getInitialDate(year, month));
    setActTargetUid(currentUserId);
    setActName("");
    setActAmount("");
    setActMemo("");
    setActSplitMode("equal");
    setActMyRatio(50);
    setActPartnerRatio(50);
    setActProofUrl("");
    setActProofFileName("");
    setActProofFileType("");
  }, [isOpen, year, month, currentUserId, coupleKey]);

  // 区分変更時に種別を自動セット
  useEffect(() => {
    if (actCategory && types.length > 0) {
      const filtered = types.filter(t => t.categoryId === actCategory);
      if (filtered.length > 0) {
        if (!filtered.some(t => t.id === actType)) {
          const isVariable =
            actCategory === "variable" ||
            categories.find(c => c.id === actCategory)?.name.includes("変動費");
          const target = isVariable
            ? filtered.find(t => t.name.includes("日用品")) || filtered[0]
            : filtered[0];
          setActType(target.id);
        }
      } else {
        setActType("");
      }
    }
  }, [actCategory, types, categories, actType]);

  if (!isOpen) return null;

  // エビデンスファイル選択
  const handleProofFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !coupleKey) return;

    try {
      showSpinner();
      const tempId = generateActualBudgetId();
      const res = await uploadActualBudgetProof(coupleKey, tempId, file);
      setActProofUrl(res.proofUrl);
      setActProofFileName(res.proofFileName);
      setActProofFileType(res.proofFileType);
    } catch (err) {
      console.error(err);
      errorLog("実際収支エビデンスアップロード", err);
      showDialog("ファイルの添付中に問題が発生しました。再度お試しください。");
    } finally {
      hideSpinner();
      if (actProofInputRef.current) {
        actProofInputRef.current.value = "";
      }
    }
  };

  // エビデンスファイル解除
  const handleRemoveProofFile = async () => {
    if (actProofUrl) {
      try {
        await removeActualBudgetProofFile(actProofUrl);
      } catch (err) {
        console.warn("Storage deletion error:", err);
      }
    }
    setActProofUrl("");
    setActProofFileName("");
    setActProofFileType("");
  };

  // 保存処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!coupleKey || !actTargetUid || !actCategory || !actType || !actName.trim() || actAmount === "" || !actDate) {
      showDialog("入力内容をご確認ください（必須項目が入力されているか等）。");
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
          showDialog("負担割合の合計が100%になるよう設定してください。");
          return;
        }
        splitRatio = actTargetUid === currentUserId ? myRatio : partnerRatio;
      }
    }

    try {
      setIsSubmitting(true);
      showSpinner();

      // 日付から対象の年月を取得（入力された日付基準）
      const [dateY, dateM] = actDate.split("-").map(Number);
      const targetYear = dateY || year;
      const targetMonth = dateM || month;

      const newId = generateActualBudgetId();
      const payload = {
        id: newId,
        coupleKey,
        uid: actTargetUid,
        year: targetYear,
        month: targetMonth,
        date: actDate,
        category: actCategory,
        type: actType,
        name: actName.trim(),
        amount: Number(actAmount),
        memo: actMemo.trim(),
        splitRatio,
        proofUrl: actProofUrl || undefined,
        proofFileName: actProofFileName || undefined,
        proofFileType: actProofFileType || undefined,
      };

      await saveActualBudget(payload);
      const savedItem: ActualBudget = {
        ...payload,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      onClose();
      onSuccess?.(savedItem);
    } catch (err) {
      console.error(err);
      errorLog("実際収支保存", err);
      showDialog("保存の処理中に問題が発生しました。もう一度お試しください。");
    } finally {
      setIsSubmitting(false);
      hideSpinner();
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.formModal} onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            <i className={`fa-solid fa-pen-to-square ${styles.modalTitleIcon}`}></i>
            実際の収支を登録
            <span className={styles.monthBadge}>
              {year}年{month}月
            </span>
          </h2>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="閉じる">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className={styles.formModalForm}>
          <div className={styles.formModalBody}>
            <div className={styles.formGrid}>
              {/* 人（対象者） */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>人</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="actTargetUid"
                      value={currentUserId}
                      checked={actTargetUid === currentUserId}
                      onChange={() => setActTargetUid(currentUserId)}
                    />
                    {myNickname}
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
                      {partnerNickname}
                    </label>
                  )}
                </div>
              </div>

              {/* 日付 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  日付 <span className={styles.requiredBadge}>必須</span>
                </label>
                <input
                  type="date"
                  className={styles.appInput}
                  value={actDate}
                  onChange={(e) => setActDate(e.target.value)}
                  required
                />
              </div>

              {/* 区分 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>区分</label>
                <select
                  className={styles.appSelect}
                  value={actCategory}
                  onChange={(e) => setActCategory(e.target.value)}
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
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
                  {types
                    .filter((t) => t.categoryId === actCategory)
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>

              {/* 項目名 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  名前 <span className={styles.requiredBadge}>必須</span>
                </label>
                <input
                  type="text"
                  className={styles.appInput}
                  placeholder="例: 食費、日用品、外食代 など"
                  value={actName}
                  onChange={(e) => setActName(e.target.value)}
                  required
                />
              </div>

              {/* 金額 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>
                  金額 (円) <span className={styles.requiredBadge}>必須</span>
                </label>
                <input
                  type="number"
                  className={styles.appInput}
                  placeholder="例: 3500"
                  value={actAmount}
                  onChange={(e) => setActAmount(e.target.value !== "" ? Number(e.target.value) : "")}
                  required
                />
              </div>

              {/* 備考 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>備考（任意）</label>
                <input
                  type="text"
                  className={styles.appInput}
                  placeholder="例: スーパーで購入、ポイント利用 など"
                  value={actMemo}
                  onChange={(e) => setActMemo(e.target.value)}
                />
              </div>

              {/* エビデンス添付 */}
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>エビデンス (領収書・レシート等)</label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  ref={actProofInputRef}
                  style={{ display: "none" }}
                  onChange={handleProofFileSelect}
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
                        onClick={handleRemoveProofFile}
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

              {/* 負担設定（支出の場合のみ） */}
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
                        <span>{myNickname}:</span>
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
                        <span>{partnerNickname}:</span>
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

          {/* フッターアクション */}
          <div className={styles.modalActions}>
            <button
              type="button"
              className={styles.cancelBtn}
              onClick={onClose}
              disabled={isSubmitting}
            >
              キャンセル
            </button>
            <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
              <i className="fa-solid fa-check"></i>
              {isSubmitting ? "保存中..." : "収支を登録する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
