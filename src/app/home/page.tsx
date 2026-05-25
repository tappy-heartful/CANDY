"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getTodos } from "@/src/features/todo/api/todo-server-actions";
import { getWishlist } from "@/src/features/wishlist/api/wishlist-server-actions";
import { Todo, Wishlist } from "@/src/lib/firestore/types";

export default function Home() {
  const { user, userData } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [wishlist, setWishlist] = useState<Wishlist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        getTodos(user.uid),
        getWishlist(user.uid)
      ]).then(([todoData, wishData]) => {
        setTodos(todoData.slice(0, 3));
        setWishlist(wishData.slice(0, 3));
        setLoading(false);
      });
    }
  }, [user]);

  return (
    <AuthGuard>
      <div className="page-container">
        <style jsx>{`
          .welcome-section {
            margin-top: 10px;
            margin-bottom: 24px;
            text-align: center;
          }
          .profile-img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 4px solid #A0E7D2;
            margin-bottom: 12px;
            box-shadow: 0 4px 12px rgba(160, 231, 210, 0.3);
          }
          .greeting {
            font-size: 22px;
            color: #9B7CC3;
            font-weight: bold;
          }
          .menu-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 16px;
            margin-bottom: 24px;
          }
          .menu-card {
            background: white;
            padding: 24px 12px;
            border-radius: 24px;
            box-shadow: 0 8px 20px rgba(155, 124, 195, 0.08);
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: all 0.3s ease;
            border: 2px solid #f3e5f5;
          }
          .menu-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 28px rgba(155, 124, 195, 0.15);
          }
          .card-todo { border-bottom: 5px solid #F7A8C4; }
          .card-wish { border-bottom: 5px solid #A0E7D2; }
          .card-icon { font-size: 36px; margin-bottom: 8px; }
          .card-title { font-weight: bold; font-size: 16px; color: #444; }

          .preview-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
          }
          .preview-item {
            background: #fafafa;
            padding: 12px 16px;
            border-radius: 16px;
            display: flex;
            align-items: center;
            gap: 12px;
            border-left: 4px solid #9B7CC3;
          }
          .preview-item.todo { border-color: #F7A8C4; }
          .preview-item.wish { border-color: #A0E7D2; }
          .item-text {
            flex: 1;
            font-size: 14px;
            color: #444;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          .item-badge {
            font-size: 10px;
            padding: 2px 6px;
            border-radius: 8px;
            color: white;
          }
          .badge-couple { background: #9B7CC3; }
          .badge-personal { background: #F7A8C4; }
          .empty-msg {
            font-size: 13px;
            color: #bbb;
            text-align: center;
            padding: 16px;
          }
          .view-all-link {
            display: block;
            text-align: center;
            margin-top: 12px;
            font-size: 13px;
            color: #9B7CC3;
            text-decoration: none;
            font-weight: bold;
          }
        `}</style>

        <div className="welcome-section">
          <img src={userData?.pictureUrl} alt="Profile" className="profile-img" />
          <div className="greeting">Hi, {userData?.displayName}! 🍭</div>
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
