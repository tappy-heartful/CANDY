"use client";

import React, { useState, useMemo } from "react";
import { BudgetCategory, BudgetType, ActualBudget, User as FirestoreUser } from "@/src/lib/firestore/types";
import styles from "./BudgetAnalysis.module.css";

interface BudgetAnalysisProps {
  actualBudgets: ActualBudget[];
  categories: BudgetCategory[];
  types: BudgetType[];
  user: FirestoreUser | null;
  partnerUser: FirestoreUser | null;
  year: number;
  month: number;
}

const COLORS = [
  "#9b7cc3", // プライマリ・パープル
  "#ff8a80", // コーラルピンク
  "#5c6bc0", // ロイヤルインディゴ
  "#26a69a", // ミントティール
  "#ffa726", // ウォームオレンジ
  "#b0bec5"  // クールグレー (その他用)
];

export default function BudgetAnalysis({
  actualBudgets,
  categories,
  types,
  user,
  partnerUser,
  year,
  month
}: BudgetAnalysisProps) {
  // ホバー中の円グラフセグメントID
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);

  const myName = user?.nickname || "自分";
  const partnerName = partnerUser?.nickname || "パートナー";

  // 1. 支出データの抽出と総額の算出
  const expenses = useMemo(() => {
    return actualBudgets.filter(item => item.category !== "income");
  }, [actualBudgets]);

  const totalExpense = useMemo(() => {
    return expenses.reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [expenses]);

  // 2. 種別（項目）ごとの集計およびソート
  const chartData = useMemo(() => {
    if (totalExpense === 0) return [];

    const typeMap: { [typeId: string]: number } = {};
    expenses.forEach(item => {
      typeMap[item.type] = (typeMap[item.type] || 0) + (item.amount || 0);
    });

    let data = Object.entries(typeMap).map(([typeId, amount]) => {
      const typeName = types.find(t => t.id === typeId)?.name || typeId;
      return {
        id: typeId,
        name: typeName,
        amount,
        percentage: (amount / totalExpense) * 100
      };
    }).sort((a, b) => b.amount - a.amount);

    // 項目が5つより多い場合は、6位以下を「その他」にまとめる
    if (data.length > 5) {
      const top5 = data.slice(0, 5);
      const othersAmount = data.slice(5).reduce((sum, item) => sum + item.amount, 0);
      data = [
        ...top5,
        {
          id: "others",
          name: "その他支出",
          amount: othersAmount,
          percentage: (othersAmount / totalExpense) * 100
        }
      ];
    }

    return data;
  }, [expenses, types, totalExpense]);

  // 3. SVGドーナツグラフの描画に必要な円周等の計算
  const circleRadius = 50;
  const circleCircumference = 2 * Math.PI * circleRadius; // 約 314.159

  const doughnutSegments = useMemo(() => {
    let accumulatedLength = 0;
    return chartData.map((item, index) => {
      const strokeLength = circleCircumference * (item.percentage / 100);
      const offset = accumulatedLength;
      accumulatedLength += strokeLength;

      return {
        ...item,
        strokeLength,
        offset,
        color: COLORS[index % COLORS.length]
      };
    });
  }, [chartData, circleCircumference]);

  // 4. 固定費・変動費のバランス計算
  const fixedTotal = useMemo(() => {
    return expenses.filter(item => item.category === "fixed").reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [expenses]);

  const variableTotal = useMemo(() => {
    return expenses.filter(item => item.category === "variable").reduce((sum, item) => sum + (item.amount || 0), 0);
  }, [expenses]);

  const fixedRatio = totalExpense > 0 ? (fixedTotal / totalExpense) * 100 : 0;
  const variableRatio = totalExpense > 0 ? (variableTotal / totalExpense) * 100 : 0;

  // 5. 二人の実質負担額（負担設定に基づく）の比較
  const burdenStats = useMemo(() => {
    if (!user) return null;
    
    let myBurden = 0;
    let partnerBurden = 0;

    expenses.forEach(item => {
      const amount = item.amount || 0;
      const ratio = item.splitRatio !== undefined ? item.splitRatio : 50;

      if (item.uid === user.uid) {
        myBurden += amount * (ratio / 100);
        partnerBurden += amount * ((100 - ratio) / 100);
      } else {
        partnerBurden += amount * (ratio / 100);
        myBurden += amount * ((100 - ratio) / 100);
      }
    });

    const totalBurden = myBurden + partnerBurden;
    
    return {
      myBurden,
      partnerBurden,
      myBurdenRatio: totalBurden > 0 ? (myBurden / totalBurden) * 100 : 0,
      partnerBurdenRatio: totalBurden > 0 ? (partnerBurden / totalBurden) * 100 : 0
    };
  }, [expenses, user]);

  const formatCurrency = (amount: number) => {
    return `¥${amount.toLocaleString()}`;
  };

  if (totalExpense === 0) {
    return (
      <div className={styles.analysisCard}>
        <div className={styles.analysisTitle}>
          <i className="fa-solid fa-chart-pie"></i> 今月の家計分析
        </div>
        <p className={styles.emptyNotice}>支出データが登録されると、自動的に今月の家計分析（円グラフや診断など）がこちらに表示されます。🌱</p>
      </div>
    );
  }

  // 中央に表示する現在選択中のセグメント情報（なければ総合支出）
  const centerDisplay = activeSegmentIndex !== null ? doughnutSegments[activeSegmentIndex] : null;

  return (
    <div className={styles.analysisCard}>
      <div className={styles.analysisTitle}>
        <i className="fa-solid fa-chart-pie"></i> {year}年{month}月の家計分析
      </div>

      <div className={styles.analysisGrid}>
        {/* 円グラフエリア */}
        <div className={styles.chartSection}>
          <div className={styles.donutWrapper}>
            <svg width="100%" height="100%" viewBox="0 0 120 120" className={styles.donutSvg}>
              {/* 背景の薄い円 */}
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="transparent"
                stroke="#f3f3f3"
                strokeWidth="10"
              />
              {/* 各セグメントの描画 */}
              {doughnutSegments.map((segment, idx) => (
                <circle
                  key={segment.id}
                  cx="60"
                  cy="60"
                  r="50"
                  fill="transparent"
                  stroke={segment.color}
                  strokeWidth={activeSegmentIndex === idx ? "12" : "10"}
                  strokeDasharray={`${segment.strokeLength} ${circleCircumference - segment.strokeLength}`}
                  strokeDashoffset={-segment.offset}
                  transform="rotate(-90 60 60)"
                  className={styles.donutSegment}
                  onMouseEnter={() => setActiveSegmentIndex(idx)}
                  onMouseLeave={() => setActiveSegmentIndex(null)}
                  style={{
                    cursor: "pointer",
                    transition: "stroke-width 0.2s, stroke 0.2s"
                  }}
                />
              ))}
            </svg>
            
            {/* グラフの中心のテキスト表示 */}
            <div className={styles.donutCenter}>
              {centerDisplay ? (
                <>
                  <span className={styles.centerLabel} style={{ color: centerDisplay.color }}>
                    {centerDisplay.name}
                  </span>
                  <span className={styles.centerValue}>{formatCurrency(centerDisplay.amount)}</span>
                  <span className={styles.centerPercentage}>{centerDisplay.percentage.toFixed(1)}%</span>
                </>
              ) : (
                <>
                  <span className={styles.centerLabel}>総支出額</span>
                  <span className={styles.centerValue}>{formatCurrency(totalExpense)}</span>
                  <span className={styles.centerPercentage}>100%</span>
                </>
              )}
            </div>
          </div>

          {/* 凡例リスト */}
          <div className={styles.legendContainer}>
            {doughnutSegments.map((segment, idx) => (
              <div
                key={segment.id}
                className={`${styles.legendItem} ${activeSegmentIndex === idx ? styles.legendItemActive : ""}`}
                onMouseEnter={() => setActiveSegmentIndex(idx)}
                onMouseLeave={() => setActiveSegmentIndex(null)}
              >
                <div className={styles.legendLeft}>
                  <span className={styles.colorIndicator} style={{ backgroundColor: segment.color }} />
                  <span className={styles.legendName}>{segment.name}</span>
                </div>
                <div className={styles.legendRight}>
                  <span className={styles.legendAmount}>{formatCurrency(segment.amount)}</span>
                  <span className={segment.percentage.toFixed(1) === "0.0" ? styles.legendPercentZero : styles.legendPercent}>
                    {segment.percentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右側のお役立ち分析エリア */}
        <div className={styles.insightsSection}>
          
          {/* 1. 固定費・変動費のバランス */}
          <div className={styles.insightBlock}>
            <div className={styles.blockTitle}>
              <i className="fa-solid fa-scale-balanced"></i> 固定費・変動費のバランス
            </div>
            <div className={styles.balanceGrid}>
              <div className={styles.balanceItem}>
                <span className={styles.balanceLabel}>固定費 (家賃・光熱費等)</span>
                <span className={styles.balanceValue}>{formatCurrency(fixedTotal)} ({fixedRatio.toFixed(0)}%)</span>
              </div>
              <div className={styles.balanceItem}>
                <span className={styles.balanceLabel}>変動費 (生活費・娯楽等)</span>
                <span className={styles.balanceValue}>{formatCurrency(variableTotal)} ({variableRatio.toFixed(0)}%)</span>
              </div>
            </div>
            {totalExpense > 0 && (
              <div className={styles.stackedBar}>
                <div 
                  className={styles.stackedFixed} 
                  style={{ width: `${fixedRatio}%` }}
                  title={`固定費: ${fixedRatio.toFixed(0)}%`}
                />
                <div 
                  className={styles.stackedVariable} 
                  style={{ width: `${variableRatio}%` }}
                  title={`変動費: ${variableRatio.toFixed(0)}%`}
                />
              </div>
            )}
            <p className={styles.balanceTip}>
              一般的に固定費を抑え、変動費を柔軟にコントロールすることが、安定した貯蓄ペースを保つポイントです。💡
            </p>
          </div>

          {/* 2. 二人の実質負担額の比較 */}
          {burdenStats && (
            <div className={styles.insightBlock}>
              <div className={styles.blockTitle}>
                <i className="fa-solid fa-hands-holding"></i> 二人の実質負担バランス
              </div>
              <div className={styles.paymentShareRow}>
                <div className={styles.payerShareItem}>
                  <span className={styles.payerLabel}>{myName}の実質負担</span>
                  <span className={styles.payerAmount}>{formatCurrency(burdenStats.myBurden)}</span>
                </div>
                <div className={styles.payerShareItem} style={{ textAlign: "right" }}>
                  <span className={styles.payerLabel}>{partnerName}の実質負担</span>
                  <span className={styles.payerAmount}>{formatCurrency(burdenStats.partnerBurden)}</span>
                </div>
              </div>
              <div className={styles.splitProgressBg}>
                <div 
                  className={styles.splitProgressMy} 
                  style={{ width: `${burdenStats.myBurdenRatio}%` }}
                />
                <div 
                  className={styles.splitProgressPartner} 
                  style={{ width: `${burdenStats.partnerBurdenRatio}%` }}
                />
              </div>
              <p className={styles.splitProgressMessage}>
                {burdenStats.myBurdenRatio > 55 ? (
                  <>今月は <strong>{myName}</strong> の負担割合が多くなっています。本来の負担額に合わせるため、調整をしていきましょう。⚖️</>
                ) : burdenStats.partnerBurdenRatio > 55 ? (
                  <>今月は <strong>{partnerName}</strong> の負担割合が多くなっています。本来の負担額に合わせるため、調整をしていきましょう。⚖️</>
                ) : (
                  <>二人の実質負担割合は折半（約50%ずつ）で、とてもきれいにバランスが取れています！✨</>
                )}
              </p>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
