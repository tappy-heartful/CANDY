"use client";

import { useState } from "react";
import { Wishlist, Group } from "@/src/lib/firestore/types";
import { addWishlist, updateWishlist } from "@/src/features/wishlist/api/wishlist-client-service";
import { addGroup } from "@/src/features/todo/api/todo-client-service";
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
    <div className="page-container">
      <style jsx>{`
        .wish-header { margin-bottom: 20px; }
        .input-section { background: #eff6ff; padding: 20px; border-radius: 20px; margin-bottom: 24px; border: 2px dashed #A0E7D2; }
        .wish-input { width: 100%; padding: 12px; border-radius: 12px; border: 2px solid #A0E7D2; margin-bottom: 12px; outline: none; font-size: 16px; }
        .btn-group { display: flex; gap: 10px; }
        .btn-add { flex: 1; padding: 12px; border-radius: 16px; border: none; font-weight: bold; cursor: pointer; color: white; transition: transform 0.1s; }
        .btn-add:active { transform: scale(0.95); }
        .btn-personal { background: #F7A8C4; }
        .btn-couple { background: #9B7CC3; }
        .wish-list { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
        .wish-card { background: white; padding: 16px; border-radius: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.04); position: relative; border: 2px solid #fdf2f8; transition: all 0.2s; cursor: pointer; }
        .wish-card:hover { transform: translateY(-3px); box-shadow: 0 8px 20px rgba(0,0,0,0.08); }
        .wish-card.achieved { background: #f0fdf4; border-color: #A0E7D2; opacity: 0.8; }
        .wish-card.achieved::after { content: "✨"; position: absolute; top: 8px; right: 8px; font-size: 14px; }
        .card-title { font-weight: bold; color: #444; margin-bottom: 8px; font-size: 14px; line-height: 1.4; }
        .card-meta { font-size: 10px; color: #999; display: flex; flex-direction: column; gap: 2px; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 6px; font-size: 9px; color: white; width: fit-content; }
        .badge-personal { background: #F7A8C4; }
        .badge-couple { background: #9B7CC3; }
      `}</style>

      <div className="wish-header">
        <div className="card-title-main"><i className="fa-solid fa-gift"></i> Wishlist</div>
      </div>

      <div className="input-section">
        <input
          type="text"
          className="wish-input"
          placeholder="例: 北海道旅行に行きたい"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <div className="btn-group">
          <button className="btn-add btn-personal" onClick={() => handleAdd("personal")}>自分の願い</button>
          <button className="btn-add btn-couple" onClick={() => handleAdd("couple")}>2人の願い</button>
        </div>
      </div>

      <div className="content-card">
        <div className="wish-list">
          {items.length > 0 ? (
            items.map(item => (
              <div
                key={item.id}
                className={`wish-card ${item.isAchieved ? "achieved" : ""}`}
                onClick={() => handleToggleAchieved(item)}
              >
                <div className="card-title">{item.title}</div>
                <div className="card-meta">
                  <span className={`badge ${item.type === "personal" ? "badge-personal" : "badge-couple"}`}>
                    {item.type === "personal" ? "自分" : "2人"}
                  </span>
                  <span>{groups.find(g => g.id === item.groupId)?.name || "未分類"}</span>
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', color: '#ccc', padding: '20px' }}>
              Wishlistはありません
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
