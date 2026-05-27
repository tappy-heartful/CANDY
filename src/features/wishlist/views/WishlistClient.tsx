"use client";

import { useEffect, useMemo, useState } from "react";
import { Wishlist, Group, User as FirestoreUser } from "@/src/lib/firestore/types";
import { addWishlist, updateWishlist, deleteWishlist } from "@/src/features/wishlist/api/wishlist-client-service";
import { addGroup } from "@/src/features/todo/api/todo-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import styles from "./Wishlist.module.css";
import WishlistModal from "@/src/features/wishlist/components/WishlistModal";

interface WishlistClientProps {
  initialWishlist: Wishlist[];
  initialGroups: Group[];
}

export default function WishlistClient({ initialWishlist, initialGroups }: WishlistClientProps) {
  const { user, userData } = useAuth();
  const [items, setItems] = useState(initialWishlist);
  const [groups, setGroups] = useState(initialGroups);
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Wishlist | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortMode, setSortMode] = useState<"group" | "urgency" | "createdAt_desc" | "createdAt_asc">("group");

  const [filterState, setFilterState] = useState({
    couple: true,
    me: true,
    partner: false,
  });

  useEffect(() => {
    if (!user) return;
    getPartnerData(user.uid).then((p) => setPartnerData(p));
  }, [user]);



  const handleToggleAchieved = async (item: Wishlist) => {
    try {
      await updateWishlist(item.id, { isAchieved: !item.isAchieved });
      setItems(items.map(i => i.id === item.id ? { ...i, isAchieved: !i.isAchieved } : i));
    } catch (e) {
      showDialog("更新に失敗しました");
    }
  };

  const handleSaveWishlist = async (data: { title: string; groupId: string; type: "personal" | "couple"; urgency: number; isAchieved: boolean }) => {
    if (!data.title || !user) return;
    setIsSubmitting(true);
    showSpinner();
    try {
      if (editingItem) {
        // 更新
        await updateWishlist(editingItem.id, {
          title: data.title,
          groupId: data.groupId,
          urgency: data.urgency,
          isAchieved: data.isAchieved,
        });
        setItems((prev) =>
          prev.map((i) => (i.id === editingItem.id ? { ...i, ...data } : i))
        );
      } else {
        // 新規作成
        const docRef = await addWishlist({
          title: data.title,
          type: data.type,
          uid: user.uid,
          groupId: data.groupId,
          showToPartner: true,
          urgency: data.urgency,
        });
        const newItem: Wishlist = {
          id: docRef.id,
          title: data.title,
          type: data.type,
          uid: user.uid,
          groupId: data.groupId,
          showToPartner: true,
          isAchieved: false,
          urgency: data.urgency,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        setItems((prev) => [newItem, ...prev]);
      }
      setIsModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      showDialog("保存に失敗しました");
    } finally {
      setIsSubmitting(false);
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
    } catch (e) {
      showDialog("グループ追加に失敗しました");
    }
  };

  const toggleFilter = (key: "couple" | "me" | "partner") => {
    const next = { ...filterState, [key]: !filterState[key] };
    if (!next.couple && !next.me && !next.partner) {
      showDialog("いずれかを選択してください", true);
      return;
    }
    setFilterState(next);
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

  const renderWishlistItems = (list: Wishlist[]) => {
    return list.map((item) => {
      const isEditable = item.uid === user?.uid;
      return (
        <div
          key={item.id}
          className={`${styles.wishCard} ${item.isAchieved ? styles.achieved : ""} ${!isEditable ? styles.nonEditable : ""}`}
        >
          <div className={styles.cardHeader}>
            <div className={styles.cardTitle}>{item.title}</div>
            <div className={styles.wishActions}>
              {isEditable && (
                <>
                  <button
                    className={styles.editWishBtn}
                    onClick={() => {
                      setEditingItem(item);
                      setIsModalOpen(true);
                    }}
                    title="編集"
                  >
                    <i className="fa-solid fa-pen"></i>
                  </button>
                  <button
                    className={styles.deleteWishlistBtn}
                    onClick={(e) => handleDeleteWishlist(item.id, e)}
                    title="削除"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </>
              )}
            </div>
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
      );
    });
  };

  const renderWishlist = (list: Wishlist[]) => {
    const hasAny = list.length > 0;
    if (!hasAny) {
      return <div className={styles.emptyState}>Wishlistはありません</div>;
    }

    if (sortMode === "group") {
      const byGroup: Record<string, Wishlist[]> = {};
      list.forEach((w) => {
        const key = w.groupId || "";
        if (!byGroup[key]) byGroup[key] = [];
        byGroup[key].push(w);
      });

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
                  {renderWishlistItems(groupItems)}
                </div>
              </div>
            );
          })}
        </div>
      );
    } else {
      const sortedList = [...list].sort((a, b) => {
        if (sortMode === "urgency") {
          const uA = a.urgency ?? 50;
          const uB = b.urgency ?? 50;
          if (uB !== uA) return uB - uA;
          return b.createdAt - a.createdAt;
        } else if (sortMode === "createdAt_desc") {
          return b.createdAt - a.createdAt;
        } else {
          return a.createdAt - b.createdAt;
        }
      });

      return (
        <div className={styles.wishList}>
          {renderWishlistItems(sortedList)}
        </div>
      );
    }
  };

  return (
    <div className="page-container">
      <div className={styles.wishHeader}>
        <div className="card-title-main">
          <i className="fa-solid fa-gift"></i> Wishlist
        </div>
        <div className={styles.headerBtns}>
          <button onClick={handleAddGroup} className={styles.addGroupBtn}>
            + グループ
          </button>
          <button onClick={() => { setEditingItem(null); setIsModalOpen(true); }} className={styles.addWishBtn}>
            + Wishlistを追加
          </button>
        </div>
      </div>

      <div className={styles.controlsRow}>
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
        <select
          className={styles.sortSelect}
          value={sortMode}
          onChange={(e) => setSortMode(e.target.value as any)}
        >
          <option value="group">グループごと</option>
          <option value="urgency">早くやりたい度</option>
          <option value="createdAt_desc">新しい順</option>
          <option value="createdAt_asc">古い順</option>
        </select>
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

      {isModalOpen && (
        <WishlistModal
          wishlist={editingItem}
          groups={groups}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveWishlist}
          isSubmitting={isSubmitting}
        />
      )}
    </div>
  );
}
