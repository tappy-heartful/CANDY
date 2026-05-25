"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getTodos } from "@/src/features/todo/api/todo-server-actions";
import { getWishlist } from "@/src/features/wishlist/api/wishlist-server-actions";
import { Todo, Wishlist } from "@/src/lib/firestore/types";

export default function Home() {
  const { user, userData, loading: authLoading } = useAuth();
  const router = useRouter();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);

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
        getWishlist(user.uid)
      ]).then(([todoData, wishData]) => {
        setTodos(todoData.slice(0, 3));
        setWishlist(wishData.slice(0, 3));
        setLoading(false);
      });
    }
  }, [user, userData]);

  return (
    <AuthGuard>
      <div className="page-container">
        <style jsx>{`
          .welcome-section {
            margin-top: 10px;
            margin-bottom: 30px;
            text-align: center;
          }
          .profile-img-container {
            position: relative;
            display: inline-block;
            margin-bottom: 15px;
          }
          .profile-img {
            width: 90px;
            height: 90px;
            border-radius: 50%;
            border: 4px solid #A0E7D2;
            box-shadow: 0 4px 15px rgba(160, 231, 210, 0.4);
            object-fit: cover;
          }
          .edit-badge {
            position: absolute;
            bottom: 0;
            right: 0;
            background: #9B7CC3;
            color: white;
            width: 28px;
            height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 14px;
            border: 2px solid white;
            text-decoration: none;
          }
          .greeting {
            font-size: 24px;
            color: #9B7CC3;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
          }
          .nickname {
            color: #F7A8C4;
            position: relative;
          }
          .nickname::after {
            content: '';
            position: absolute;
            bottom: -2px;
            left: 0;
            width: 100%;
            height: 4px;
            background: rgba(247, 168, 196, 0.2);
            border-radius: 2px;
          }

          .menu-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 30px;
          }
          .menu-card {
            background: white;
            padding: 28px 15px;
            border-radius: 30px;
            box-shadow: 0 10px 25px rgba(155, 124, 195, 0.08);
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            border: 3px solid #f3e5f5;
            position: relative;
            overflow: hidden;
          }
          .menu-card:hover {
            transform: translateY(-8px) scale(1.02);
            box-shadow: 0 15px 35px rgba(155, 124, 195, 0.15);
            border-color: #9B7CC3;
          }
          .card-todo { border-bottom: 8px solid #F7A8C4; }
          .card-wish { border-bottom: 8px solid #A0E7D2; }
          .card-icon { font-size: 40px; margin-bottom: 12px; }
          .card-title { font-weight: bold; font-size: 18px; color: #444; letter-spacing: 1px; }

          .preview-list {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }
          .preview-item {
            background: #fdfdfd;
            padding: 14px 18px;
            border-radius: 18px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-left: 5px solid #9B7CC3;
            box-shadow: 0 2px 8px rgba(0,0,0,0.02);
          }
          .preview-item.todo { border-color: #F7A8C4; }
          .preview-item.wish { border-color: #A0E7D2; }
          .item-text {
            flex: 1;
            font-size: 15px;
            color: #555;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .item-badge {
            font-size: 10px;
            padding: 3px 8px;
            border-radius: 10px;
            color: white;
            font-weight: bold;
          }
          .badge-couple { background: #9B7CC3; }
          .badge-personal { background: #F7A8C4; }
          .empty-msg {
            font-size: 14px;
            color: #bbb;
            text-align: center;
            padding: 24px;
            background: #fcfcfc;
            border-radius: 20px;
            border: 2px dashed #eee;
          }
          .view-all-link {
            display: block;
            text-align: center;
            margin-top: 16px;
            font-size: 14px;
            color: #9B7CC3;
            text-decoration: none;
            font-weight: bold;
            transition: color 0.2s;
          }
          .view-all-link:hover { color: #F7A8C4; }
        `}</style>

        <div className="welcome-section">
          <div className="profile-img-container">
            <img src={userData?.pictureUrl} alt="Profile" className="profile-img" />
            <Link href="/user/edit" className="edit-badge">
              <i className="fa-solid fa-pen"></i>
            </Link>
          </div>
          <div className="greeting">
            Hi, <span className="nickname">{userData?.nickname || userData?.displayName}</span>! 🍭
          </div>
        </div>

        <div className="menu-grid">
          <Link href="/todo" className="menu-card card-todo">
            <span className="card-icon">📝</span>
            <span className="card-title">TODO</span>
          </Link>
          <Link href="/wishlist" className="menu-card card-wish">
            <span className="card-icon">🎁</span>
            <span className="card-title">Wishlist</span>
          </Link>
        </div>

        <div className="content-card">
          <div className="card-title-main">
            <span>📝</span> 直近のTODO
          </div>
          <div className="preview-list">
            {loading ? (
              <div className="empty-msg">読み込み中...</div>
            ) : todos.length > 0 ? (
              todos.map(t => (
                <div key={t.id} className="preview-item todo">
                  <span className={`item-badge ${t.type === 'couple' ? 'badge-couple' : 'badge-personal'}`}>
                    {t.type === 'couple' ? '2人' : '自分'}
                  </span>
                  <span className="item-text">{t.title}</span>
                  {t.isCompleted && <i className="fa-solid fa-check" style={{color: '#A0E7D2'}}></i>}
                </div>
              ))
            ) : (
              <div className="empty-msg">TODOはありません</div>
            )}
          </div>
          <Link href="/todo" className="view-all-link">すべて見る ＞</Link>
        </div>

        <div className="content-card">
          <div className="card-title-main">
            <span>🎁</span> 直近のWishlist
          </div>
          <div className="preview-list">
            {loading ? (
              <div className="empty-msg">読み込み中...</div>
            ) : wishlist.length > 0 ? (
              wishlist.map(w => (
                <div key={w.id} className="preview-item wish">
                  <span className={`item-badge ${w.type === 'couple' ? 'badge-couple' : 'badge-personal'}`}>
                    {w.type === 'couple' ? '2人' : '自分'}
                  </span>
                  <span className="item-text">{w.title}</span>
                  {w.isAchieved && <i className="fa-solid fa-star" style={{color: '#FFD700'}}></i>}
                </div>
              ))
            ) : (
              <div className="empty-msg">Wishlistはありません</div>
            )}
          </div>
          <Link href="/wishlist" className="view-all-link">すべて見る ＞</Link>
        </div>
      </div>
    </AuthGuard>
  );
}
