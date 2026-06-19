import type { Metadata } from "next";
import InvestmentClient from "@/src/features/investment/views/InvestmentClient";

export const metadata: Metadata = {
  title: "投資シミュレーション | CANDY",
  description: "2人の将来設計をサポートする、かわいくてポップな投資シミュレーションツール。80歳までの総資産推移をグラフと表で確認できます。",
};

export default function InvestmentPage() {
  return (
    <main id="investment-page-main">
      <InvestmentClient />
    </main>
  );
}
