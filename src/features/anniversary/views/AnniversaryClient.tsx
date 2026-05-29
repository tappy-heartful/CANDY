"use client";

import { useEffect, useMemo, useState } from "react";
import { Anniversary } from "@/src/lib/firestore/types";
import { addAnniversary, updateAnniversary, deleteAnniversary } from "@/src/features/anniversary/api/anniversary-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner, getNextAnniversaryDiff } from "@/src/lib/functions";
import styles from "./Anniversary.module.css";
import AnniversaryModal from "@/src/features/anniversary/components/AnniversaryModal";
import BackToHome from "@/src/components/Common/BackToHome";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";

interface AnniversaryClientProps {
  initialAnniversaries: Anniversary[];
}

export default function AnniversaryClient({ initialAnniversaries }: AnniversaryClientProps) {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [items, setItems] = useState(initialAnniversaries);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Anniversary | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    setBreadcrumbs([{ title: "記念日" }]);
  }, [setBreadcrumbs]);

  const handleSaveAnniversary = async (data: { title: string; date: string }) => {
    if (!data.title || !user) return;
    setIsSubmitting(true);
    showSpinner();
    try {
      if (editingItem) {
        await updateAnniversary(editingItem.id, {
          title: data.title,
          date: data.date,
        });
        setItems(items.map((i) => (i.id === editingItem.id ? { ...i, ...data } : i)));
      } else {
        const docRef = await addAnniversary(user.uid, {
          title: data.title,
          date: data.date,
        });
        setItems([{ ...data, id: docRef.id, uid: user.uid, createdAt: Date.now(), updatedAt: Date.now() }, ...items]);
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

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const confirmed = await showDialog("本当に削除しますか？");
    if (!confirmed) return;
    showSpinner();
    try {
      await deleteAnniversary(id);
      setItems(items.filter((i) => i.id !== id));
    } catch (err) {
      showDialog("削除に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const sortedItems = useMemo(() => {
    const arr = [...items];
    arr.sort((a, b) => {
      const diffA = getNextAnniversaryDiff(a.date).diffDays;
      const diffB = getNextAnniversaryDiff(b.date).diffDays;
      return diffA - diffB; // 日付が近い順
    });
    return arr;
  }, [items]);

  return (
    <div className={`page-container ${styles.container}`}>
      <div className={styles.header}>
        <h1 className={styles.title}><i className="fa-solid fa-cake-candles"></i> 記念日</h1>
        <button
          className={styles.addBtn}
          onClick={() => {
            setEditingItem(null);
            setIsModalOpen(true);
          }}
        >
          <i className="fa-solid fa-plus"></i> 追加
        </button>
      </div>

      {sortedItems.length === 0 ? (
        <div className={styles.emptyMsg}>
          <i className="fa-solid fa-box-open"></i>
          <p>まだ記念日がありません</p>
        </div>
      ) : (
        <div className={styles.listContainer}>
          {sortedItems.map((item) => {
            const { diffDays, isToday } = getNextAnniversaryDiff(item.date);
            const displayDate = item.date.replace("-", "/"); // MM/DD

            return (
              <div
                key={item.id}
                className={styles.card}
                onClick={() => {
                  setEditingItem(item);
                  setIsModalOpen(true);
                }}
              >
                <div className={styles.cardContent}>
                  <div className={styles.cardInfo}>
                    <h3 className={styles.cardTitle}>{item.title}</h3>
                    <div className={styles.dateText}>
                      <i className="fa-regular fa-calendar"></i>
                      毎年 {displayDate}
                    </div>
                  </div>
                  
                  <div className={styles.rightArea}>
                    <div className={styles.countdown}>
                      {isToday ? (
                        <span className={styles.todayText}>今日です！🎉</span>
                      ) : (
                        <>あと<span>{diffDays}</span>日</>
                      )}
                    </div>
                    <button
                      className={styles.deleteBtn}
                      onClick={(e) => handleDelete(e, item.id)}
                    >
                      <i className="fa-solid fa-trash-can"></i>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {isModalOpen && (
        <AnniversaryModal
          anniversary={editingItem}
          onClose={() => {
            setIsModalOpen(false);
            setEditingItem(null);
          }}
          onSave={handleSaveAnniversary}
          isSubmitting={isSubmitting}
        />
      )}

      <BackToHome />
    </div>
  );
}
