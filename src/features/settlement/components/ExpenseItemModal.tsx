"use client";

import React, { useState, useEffect } from "react";
import type { SettlementItem, User as FirestoreUser } from "@/src/lib/firestore/types";

interface ExpenseItemModalProps {
  isOpen: boolean;
  item?: SettlementItem | null;
  currentUserId: string;
  partnerData?: FirestoreUser | null;
  currentUserData?: FirestoreUser | null;
  onClose: () => void;
  onSave: (data: {
    title: string;
    amount: number;
    type: "expense" | "income";
    payerUid: string;
    receiptFile?: File | null;
    clearReceipt?: boolean;
  }) => Promise<void>;
  isSubmitting?: boolean;
}

export default function ExpenseItemModal({
  isOpen,
  item,
  currentUserId,
  partnerData,
  currentUserData,
  onClose,
  onSave,
  isSubmitting = false,
}: ExpenseItemModalProps) {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"expense" | "income">("expense");
  const [payerUid, setPayerUid] = useState(currentUserId);

  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [existingReceiptUrl, setExistingReceiptUrl] = useState<string | null>(null);
  const [existingReceiptName, setExistingReceiptName] = useState<string | null>(null);
  const [existingReceiptType, setExistingReceiptType] = useState<string | null>(null);
  const [clearReceipt, setClearReceipt] = useState(false);

  const myNickname = currentUserData?.nickname || currentUserData?.displayName || "自分";
  const myPictureUrl = currentUserData?.pictureUrl || "/icon.png";

  const partnerNickname = partnerData?.nickname || partnerData?.displayName || "パートナー";
  const partnerPictureUrl = partnerData?.pictureUrl || "/icon.png";
  const partnerUid = partnerData?.id || "";

  useEffect(() => {
    if (item) {
      setTitle(item.title);
      setAmount(String(item.amount));
      setType(item.type);
      setPayerUid(item.payerUid);
      setExistingReceiptUrl(item.receiptUrl || null);
      setExistingReceiptName(item.receiptFileName || null);
      setExistingReceiptType(item.receiptFileType || null);
    } else {
      setTitle("");
      setAmount("");
      setType("expense");
      setPayerUid(currentUserId);
      setExistingReceiptUrl(null);
      setExistingReceiptName(null);
      setExistingReceiptType(null);
    }
    setReceiptFile(null);
    setPreviewUrl(null);
    setClearReceipt(false);
  }, [item, isOpen, currentUserId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setReceiptFile(file);
    setClearReceipt(false);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreviewUrl(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setPreviewUrl(null);
    }
  };

  const handleRemoveFile = () => {
    setReceiptFile(null);
    setPreviewUrl(null);
    setExistingReceiptUrl(null);
    setExistingReceiptName(null);
    setExistingReceiptType(null);
    setClearReceipt(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseInt(amount, 10);
    if (!title.trim() || isNaN(numAmount) || numAmount < 0) return;

    await onSave({
      title: title.trim(),
      amount: numAmount,
      type,
      payerUid,
      receiptFile,
      clearReceipt,
    });
  };

  if (!isOpen) return null;

  const currentDisplayReceiptUrl = previewUrl || existingReceiptUrl;
  const isPdf =
    (receiptFile && receiptFile.type === "application/pdf") ||
    (!receiptFile && existingReceiptType === "application/pdf") ||
    (existingReceiptName && existingReceiptName.toLowerCase().endsWith(".pdf"));

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
          <i className="fa-solid fa-pen-to-square" style={{ color: "#ff758c" }}></i>
          {item ? "明細を編集" : "支払い・収入明細を追加"}
        </h3>

        <form onSubmit={handleSubmit}>
          {/* 項目名 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              項目名 <span style={{ color: "#e91e63" }}>*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 航空券代、カフェ代、レシート など"
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

          {/* 金額 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              金額 (円) <span style={{ color: "#e91e63" }}>*</span>
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="例: 3500 (0円も可)"
              min={0}
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

          {/* 区分 */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              区分
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <label
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "12px",
                  border: type === "expense" ? "2px solid #ff5e7e" : "1px solid #ccc",
                  background: type === "expense" ? "#fff0f3" : "#fff",
                  color: type === "expense" ? "#ff5e7e" : "#555",
                  fontWeight: "bold",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="type"
                  value="expense"
                  checked={type === "expense"}
                  onChange={() => setType("expense")}
                  style={{ display: "none" }}
                />
                💸 支払 (立替)
              </label>
              <label
                style={{
                  flex: 1,
                  padding: "10px",
                  borderRadius: "12px",
                  border: type === "income" ? "2px solid #43a047" : "1px solid #ccc",
                  background: type === "income" ? "#e8f5e9" : "#fff",
                  color: type === "income" ? "#2e7d32" : "#555",
                  fontWeight: "bold",
                  textAlign: "center",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="type"
                  value="income"
                  checked={type === "income"}
                  onChange={() => setType("income")}
                  style={{ display: "none" }}
                />
                💰 収入 / 返金
              </label>
            </div>
          </div>

          {/* 支払った人 */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              {type === "expense" ? "支払った人" : "受取った人"}
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <div
                onClick={() => setPayerUid(currentUserId)}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: "14px",
                  border: payerUid === currentUserId ? "2px solid #ff758c" : "1px solid #e0e0e0",
                  background: payerUid === currentUserId ? "#fff5f8" : "#fff",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  transition: "all 0.2s",
                }}
              >
                <img
                  src={myPictureUrl}
                  alt={myNickname}
                  style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                />
                <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{myNickname}</span>
              </div>

              {partnerUid && (
                <div
                  onClick={() => setPayerUid(partnerUid)}
                  style={{
                    flex: 1,
                    padding: "10px 12px",
                    borderRadius: "14px",
                    border: payerUid === partnerUid ? "2px solid #a0e7d2" : "1px solid #e0e0e0",
                    background: payerUid === partnerUid ? "#e0f7fa" : "#fff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                >
                  <img
                    src={partnerPictureUrl}
                    alt={partnerNickname}
                    style={{ width: "32px", height: "32px", borderRadius: "50%", objectFit: "cover" }}
                  />
                  <span style={{ fontSize: "14px", fontWeight: "bold", color: "#333" }}>{partnerNickname}</span>
                </div>
              )}
            </div>
          </div>

          {/* 領収書・レシート添付 (PDF または 画像) */}
          <div style={{ marginBottom: "20px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#555", marginBottom: "6px" }}>
              領収書・レシート（画像 / PDF）（任意）
            </label>

            {receiptFile || existingReceiptUrl ? (
              <div
                style={{
                  background: "#fafafa",
                  border: "1.5px solid #e0e0e0",
                  borderRadius: "14px",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", overflow: "hidden" }}>
                  {isPdf ? (
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "#ffebee",
                        color: "#e53935",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-file-pdf"></i>
                    </div>
                  ) : currentDisplayReceiptUrl ? (
                    <img
                      src={currentDisplayReceiptUrl}
                      alt="領収書プレビュー"
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "10px",
                        objectFit: "cover",
                        border: "1px solid #ccc",
                        flexShrink: 0,
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "#e3f2fd",
                        color: "#1e88e5",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "20px",
                        flexShrink: 0,
                      }}
                    >
                      <i className="fa-solid fa-receipt"></i>
                    </div>
                  )}

                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    <div style={{ fontSize: "13px", fontWeight: "bold", color: "#333", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {receiptFile?.name || existingReceiptName || "領収書ファイル"}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888" }}>
                      {isPdf ? "PDFドキュメント" : "画像ファイル"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleRemoveFile}
                  style={{
                    background: "#ffebee",
                    color: "#d32f2f",
                    border: "none",
                    borderRadius: "50%",
                    width: "30px",
                    height: "30px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                  title="ファイルを削除"
                >
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
            ) : (
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  padding: "16px",
                  border: "2px dashed #ffb6c1",
                  borderRadius: "14px",
                  background: "#fffafb",
                  cursor: "pointer",
                  color: "#ff5e7e",
                  fontSize: "13px",
                  fontWeight: "bold",
                  transition: "all 0.2s",
                }}
              >
                <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: "24px" }}></i>
                <span>領収書（画像 / PDF）をアップロード</span>
                <span style={{ fontSize: "11px", color: "#888", fontWeight: "normal" }}>
                  JPG, PNG, WEBP, PDF に対応
                </span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={handleFileChange}
                  style={{ display: "none" }}
                />
              </label>
            )}
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
              disabled={isSubmitting || !title.trim() || amount === ""}
              style={{
                padding: "10px 24px",
                borderRadius: "50px",
                border: "none",
                background: "linear-gradient(135deg, #ff758c 0%, #ff7eb3 100%)",
                color: "#fff",
                cursor: isSubmitting || !title.trim() || amount === "" ? "not-allowed" : "pointer",
                fontWeight: "bold",
                boxShadow: "0 4px 12px rgba(255, 117, 140, 0.4)",
                opacity: isSubmitting || !title.trim() || amount === "" ? 0.6 : 1,
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
