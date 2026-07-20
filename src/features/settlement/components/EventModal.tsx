"use client";

import React, { useState, useEffect } from "react";
import {
  getPrefectures,
  getMunicipalities,
} from "@/src/features/album/api/album-client-service";
import type { SettlementEvent, Prefecture, Municipality } from "@/src/lib/firestore/types";

interface EventModalProps {
  isOpen: boolean;
  event?: SettlementEvent | null;
  onClose: () => void;
  onSave: (data: {
    name: string;
    prefectureCode?: string;
    prefectureName?: string;
    municipalityCode?: string;
    municipalityName?: string;
    dateMode?: "single" | "range";
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

const getTodayString = () => {
  const today = new Date();
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
};

export default function EventModal({
  isOpen,
  event,
  onClose,
  onSave,
  isSubmitting = false,
}: EventModalProps) {
  const [name, setName] = useState("");
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedPrefCode, setSelectedPrefCode] = useState("");
  const [selectedMuniCode, setSelectedMuniCode] = useState("");
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());

  useEffect(() => {
    getPrefectures()
      .then((data) => setPrefectures(data))
      .catch((e) => console.error("Failed to fetch prefectures:", e));
  }, []);

  useEffect(() => {
    if (event) {
      setName(event.name || "");
      const prefCode = event.prefectureCode || "";
      const muniCode = event.municipalityCode || "";
      setSelectedPrefCode(prefCode);
      setSelectedMuniCode(muniCode);
      setDateMode(event.dateMode || "single");
      setStartDate(event.startDate || getTodayString());
      setEndDate(event.endDate || event.startDate || getTodayString());

      if (prefCode) {
        getMunicipalities(prefCode)
          .then((data) => setMunicipalities(data))
          .catch((e) => console.error(e));
      } else {
        setMunicipalities([]);
      }
    } else {
      setName("");
      setSelectedPrefCode("");
      setSelectedMuniCode("");
      setMunicipalities([]);
      setDateMode("single");
      setStartDate(getTodayString());
      setEndDate(getTodayString());
    }
  }, [event, isOpen]);

  const handlePrefChange = async (prefCode: string) => {
    setSelectedPrefCode(prefCode);
    setSelectedMuniCode("");
    setMunicipalities([]);
    if (!prefCode) return;

    try {
      const data = await getMunicipalities(prefCode);
      setMunicipalities(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const pref = prefectures.find((p) => String(p.code).padStart(2, "0") === selectedPrefCode);
    const muni = municipalities.find((m) => m.code === selectedMuniCode);

    await onSave({
      name: name.trim(),
      prefectureCode: selectedPrefCode || undefined,
      prefectureName: pref?.name || undefined,
      municipalityCode: selectedMuniCode || undefined,
      municipalityName: muni?.name || undefined,
      dateMode,
      startDate,
      endDate: dateMode === "range" ? endDate : undefined,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "rgba(0,0,0,0.45)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "24px",
          width: "100%",
          maxWidth: "440px",
          padding: "24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.15)",
          border: "2px solid #ffe4ed",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3
          style={{
            fontSize: "18px",
            fontWeight: "bold",
            margin: "0 0 16px",
            color: "#4a3e56",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <i className="fa-solid fa-hand-holding-dollar" style={{ color: "#ff758c" }}></i>
          {event ? "イベント情報を編集" : "新しいワリカンイベントを作成"}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* イベント名 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              イベント名 <span style={{ color: "#e91e63" }}>*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例: 沖縄旅行、週末BBQ など"
              autoFocus
              required
              style={{
                width: "100%",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1.5px solid #ddd",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none",
              }}
            />
          </div>

          {/* 日付設定 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              日付設定（任意）
            </label>
            <div style={{ display: "flex", gap: "12px", marginBottom: "10px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                <input
                  type="radio"
                  name="dateMode"
                  value="single"
                  checked={dateMode === "single"}
                  onChange={() => setDateMode("single")}
                />
                1日のみ
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                <input
                  type="radio"
                  name="dateMode"
                  value="range"
                  checked={dateMode === "range"}
                  onChange={() => setDateMode("range")}
                />
                期間
              </label>
            </div>

            {dateMode === "single" ? (
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  border: "1.5px solid #ddd",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            ) : (
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #ddd",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
                <span style={{ fontSize: "14px", color: "#777" }}>〜</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  min={startDate}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: "12px",
                    border: "1.5px solid #ddd",
                    fontSize: "14px",
                    boxSizing: "border-box",
                  }}
                />
              </div>
            )}
          </div>

          {/* 都道府県 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              都道府県（任意）
            </label>
            <select
              value={selectedPrefCode}
              onChange={(e) => handlePrefChange(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1.5px solid #ddd",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none",
                background: "#fff",
              }}
            >
              <option value="">選択してください</option>
              {prefectures.map((pref) => (
                <option key={pref.code} value={String(pref.code).padStart(2, "0")}>
                  {pref.name}
                </option>
              ))}
            </select>
          </div>

          {/* 市区町村 */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              市区町村（任意）
            </label>
            <select
              value={selectedMuniCode}
              onChange={(e) => setSelectedMuniCode(e.target.value)}
              disabled={!selectedPrefCode || municipalities.length === 0}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "12px",
                border: "1.5px solid #ddd",
                fontSize: "14px",
                boxSizing: "border-box",
                outline: "none",
                background: !selectedPrefCode || municipalities.length === 0 ? "#f5f5f5" : "#fff",
              }}
            >
              <option value="">選択してください</option>
              {municipalities.map((muni) => (
                <option key={muni.code} value={muni.code}>
                  {muni.name}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "24px", justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                borderRadius: "50px",
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name.trim()}
              style={{
                padding: "10px 24px",
                borderRadius: "50px",
                border: "none",
                background: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)",
                color: "#fff",
                cursor: isSubmitting || !name.trim() ? "not-allowed" : "pointer",
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(255, 117, 140, 0.4)",
                opacity: isSubmitting || !name.trim() ? 0.6 : 1,
              }}
            >
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
