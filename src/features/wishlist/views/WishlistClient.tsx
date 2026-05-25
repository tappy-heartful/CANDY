"use client";

import { useState } from "react";
import { Wishlist, Group } from "@/src/lib/firestore/types";
import { addWishlist, updateWishlist } from "../api/wishlist-client-service";
import { addGroup } from "../../todo/api/todo-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";

interface WishlistClientProps {
  initialWishlist: Wishlist[];
  initialGroups: Group[];
}

export default function WishlistClient({ initialWishlist, initialGroups }: WishlistClientProps) {
  const { user } = useAuth();
  const [items, setItems] = useState(initialWishlist);
  const [groups, setGroups] = useState(initialGroups);
  const [newTitle, setNewTitle] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || "");

  const handleToggleAchieved = async (item: Wishlist) => {
    try {
      await updateWishlist(item.id, { isAchieved: !item.isAchieved });
      setItems(items.map(i => i.id === item.id ? { ...i, isAchieved: !i.isAchieved } : i));
    } catch (e) {
      showDialog("更新に失敗しました");
    }
  };

  const handleAdd = async (type: "personal" | "couple") => {
    if (!newTitle || !user) return;
    showSpinner();
    try {
      await addWishlist({
        title: newTitle,
        type,
        uid: user.uid,
        groupId: selectedGroupId,
        showToPartner: true,
      });
      window.location.reload();
    } catch (e) {
      showDialog("追加に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  return (
    <div className="wish-container">
      <style jsx>{`
        .wish-container { padding: 20px; max-width: 600px; margin: 0 auto; }
        .title { color: #F7A8C4; font-size: 24px; font-weight: bold; margin-bottom: 20px; }
        .input-section { background: #eff6ff; padding: 20px; border-radius: 20px; margin-bottom: 20px; border: 2px dashed #A0E7D2; }
        .wish-input { width: 100%; padding: 12px; border-radius: 10px; border: 2px solid #A0E7D2; margin-bottom: 10px; outline: none; }
        .btn-group { display: flex; gap: 10px; }
        .btn-add { flex: 1; padding: 10px; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; color: white; }
        .btn-personal { background: #F7A8C4; }
        .btn-couple { background: #9B7CC3; }
        .wish-list { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .wish-card { background: white; padding: 15px; border-radius: 20px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); position: relative; border: 2px solid #fdf2f8; }
        .wish-card.achieved { background: #f0fdf4; border-color: #A0E7D2; }
        .wish-card.achieved::after { content: "✨"; position: absolute; top: 10px; right: 10px; }
        .card-title { font-weight: bold; color: #444; margin-bottom: 8px; }
        .card-meta { font-size: 11px; color: #888; }
      `}</style>

      <div className="title">🎁 Wishlist</div>

      <div className="input-section">
        <input
          type="text"
          className="wish-input"
          placeholder="叶えたいこと、やりたいこと"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <div className="btn-group">
          <button className="btn-add btn-personal" onClick={() => handleAdd("personal")}>自分の願い</button>
          <button className="btn-add btn-couple" onClick={() => handleAdd("couple")}>2人の願い</button>
        </div>
      </div>

      <div className="wish-list">
        {items.map(item => (
          <div
            key={item.id}
            className={`wish-card ${item.isAchieved ? "achieved" : ""}`}
            onClick={() => handleToggleAchieved(item)}
          >
            <div className="card-title">{item.title}</div>
            <div className="card-meta">
              {item.type === "personal" ? "👤 自分" : "💖 2人"}
              <br />
              {groups.find(g => g.id === item.groupId)?.name || "未分類"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
