"use client";

import { useState, useEffect } from "react";
import { getSession, removeSession } from "@/src/lib/functions";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";

export default function Footer() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const [showOverlay, setShowOverlay] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // メニューを表示しないページ
  if (["/login", "/callback", "/agreement"].includes(pathname)) return null;

  const displayName = userData?.displayName || "ゲスト";
  const pictureUrl = userData?.pictureUrl || "/icon.png";

  useEffect(() => {
    const fromLogin = getSession("fromLogin");

    if (fromLogin === "true") {
      setShowOverlay(true);
      removeSession("fromLogin");
      const showTimer = setTimeout(() => setIsAnimating(true), 100);
      const hideTimer = setTimeout(() => {
        setIsAnimating(false);
        setTimeout(() => setShowOverlay(false), 500);
      }, 2000);

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
      };
    }
  }, [pathname]);

  const manualClose = () => {
    setIsAnimating(false);
    setTimeout(() => setShowOverlay(false), 500);
  };

  return (
    <>
      <footer className="site-footer">
        <div className="copyright">&copy; 2026 CANDY Project</div>
        <div className="developed-by">Made with 💖 for Two</div>

        <style jsx>{`
          .site-footer {
            padding: 40px 20px;
            text-align: center;
            background-color: #fdf2f8;
            margin-top: 50px;
            border-top: 2px dashed #F7A8C4;
          }
          .copyright {
            color: #9B7CC3;
            font-weight: bold;
            font-size: 14px;
          }
          .developed-by {
            color: #F7A8C4;
            font-size: 12px;
            margin-top: 8px;
          }
          .first-login-overlay {
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(155, 124, 195, 0.9);
            z-index: 2000;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            visibility: hidden;
            transition: all 0.5s ease;
          }
          .first-login-overlay.show {
            opacity: 1;
            visibility: visible;
          }
          .first-login-content {
            text-align: center;
            transform: scale(0.8);
            transition: transform 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          }
          .first-login-overlay.show .first-login-content {
            transform: scale(1);
          }
          .user-icon {
            width: 120px; height: 120px;
            border-radius: 50%;
            border: 6px solid white;
            box-shadow: 0 10px 25px rgba(0,0,0,0.2);
            margin-bottom: 20px;
          }
          .welcome-message {
            color: white;
            font-size: 24px;
            font-weight: bold;
            line-height: 1.4;
          }
          .welcome-message span {
            font-size: 32px;
            color: #A0E7D2;
          }
        `}</style>
      </footer>

      {showOverlay && (
        <div
          className={`first-login-overlay ${isAnimating ? "show" : ""}`}
          onClick={manualClose}
        >
          <div className="first-login-content">
            <img className="user-icon" src={pictureUrl} alt="User Icon" />
            <p className="welcome-message">
              おかえりなさい！<br />
              <span>{displayName}</span>さん 🍬
            </p>
          </div>
        </div>
      )}
    </>
  );
}
