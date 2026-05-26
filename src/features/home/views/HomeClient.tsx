"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTodos } from "@/src/features/todo/api/todo-server-actions";
import { getWishlist } from "@/src/features/wishlist/api/wishlist-server-actions";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { Todo, Wishlist, User as FirestoreUser } from "@/src/lib/firestore/types";
import styles from "./Home.module.css";
import PartnerModal from "../components/PartnerModal";

export default function HomeClient() {
  const { user, userData } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);
  const [showPartnerModal, setShowPartnerModal] = useState(false);

  useEffect(() => {
    // ログイン直後の演出用
    const hasWelcomed = sessionStorage.getItem('candy.welcomed');
    if (!hasWelcomed && userData?.nickname) {
      setShowWelcome(true);
      sessionStorage.setItem('candy.welcomed', 'true');
      setTimeout(() => setShowWelcome(false), 3500);
    }
  }, [userData]);

  useEffect(() => {
    // 全ての必須項目が揃っている場合のみデータ取得
    const hasRequired =
      userData?.nickname &&
      userData?.mbti &&
      userData?.birthday &&
      userData?.phone &&
      userData?.emergencyContact &&
      userData?.allergies &&
      userData?.medications &&
      userData?.medicalHistory &&
      userData?.dislikedFoods;

    if (user && hasRequired) {
      Promise.all([
        getTodos(user.uid),
        getWishlist(user.uid),
        getPartnerData(user.uid)
      ]).then(([todoData, wishData, partner]) => {
        setTodos(todoData.filter((t) => !t.isCompleted).slice(0, 5));
        setWishlist(wishData.slice(0, 3));
        setPartnerData(partner);
        setLoading(false);
      });
    }
  }, [user, userData]);

  return (
    <AuthGuard>
      <div className={`page-container ${styles.homeContainer}`}>
        {showPartnerModal && (
          <PartnerModal
            partnerData={partnerData}
            onClose={() => setShowPartnerModal(false)}
          />
        )}

        {showWelcome && (
          <div className={styles.welcomeOverlay}>
            <div className={styles.welcomeCandy}>🍭</div>
            <div className={styles.welcomeText}>
              Welcome Back,
              <span className={styles.welcomeName}>{userData?.nickname}</span>
            </div>
          </div>
        )}

        <div className={styles.welcomeSection}>
          <div className={styles.profileImgContainer}>
            <img src={userData?.pictureUrl || "/icon.png"} alt="Profile" className={styles.profileImg} />
            <Link href="/user/edit" className={styles.editBadge}>
              <i className="fa-solid fa-pen"></i>
            </Link>
          </div>
          <div className={styles.greeting}>
            Hi, <span className={styles.nickname}>{userData?.nickname || userData?.displayName}</span>! 🍭
          </div>
        </div>

        <div className={styles.menuGrid}>
          <Link href="/todo" className={`${styles.menuCard} ${styles.cardTodo}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-list-check"></i></span>
            <span className={styles.cardTitle}>TODO</span>
          </Link>
          <Link href="/wishlist" className={`${styles.menuCard} ${styles.cardWish}`}>
            <span className={styles.cardIcon}><i className="fa-solid fa-gift"></i></span>
            <span className={styles.cardTitle}>Wishlist</span>
          </Link>
          <button className={`${styles.menuCard} ${styles.cardPartner}`} onClick={() => setShowPartnerModal(true)}>
            <span className={styles.cardIcon}><i className="fa-solid fa-heart-pulse"></i></span>
            <span className={styles.cardTitle}>パートナーの情報を見る</span>
          </button>
        </div>

        <div className="content-card">
          <div className="card-title-main">
            <i className="fa-solid fa-list-check"></i> 直近のTODO
          </div>
          <div className={styles.previewList}>
            {loading ? (
              <div className={styles.emptyMsg}>読み込み中...</div>
            ) : todos.length > 0 ? (
              todos.map(t => (
                <div key={t.id} className={`${styles.previewItem} ${styles.previewItemTodo}`}>
                  <span className={`${styles.itemBadge} ${t.type === 'couple' ? styles.badgeCouple : styles.badgePersonal}`}>
                    {t.type === 'couple' ? '2人' : '自分'}
                  </span>
                  <span className={styles.itemText}>{t.title}</span>
                  {t.isCompleted && <i className="fa-solid fa-check" style={{color: '#A0E7D2'}}></i>}
                </div>
              ))
            ) : (
              <div className={styles.emptyMsg}>TODOはありません</div>
            )}
          </div>
          <Link href="/todo" className={`${styles.viewAllLink} ${styles.viewAllTodo}`}>すべて見る ＞</Link>
        </div>

        <div className="content-card">
          <div className="card-title-main">
            <i className="fa-solid fa-gift"></i> 直近のWishlist
          </div>
          <div className={styles.previewList}>
            {loading ? (
              <div className={styles.emptyMsg}>読み込み中...</div>
            ) : wishlist.length > 0 ? (
              wishlist.map(w => (
                <div key={w.id} className={`${styles.previewItem} ${styles.previewItemWish}`}>
                  <span className={`${styles.itemBadge} ${w.type === 'couple' ? styles.badgeCouple : styles.badgePersonal}`}>
                    {w.type === 'couple' ? '2人' : '自分'}
                  </span>
                  <span className={styles.itemText}>{w.title}</span>
                  {w.isAchieved && <i className="fa-solid fa-star" style={{color: '#FFD700'}}></i>}
                </div>
              ))
            ) : (
              <div className={styles.emptyMsg}>Wishlistはありません</div>
            )}
          </div>
          <Link href="/wishlist" className={`${styles.viewAllLink} ${styles.viewAllWish}`}>すべて見る ＞</Link>
        </div>
      </div>
    </AuthGuard>
  );
}
