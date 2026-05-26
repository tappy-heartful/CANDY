"use client";

import { useState } from "react";
import { Wishlist, Group } from "@/src/lib/firestore/types";
import { addWishlist, updateWishlist } from "@/src/features/wishlist/api/wishlist-client-service";
import { addGroup } from "@/src/features/todo/api/todo-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import styles from "./Wishlist.module.css";

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
      const docRef = await addWishlist({
        title: newTitle,
        type,
        uid: user.uid,
        groupId: selectedGroupId,
        showToPartner: true,
      });
      const newItem: Wishlist = {
        id: docRef.id,
        title: newTitle,
        type,
        uid: user.uid,
        groupId: selectedGroupId,
        showToPartner: true,
        isAchieved: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setItems((prev) => [newItem, ...prev]);
      setNewTitle("");
    } catch (e) {
      showDialog("追加に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  return (
    <div className="page-container">
      <div className={styles.wishHeader}>
        <div className="card-title-main"><i className="fa-solid fa-gift"></i> Wishlist</div>
      </div>

      <div className={styles.inputSection}>
        <input
          type="text"
          className={styles.wishInput}
          placeholder="例: 北海道旅行に行きたい"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />
        <div className={styles.btnGroup}>
          <button className={`${styles.btnAdd} ${styles.btnPersonal}`} onClick={() => handleAdd("personal")}>自分の願い</button>
          <button className={`${styles.btnAdd} ${styles.btnCouple}`} onClick={() => handleAdd("couple")}>2人の願い</button>
        </div>
      </div>

      <div className="content-card">
        <div className={styles.wishList}>
          {items.length > 0 ? (
            items.map(item => (
              <div
                key={item.id}
                className={`${styles.wishCard} ${item.isAchieved ? styles.achieved : ""}`}
                onClick={() => handleToggleAchieved(item)}
              >
                <div className={styles.cardTitle}>{item.title}</div>
                <div className={styles.cardMeta}>
                  <span className={`${styles.badge} ${item.type === "personal" ? styles.badgePersonal : styles.badgeCouple}`}>
                    {item.type === "personal" ? "自分" : "2人"}
                  </span>
                  <span>{groups.find(g => g.id === item.groupId)?.name || "未分類"}</span>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.emptyState}>Wishlistはありません</div>
          )}
        </div>
      </div>
    </div>
  );
}
