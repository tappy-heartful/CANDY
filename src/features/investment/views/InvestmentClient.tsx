"use client";

import { useEffect, useState, useMemo } from "react";
import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getInvestmentSimulation, saveInvestmentSimulation } from "../api/investment-client-service";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { User, InvestmentSimulation } from "@/src/lib/firestore/types";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import styles from "./Investment.module.css";

// 資産額を「〇億〇万〇千円」の日本語フォーマットに変換する（億の位を追加、千円未満切り捨て）
function formatSosan(val: number): string {
  const oku = Math.floor(val / 100000000);
  const restOku = val % 100000000;
  const man = Math.floor(restOku / 10000);
  const sen = Math.floor((restOku % 10000) / 1000);

  if (oku > 0) {
    const manStr = man.toLocaleString("ja-JP");
    return `${oku}億${manStr}万${sen}千円`;
  } else {
    const manStr = man.toLocaleString("ja-JP");
    return `${manStr}万${sen}千円`;
  }
}

// Y軸ラベル用フォーマット
function formatYAxisLabel(val: number): string {
  if (val >= 100000000) {
    return `${(val / 100000000).toFixed(1).replace(/\.0$/, "")}億円`;
  }
  if (val >= 10000) {
    return `${(val / 10000).toFixed(0)}万円`;
  }
  return `${val}円`;
}

interface SimulationRow {
  age: number;
  year: number;
  investment: number;
  cumulativeInvestment: number;
  formattedCumulative: string;
}

export default function InvestmentClient() {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();

  // パンくずリストの設定
  useEffect(() => {
    setBreadcrumbs([{ title: "投資シミュレーション" }]);
  }, [setBreadcrumbs]);

  // デフォルトの初期値（スプレッドシート画像再現用）
  const defaultInvestments: { [age: string]: number } = {
    "26": 3600000,
    "27": 3600000,
    "28": 3600000,
    "29": 1000000,
    "30": 1000000,
    "31": 1000000,
    "32": 1000000,
    "33": 1000000,
    "34": 1000000,
    "35": 1000000,
  };

  // 36歳〜100歳まではデフォルト 0円
  for (let age = 36; age <= 100; age++) {
    defaultInvestments[String(age)] = 0;
  }

  // ステート定義
  const [annualRate, setAnnualRate] = useState<number | "">(10);
  const [startAge, setStartAge] = useState<number | "">(26);
  const [startYear, setStartYear] = useState<number | "">(2024);
  const [endYear, setEndYear] = useState<number | "">(2078);
  const [endAge, setEndAge] = useState<number | "">(80);
  const [investments, setInvestments] = useState<{ [age: string]: number | "" }>(defaultInvestments);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // パートナー関連ステート
  const [partnerData, setPartnerData] = useState<User | null>(null);
  const [partnerSimulation, setPartnerSimulation] = useState<InvestmentSimulation | null>(null);
  const [activeTab, setActiveTab] = useState<"me" | "partner">("me");

  // 終了西暦の自動計算
  useEffect(() => {
    const sAge = startAge === "" ? 26 : startAge;
    const sYear = startYear === "" ? 2024 : startYear;
    const eAge = endAge === "" ? 80 : endAge;
    setEndYear(sYear + (eAge - sAge));
  }, [startAge, startYear, endAge]);

  // グラフツールチップ用ステート
  const [hoveredPoint, setHoveredPoint] = useState<{
    age: number;
    year: number;
    val: number;
    x: number;
    y: number;
  } | null>(null);

  // Firestoreデータのロード
  useEffect(() => {
    if (!user) return;
    showSpinner();
    getInvestmentSimulation(user.uid)
      .then((data) => {
        if (data) {
          setAnnualRate(data.annualRate ?? 10);
          setStartAge(data.startAge ?? 26);
          setStartYear(data.startYear ?? 2024);
          setEndYear(data.endYear ?? 2078);
          setEndAge(data.endAge ?? 80);

          // investmentsのロード。欠落している年齢があれば0で補完
          const loadedInvests = { ...data.investments };
          for (let age = 18; age <= 100; age++) {
            if (loadedInvests[String(age)] === undefined) {
              loadedInvests[String(age)] = defaultInvestments[String(age)] ?? 0;
            }
          }
          setInvestments(loadedInvests);
        }
      })
      .catch((e) => {
        console.error("Failed to load simulation settings:", e);
      })
      .finally(() => {
        hideSpinner();
      });
  }, [user]);

  // パートナー情報のロード
  useEffect(() => {
    if (!user) return;
    getPartnerData(user.uid)
      .then((partner) => {
        if (partner) {
          setPartnerData(partner);
          getInvestmentSimulation(partner.id)
            .then((sim) => {
              if (sim) {
                setPartnerSimulation(sim);
              }
            })
            .catch((err) => {
              console.error("Failed to load partner simulation:", err);
            });
        }
      })
      .catch((err) => {
        console.error("Failed to load partner data:", err);
      });
  }, [user]);

  // 現在アクティブなシミュレーション設定パラメータ (タブによって切り替える)
  const activeParams = useMemo(() => {
    if (activeTab === "partner" && partnerSimulation) {
      return {
        annualRate: partnerSimulation.annualRate ?? 10,
        startAge: partnerSimulation.startAge ?? 26,
        startYear: partnerSimulation.startYear ?? 2024,
        endAge: partnerSimulation.endAge ?? 80,
        endYear: partnerSimulation.endYear ?? (partnerSimulation.startYear + (partnerSimulation.endAge - partnerSimulation.startAge)),
        investments: partnerSimulation.investments ?? {},
      };
    }
    return {
      annualRate,
      startAge,
      startYear,
      endAge,
      endYear,
      investments,
    };
  }, [activeTab, partnerSimulation, annualRate, startAge, startYear, endAge, endYear, investments]);

  // シミュレーション計算
  const simulationRows = useMemo<SimulationRow[]>(() => {
    const rows: SimulationRow[] = [];
    let currentCumulative = 0;

    const sAge = activeParams.startAge === "" ? 26 : activeParams.startAge;
    const sYear = activeParams.startYear === "" ? 2024 : activeParams.startYear;
    const eAge = activeParams.endAge === "" ? 80 : activeParams.endAge;
    const aRate = activeParams.annualRate === "" ? 0 : activeParams.annualRate;

    if (eAge < sAge) return [];

    for (let age = sAge; age <= eAge; age++) {
      const year = sYear + (age - sAge);
      const investmentRaw = activeParams.investments[String(age)];
      const investment = investmentRaw === "" || investmentRaw === undefined ? 0 : investmentRaw;

      // 計算式: 当年累積 = 前年累積 * (1 + 年利) + 当年投資額
      const rateFactor = 1 + (aRate / 100);
      currentCumulative = currentCumulative * rateFactor + investment;

      const roundedCumulative = Math.round(currentCumulative);

      rows.push({
        age,
        year,
        investment,
        cumulativeInvestment: roundedCumulative,
        formattedCumulative: formatSosan(roundedCumulative),
      });
    }
    return rows;
  }, [activeParams]);

  // 総投資額の算出
  const totalInvestment = useMemo(() => {
    return simulationRows.reduce((sum, r) => sum + r.investment, 0);
  }, [simulationRows]);

  // データ保存処理
  const handleSaveSettings = async () => {
    if (!user) return;
    setIsSaving(true);
    showSpinner();
    try {
      const cleanAnnualRate = annualRate === "" ? 10 : annualRate;
      const cleanStartAge = startAge === "" ? 26 : startAge;
      const cleanStartYear = startYear === "" ? 2024 : startYear;
      const cleanEndAge = endAge === "" ? 80 : endAge;
      const cleanEndYear = endYear === "" ? 2078 : endYear;

      const cleanInvestments: { [age: string]: number } = {};
      Object.keys(investments).forEach((key) => {
        const val = investments[key];
        cleanInvestments[key] = val === "" || val === undefined ? 0 : val;
      });

      await saveInvestmentSimulation(user.uid, {
        annualRate: cleanAnnualRate,
        startAge: cleanStartAge,
        startYear: cleanStartYear,
        endAge: cleanEndAge,
        endYear: cleanEndYear,
        investments: cleanInvestments,
      });

      // Synchronize back with cleaned numeric values
      setAnnualRate(cleanAnnualRate);
      setStartAge(cleanStartAge);
      setStartYear(cleanStartYear);
      setEndAge(cleanEndAge);
      setEndYear(cleanEndYear);
      setInvestments(cleanInvestments);

      showDialog("シミュレーション設定を保存しました！🍬", true);
    } catch (e) {
      console.error(e);
      showDialog("保存に失敗しました", true);
    } finally {
      setIsSaving(false);
      hideSpinner();
    }
  };

  // 年齢別の投資額変更
  const handleInvestmentChange = (age: number, valStr: string) => {
    if (valStr === "") {
      setInvestments((prev) => ({
        ...prev,
        [String(age)]: "",
      }));
      return;
    }
    const valNum = parseInt(valStr, 10);
    const safeValue = Math.max(0, isNaN(valNum) ? 0 : valNum);
    setInvestments((prev) => ({
      ...prev,
      [String(age)]: safeValue,
    }));
  };



  // SVGグラフ描画用のパラメータ計算
  const svgW = 600;
  const svgH = 300;
  const paddingLeft = 70;
  const paddingRight = 20;
  const paddingTop = 30;
  const paddingBottom = 40;

  const chartW = svgW - paddingLeft - paddingRight;
  const chartH = svgH - paddingTop - paddingBottom;

  const maxAsset = useMemo(() => {
    const maxVal = Math.max(...simulationRows.map((r) => r.cumulativeInvestment), 1);
    // キリのいい数値に切り上げる (最大値の1.1倍を基準にするなど)
    return Math.ceil(maxVal * 1.1);
  }, [simulationRows]);

  const points = useMemo(() => {
    const N = simulationRows.length;
    if (N < 2) return [];

    return simulationRows.map((row, i) => {
      const x = paddingLeft + (i / (N - 1)) * chartW;
      const y = (paddingTop + chartH) - (row.cumulativeInvestment / maxAsset) * chartH;
      return { x, y, row };
    });
  }, [simulationRows, chartW, chartH, maxAsset]);

  // 折れ線と塗りつぶしパスの生成
  const linePathD = useMemo(() => {
    if (points.length === 0) return "";
    return `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  }, [points]);

  const areaPathD = useMemo(() => {
    if (points.length === 0) return "";
    const startX = points[0].x;
    const endX = points[points.length - 1].x;
    const baseY = paddingTop + chartH;
    return `${linePathD} L ${endX},${baseY} L ${startX},${baseY} Z`;
  }, [points, linePathD, chartH]);

  // グリッド線（Y軸3本、X軸は10歳刻み）
  const yGridValues = [0, maxAsset * 0.25, maxAsset * 0.5, maxAsset * 0.75, maxAsset];
  const xGridPoints = useMemo(() => {
    const res: { x: number; label: string }[] = [];
    const sAge = activeParams.startAge === "" ? 26 : activeParams.startAge;
    const eAge = activeParams.endAge === "" ? 80 : activeParams.endAge;

    points.forEach((p) => {
      if (p.row.age % 10 === 0 || p.row.age === sAge || p.row.age === eAge) {
        // 重複防止
        if (!res.some((r) => Math.abs(r.x - p.x) < 25)) {
          res.push({ x: p.x, label: `${p.row.age}歳` });
        }
      }
    });
    return res;
  }, [points, activeParams.startAge, activeParams.endAge]);

  return (
    <AuthGuard>
      <div className={styles.container}>
        <h1 className={styles.title}>
          <i className="fa-solid fa-chart-line"></i> 投資シミュレーション
        </h1>

        {/* タブ切り替えUI */}
        {partnerData && (
          <div className={styles.tabsContainer}>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "me" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("me")}
            >
              <i className="fa-solid fa-user"></i> {userData?.nickname || userData?.displayName || "自分"}のシミュレーション 🍬
            </button>
            <button
              type="button"
              className={`${styles.tabBtn} ${activeTab === "partner" ? styles.activeTab : ""}`}
              onClick={() => setActiveTab("partner")}
            >
              <i className="fa-solid fa-heart"></i> {partnerData.nickname || "パートナー"}のシミュレーション 🍭
            </button>
          </div>
        )}

        {activeTab === "partner" && !partnerSimulation ? (
          <div className={styles.emptyCard}>
            <div className={styles.emptyIcon}>
              <i className="fa-solid fa-piggy-bank"></i>
            </div>
            <div className={styles.emptyTitle}>
              {partnerData?.nickname || "パートナー"}はまだ投資シミュレーションを登録していません
            </div>
            <div className={styles.emptyText}>
              シミュレーション基本設定を保存すると、ここに表示されるようになります。🍬
            </div>
          </div>
        ) : (
          <>
            {/* 1. 基本設定カード */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <i className="fa-solid fa-sliders"></i> シミュレーション基本設定 {activeTab === "partner" && "(参照のみ)"}
              </div>
              <div className={styles.formGrid}>
                {/* 開始設定グループ */}
                <div className={`${styles.formSection} ${styles.sectionStart}`}>
                  <div className={styles.formSectionTitle}>
                    <i className="fa-solid fa-play"></i> シミュレーション開始設定
                  </div>
                  <div className={styles.inputPairGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="sim-start-age">
                        開始年齢 (歳)
                      </label>
                      <input
                        type="number"
                        id="sim-start-age"
                        className={styles.input}
                        value={activeTab === "me" ? startAge : (partnerSimulation?.startAge ?? "")}
                        min={18}
                        max={75}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartAge(val === "" ? "" : parseInt(val, 10));
                        }}
                        disabled={activeTab === "partner"}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="sim-start-year">
                        開始西暦 (年)
                      </label>
                      <input
                        type="number"
                        id="sim-start-year"
                        className={styles.input}
                        value={activeTab === "me" ? startYear : (partnerSimulation?.startYear ?? "")}
                        min={1990}
                        max={2100}
                        onChange={(e) => {
                          const val = e.target.value;
                          setStartYear(val === "" ? "" : parseInt(val, 10));
                        }}
                        disabled={activeTab === "partner"}
                      />
                    </div>
                  </div>
                </div>

                {/* 終了設定グループ */}
                <div className={`${styles.formSection} ${styles.sectionEnd}`}>
                  <div className={styles.formSectionTitle}>
                    <i className="fa-solid fa-flag-checkered"></i> シミュレーション終了設定
                  </div>
                  <div className={styles.inputPairGrid}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="sim-end-age">
                        終了年齢 (歳)
                      </label>
                      <input
                        type="number"
                        id="sim-end-age"
                        className={styles.input}
                        value={activeTab === "me" ? endAge : (partnerSimulation?.endAge ?? "")}
                        min={activeTab === "me" ? (startAge === "" ? 18 : startAge) : (partnerSimulation?.startAge ?? 18)}
                        max={100}
                        onChange={(e) => {
                          const val = e.target.value;
                          setEndAge(val === "" ? "" : parseInt(val, 10));
                        }}
                        disabled={activeTab === "partner"}
                      />
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label} htmlFor="sim-end-year">
                        終了西暦 (年 - 自動計算)
                      </label>
                      <input
                        type="number"
                        id="sim-end-year"
                        className={`${styles.input} ${styles.inputDisabled}`}
                        value={activeTab === "me" ? endYear : (partnerSimulation?.endYear ?? "")}
                        disabled
                        readOnly
                      />
                    </div>
                  </div>
                </div>

                {/* 運用設定グループ */}
                <div className={`${styles.formSection} ${styles.sectionRate}`}>
                  <div className={styles.formSectionTitle}>
                    <i className="fa-solid fa-percent"></i> 運用設定
                  </div>
                  <div className={styles.inputGroup}>
                    <label className={styles.label} htmlFor="sim-annual-rate">
                      想定年利 (%)
                    </label>
                    <input
                      type="number"
                      id="sim-annual-rate"
                      className={styles.input}
                      value={activeTab === "me" ? annualRate : (partnerSimulation?.annualRate ?? "")}
                      min={0}
                      max={50}
                      step={0.1}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnnualRate(val === "" ? "" : parseFloat(val));
                      }}
                      disabled={activeTab === "partner"}
                    />
                  </div>
                </div>
              </div>

              {activeTab === "me" && (
                <div style={{ marginTop: "20px", display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    className={styles.btn}
                    onClick={handleSaveSettings}
                    disabled={isSaving}
                  >
                    <i className="fa-solid fa-floppy-disk"></i> 設定をクラウドに保存する
                  </button>
                </div>
              )}
            </div>

            {/* 2. 年齢別テーブルカード */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <i className="fa-solid fa-table-list"></i> 年齢別投資計画とシミュレーション結果
              </div>

              {/* 総投資額の表示バッジ */}
              <div className={styles.summaryBadge}>
                <i className="fa-solid fa-piggy-bank"></i>
                総投資額:{" "}
                <span className={styles.summaryValue}>
                  {totalInvestment.toLocaleString()}円
                </span>
                <span className={styles.summaryText}>
                  ({formatSosan(totalInvestment)})
                </span>
              </div>

              <div className={styles.tableContainer}>
                <table className={styles.table}>
                  <thead className={styles.thead}>
                    <tr>
                      <th className={styles.th}>年齢</th>
                      <th className={styles.th}>西暦</th>
                      <th className={styles.th}>年間投資額</th>
                      <th className={styles.th}>総資産額</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationRows.map((row) => (
                      <tr key={row.age} className={styles.tr}>
                        <td className={`${styles.td} ${styles.tdAge}`}>{row.age}</td>
                        <td className={`${styles.td} ${styles.tdYear}`}>{row.year}</td>
                        <td className={styles.td}>
                          <div className={styles.inputCell}>
                            <input
                              type="number"
                              className={styles.ageInvestInput}
                              value={activeTab === "me" ? (investments[String(row.age)] ?? "") : (partnerSimulation?.investments[String(row.age)] ?? 0)}
                              step={100000}
                              min={0}
                              onChange={(e) =>
                                handleInvestmentChange(row.age, e.target.value)
                              }
                              disabled={activeTab === "partner"}
                              aria-label={`${row.age}歳の年間投資額`}
                            />
                          </div>
                        </td>
                        <td className={`${styles.td} ${styles.tdResult}`}>
                          <div className={styles.tdSosan}>{row.formattedCumulative}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. グラフ表示カード */}
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <i className="fa-solid fa-chart-area"></i> 総資産シミュレーション
              </div>

              <div className={styles.chartWrapper}>
                {hoveredPoint && (
                  <div
                    className={styles.tooltip}
                    style={{
                      left: `${(hoveredPoint.x / svgW) * 100}%`,
                      top: `${(hoveredPoint.y / svgH) * 100}%`,
                    }}
                  >
                    <div className={styles.tooltipTitle}>
                      {hoveredPoint.age}歳 ({hoveredPoint.year}年)
                    </div>
                    <div>総資産: {formatSosan(hoveredPoint.val)}</div>
                    <div>年間投資額: {((activeParams.investments)[String(hoveredPoint.age)] || 0).toLocaleString()}円</div>
                  </div>
                )}

                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className={styles.chartSvg}
                  onMouseLeave={() => setHoveredPoint(null)}
                  onTouchEnd={() => setHoveredPoint(null)}
                >
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F7A8C4" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#9B7CC3" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Y軸グリッド線とラベル */}
                  {yGridValues.map((val, idx) => {
                    const y = (paddingTop + chartH) - (val / maxAsset) * chartH;
                    return (
                      <g key={`y-grid-${idx}`}>
                        <line
                          x1={paddingLeft}
                          y1={y}
                          x2={svgW - paddingRight}
                          y2={y}
                          className={styles.gridLine}
                        />
                        <text
                          x={paddingLeft - 8}
                          y={y + 4}
                          textAnchor="end"
                          className={styles.axisText}
                        >
                          {formatYAxisLabel(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* X軸グリッド線とラベル */}
                  {xGridPoints.map((gp, idx) => (
                    <g key={`x-grid-${idx}`}>
                      <line
                        x1={gp.x}
                        y1={paddingTop}
                        x2={gp.x}
                        y2={paddingTop + chartH}
                        className={styles.gridLine}
                      />
                      <text
                        x={gp.x}
                        y={paddingTop + chartH + 16}
                        textAnchor="middle"
                        className={styles.axisText}
                      >
                        {gp.label}
                      </text>
                    </g>
                  ))}

                  {/* グラフの塗りつぶし領域 */}
                  {areaPathD && <path d={areaPathD} className={styles.chartArea} />}

                  {/* グラフの線 */}
                  {linePathD && <path d={linePathD} className={styles.chartPath} />}

                  {/* プロット点（インタラクティブ用） */}
                  {points.map((p, idx) => {
                    const isHovered = hoveredPoint?.age === p.row.age;
                    return (
                      <circle
                        key={`point-${idx}`}
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 6 : 4}
                        className={styles.chartPoint}
                        style={{
                          fill: isHovered ? "#9B7CC3" : "#fff",
                          stroke: isHovered ? "#F7A8C4" : "#9B7CC3",
                        }}
                        onMouseEnter={() =>
                          setHoveredPoint({
                            age: p.row.age,
                            year: p.row.year,
                            val: p.row.cumulativeInvestment,
                            x: p.x,
                            y: p.y,
                          })
                        }
                        onTouchStart={() =>
                          setHoveredPoint({
                            age: p.row.age,
                            year: p.row.year,
                            val: p.row.cumulativeInvestment,
                            x: p.x,
                            y: p.y,
                          })
                        }
                      />
                    );
                  })}

                  {/* 軸線 */}
                  <line
                    x1={paddingLeft}
                    y1={paddingTop}
                    x2={paddingLeft}
                    y2={paddingTop + chartH}
                    className={styles.axisLine}
                  />
                  <line
                    x1={paddingLeft}
                    y1={paddingTop + chartH}
                    x2={svgW - paddingRight}
                    y2={paddingTop + chartH}
                    className={styles.axisLine}
                  />
                </svg>
              </div>
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );

}
