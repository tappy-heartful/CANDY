"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import Link from "next/link";

export default function Home() {
  const { userData } = useAuth();

  return (
    <AuthGuard>
      <div className="home-container">
        <style jsx>{`
          .home-container {
            padding: 20px;
            max-width: 500px;
            margin: 0 auto;
            text-align: center;
          }
          .welcome-section {
            margin-top: 40px;
            margin-bottom: 40px;
          }
          .profile-img {
            width: 80px;
            height: 80px;
            border-radius: 50%;
            border: 4px solid #A0E7D2;
            margin-bottom: 15px;
          }
          .greeting {
            font-size: 24px;
            color: #9B7CC3;
            font-weight: bold;
          }
          .menu-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
          }
          .menu-card {
            background: white;
            padding: 30px 20px;
            border-radius: 30px;
            box-shadow: 0 10px 25px rgba(155, 124, 195, 0.1);
            text-decoration: none;
            display: flex;
            flex-direction: column;
            align-items: center;
            transition: transform 0.2s;
            border: 3px solid transparent;
          }
          .menu-card:hover {
            transform: translateY(-5px);
          }
          .card-todo { border-color: #F7A8C4; }
          .card-wish { border-color: #A0E7D2; }
          .card-icon { font-size: 40px; margin-bottom: 10px; }
          .card-title { font-weight: bold; font-size: 18px; color: #444; }
          .card-desc { font-size: 12px; color: #888; margin-top: 5px; }
        `}</style>

        <div className="welcome-section">
          <img src={userData?.pictureUrl} alt="Profile" className="profile-img" />
          <div className="greeting">Hi, {userData?.displayName}! 🍭</div>
        </div>

        <div className="menu-grid">
          <Link href="/todo" className="menu-card card-todo">
            <span className="card-icon">📝</span>
            <span className="card-title">TODO</span>
            <span className="card-desc">なにする？</span>
          </Link>
          <Link href="/wishlist" className="menu-card card-wish">
            <span className="card-icon">🎁</span>
            <span className="card-title">Wishlist</span>
            <span className="card-desc">やりたいこと</span>
          </Link>
        </div>
      </div>
    </AuthGuard>
  );
}
