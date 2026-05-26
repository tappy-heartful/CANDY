"use client";

import { useEffect, useMemo, useState } from "react";
import { Wishlist, Group, User as FirestoreUser } from "@/src/lib/firestore/types";
import { addWishlist, updateWishlist, deleteWishlist } from "@/src/features/wishlist/api/wishlist-client-service";
import { addGroup } from "@/src/features/todo/api/todo-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import styles from "./Wishlist.module.css";
import EditWishlistModal from "@/src/features/wishlist/components/EditWishlistModal";

interface WishlistClientProps {
  initialWishlist: Wishlist[];
  initialGroups: Group[];
}

export default function WishlistClient({ initialWishlist, initialGroups }: WishlistClientProps) {
  const { user, userData } = useAuth();
  const [items, setItems] = useState(initialWishlist);
  const [groups, setGroups] = useState(initialGroups);
  const [newTitle, setNewTitle] = useState("");
  const [newUrgency, setNewUrgency] = useState<number>(50);
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || "");
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);
  const [selectedEditItem, setSelectedEditItem] = useState<Wishlist | null>(null);

  const [filterState, setFilterState] = useState({
    couple: true,
    me: true,
    partner: false,
  });

  useEffect(() => {
    if (!user) return;
    getPartnerData(user.uid).then((p) => setPartnerData(p));
  }, [user]);

  // Set default group when groups list updates and no group is selected yet
  useEffect(() => {
    if (!selectedGroupId && groups.length > 0) {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups, selectedGroupId]);

  const handleToggleAchieved = async (item: Wishlist) => {
    try {
      await updateWishlist(item.id, { isAchieved: !item.isAchieved });
      setItems(items.map(i => i.id === item.id ? { ...i, isAchieved: !i.isAchieved } : i));
    } catch (e) {
      showDialog("更新に失敗しました");
    }
  };

  const handleSaveEdit = async (updatedFields: Partial<Wishlist>) => {
    if (!selectedEditItem) return;
    showSpinner();
    try {
      await updateWishlist(selectedEditItem.id, updatedFields);
      setItems((prev) =>
        prev.map((i) => (i.id === selectedEditItem.id ? { ...i, ...updatedFields } : i))
      );
      setSelectedEditItem(null);
    } catch (e) {
      showDialog("更新に失敗しました");
    } finally {
      hideSpinner();
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
        urgency: newUrgency,
      });
      const newItem: Wishlist = {
        id: docRef.id,
        title: newTitle,
        type,
        uid: user.uid,
        groupId: selectedGroupId,
        showToPartner: true,
        isAchieved: false,
        urgency: newUrgency,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      setItems((prev) => [newItem, ...prev]);
      setNewTitle("");
      setNewUrgency(50);
    } catch (e) {
      showDialog("追加に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleDeleteWishlist = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent toggling completed status on click
    const confirmed = await showDialog("本当にこのWishlistを削除しますか？");
    if (!confirmed) return;
    showSpinner();
    try {
      await deleteWishlist(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e) {
      showDialog("削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleAddGroup = async () => {
    const name = await showDialog("新しいグループ名を入力してください", false, true) as string;
    if (!name || !user) return;
    try {
      const docRef = await addGroup(name, "wishlist", user.uid);
      const newGroup = {
        id: docRef.id,
        name,
        type: "wishlist" as const,
        uid: user.uid,
        createdAt: Date.now(),
      };
      setGroups((prev) => [...prev, newGroup]);
      setSelectedGroupId(docRef.id);
    } catch (e) {
      showDialog("グループ追加に失敗しました");
    }
  };

  const toggleFilter = (key: "couple" | "me" | "partner") => {
    setFilterState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.couple && !next.me && !next.partner) {
        showDialog("いずれかを選択してください", true);
        return prev;
      }
      return next;
    });
  };

  const visibleWishlist = useMemo(() => {
    if (!user) return [];
    return items.filter((w) => {
      if (w.type === "couple") return filterState.couple;
      const isMe = w.uid === user.uid;
      if (isMe) return filterState.me;
      return filterState.partner;
    });
  }, [items, filterState, user]);

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    map.set("", "未分類");
    return map;
  }, [groups]);

  const groupOrder = useMemo(() => {
    return [...groups.map((g) => g.id), ""];
  }, [groups]);

  const myLabel = userData?.nickname || "自分";
  const partnerLabel = partnerData?.nickname || "相手";

  const renderWishlist = (list: Wishlist[]) => {
    const hasAny = list.length > 0;
    if (!hasAny) {
      return <div className={styles.emptyState}>Wishlistはありません</div>;
    }

    const byGroup: Record<string, Wishlist[]> = {};
    list.forEach((w) => {
      const key = w.groupId || "";
      if (!byGroup[key]) byGroup[key] = [];
      byGroup[key].push(w);
    });

    // Sort items within each group by urgency desc, then by createdAt desc
    groupOrder.forEach((groupId) => {
      if (byGroup[groupId]) {
        byGroup[groupId].sort((a, b) => {
          const urgencyA = a.urgency ?? 50;
          const urgencyB = b.urgency ?? 50;
          if (urgencyB !== urgencyA) {
            return urgencyB - urgencyA;
          }
          return b.createdAt - a.createdAt;
        });
      }
    });

    return (
      <div className="grouped-list">
        {groupOrder.map((groupId) => {
          const groupItems = byGroup[groupId] || [];
          if (groupItems.length === 0) return null;
          return (
            <div key={groupId} className={styles.groupBlock}>
              <div className={styles.groupTitle}>{groupNameById.get(groupId) || "未分類"}</div>
              <div className={styles.wishList}>
                {groupItems.map((item) => (
                  <div
                    key={item.id}
                    className={`${styles.wishCard} ${item.isAchieved ? styles.achieved : ""}`}
                    onClick={() => setSelectedEditItem(item)}
                  >
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitle}>{item.title}</div>
                      <button
                        className={styles.deleteWishlistBtn}
                        onClick={(e) => handleDeleteWishlist(item.id, e)}
                        title="削除"
                      >
                        <i className="fa-solid fa-trash-can"></i>
                      </button>
                    </div>
                    <div className={styles.cardMeta}>
                      <div className={styles.metaRow}>
                        <span
                          className={`${styles.badge} ${
                            item.type === "couple"
                              ? styles.badgeCouple
                              : item.uid === user?.uid
                                ? styles.badgeMe
                                : styles.badgePartner
                          }`}
                        >
                          {item.type === "couple" ? "2人" : item.uid === user?.uid ? myLabel : partnerLabel}
                        </span>
                        <span className={styles.groupBadge}>
                          {groupNameById.get(item.groupId) || "未分類"}
                        </span>
                      </div>
                      <div className={styles.urgencyBadge}>
                        <i className="fa-solid fa-fire" style={{ color: "#F7A8C4", marginRight: "4px" }}></i>
                        早くやりたい度: {item.urgency ?? 50}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container">
      <div className={styles.wishHeader}>
        <div className="card-title-main">
          <i className="fa-solid fa-gift"></i> Wishlist
        </div>
        <button onClick={handleAddGroup} className={styles.addGroupBtn}>
          + グループ追加
        </button>
      </div>

      <div className={styles.inputSection}>
        <input
          type="text"
          className={styles.wishInput}
          placeholder="例: 北海道旅行に行きたい"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />

        <select
          className={styles.groupSelect}
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">グループを選択</option>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>

        <div className={styles.urgencyRow}>
          <div className={styles.urgencyLabel}>早くやりたい度: {newUrgency}</div>
          <input
            type="range"
            min="1"
            max="100"
            className={styles.urgencySlider}
            value={newUrgency}
            onChange={(e) => setNewUrgency(Number(e.target.value))}
          />
        </div>

        <div className={styles.btnGroup}>
          <button
            className={`${styles.btnAdd} ${styles.btnPersonal}`}
            onClick={() => handleAdd("personal")}
          >
            自分の願い
          </button>
          <button
            className={`${styles.btnAdd} ${styles.btnCouple}`}
            onClick={() => handleAdd("couple")}
          >
            2人の願い
          </button>
        </div>
      </div>

      <div className={styles.filterTabs}>
        <button
          className={`${styles.tab} ${filterState.couple ? styles.active : ""}`}
          onClick={() => toggleFilter("couple")}
        >
          2人
        </button>
        <button
          className={`${styles.tab} ${filterState.me ? styles.active : ""}`}
          onClick={() => toggleFilter("me")}
        >
          {myLabel}
        </button>
        <button
          className={`${styles.tab} ${filterState.partner ? styles.active : ""}`}
          onClick={() => toggleFilter("partner")}
        >
          {partnerLabel}
        </button>
      </div>

      <div className="content-card">
        <div className="card-title-main">
          <i className="fa-solid fa-hourglass-half"></i> 未完了
        </div>
        {renderWishlist(visibleWishlist.filter((w) => !w.isAchieved))}
      </div>

      <div className="content-card">
        <div className="card-title-main">
          <i className="fa-solid fa-check"></i> 完了
        </div>
        {renderWishlist(visibleWishlist.filter((w) => w.isAchieved))}
      </div>

      {selectedEditItem && (
        <EditWishlistModal
          wishlist={selectedEditItem}
          groups={groups}
          onClose={() => setSelectedEditItem(null)}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  );
}
