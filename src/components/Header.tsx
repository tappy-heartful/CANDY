"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { auth } from "@/src/lib/firebase";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import {
  clearAllAppSession,
  showSpinner,
  hideSpinner,
  showDialog,
  writeLog,
} from "@/src/lib/functions";
import React, { useEffect } from "react";

export default function Header() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, userData } = useAuth();
  const { items } = useBreadcrumb();

  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // 画面遷移時にスピナーを確実に非表示にする
  useEffect(() => {
    hideSpinner();
  }, [pathname]);

  // メニューを表示しないページ
  if (["/login", "/callback", "/agreement"].includes(pathname)) return null;

  const displayName = userData?.displayName || "ゲスト";
  const pictureUrl = userData?.pictureUrl || "/icon.png";
  const uid = user?.uid || "";

  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);
  const closeMenu = () => setIsMenuOpen(false);

  const handleLogout = async () => {
    try {
      showSpinner();
      await auth.signOut();
      clearAllAppSession();
      router.push("/login");
    } catch (error) {
      console.error("Logout Error:", error);
      await writeLog({ dataId: uid, action: "ログアウト", status: "error", errorDetail: { message: (error as Error).message } });
      await showDialog("ログアウトに失敗しました", true);
    } finally {
      hideSpinner();
      closeMenu();
    }
  };

  const handleShare = () => {
    const url = window.location.href;
    if (navigator.share) {
      navigator.share({ title: document.title, url }).catch(async (error) => {
        console.error(error);
        await writeLog({ dataId: uid, action: "シェア", status: "error", errorDetail: { message: (error as Error).message } });
      });
    } else {
      navigator.clipboard.writeText(url)
        .then(() => showDialog("URLをコピーしました", true))
        .catch(async (error) => {
          console.error(error);
          await writeLog({ dataId: uid, action: "URLコピー", status: "error", errorDetail: { message: (error as Error).message } });
        });
    }
  };

  const handleRefresh = () => {
    showSpinner();
    router.refresh();
    setTimeout(() => {
      hideSpinner();
    }, 800);
  };

  return (
    <>
      <header className="site-header">
        <div className="header-left">
          <div className="logo-text" onClick={() => {
            if (pathname !== "/home") showSpinner();
            router.push("/home");
          }}>
            <span className="c">C</span>
            <span className="a">A</span>
            <span className="n">N</span>
            <span className="d">D</span>
            <span className="y">Y</span>
          </div>
        </div>

        <div className="header-right">
          <button className="header-btn" onClick={handleRefresh}>
            <i className="fa-solid fa-rotate"></i>
          </button>
          <button className="header-btn" onClick={handleShare}>
            <i className="fa-solid fa-share-nodes"></i>
          </button>
          {user && (
            <img
              className="line-icon"
              src={pictureUrl}
              alt="User Icon"
              onClick={toggleMenu}
            />
          )}
        </div>
      </header>

      {/* Breadcrumbs */}
      {items.length > 0 && pathname !== "/home" && (
        <>
          <div className="breadcrumb-container">
            <div className="breadcrumb-list">
              <Link href="/home" className="breadcrumb-item">
                <i className="fa-solid fa-house"></i>
              </Link>
              {items.map((item, index) => (
                <React.Fragment key={index}>
                  <span className="breadcrumb-separator">/</span>
                  {item.href ? (
                    <Link href={item.href} className="breadcrumb-item">
                      {item.title}
                    </Link>
                  ) : (
                    <span className="breadcrumb-item active">{item.title}</span>
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
          {/* パンくずリストが固定表示のため、後ろのコンテンツが被らないようにスペーサーを入れる */}
          <div style={{ height: "45px" }}></div>
        </>
      )}

      {/* Slide Menu */}
      <div className={`menu-overlay ${isMenuOpen ? "show" : ""}`} onClick={closeMenu}></div>
      <div className={`slide-menu ${isMenuOpen ? "open" : ""}`}>
        <div className="menu-header">
          <img className="menu-user-icon" src={pictureUrl} alt="Profile" />
          <div className="menu-user-info">
            <div className="menu-user-name">{displayName}</div>
            <div className="logout-button-small" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> ログアウト
            </div>
          </div>
          <div className="close-menu" onClick={closeMenu}>
            <i className="fa-solid fa-xmark"></i>
          </div>
        </div>

        <div className="slide-menu-section">
          <Link href="/home" onClick={closeMenu}>
            <i className="fa-solid fa-house"></i> Home
          </Link>
          <Link href="/todo" onClick={closeMenu}>
            <i className="fa-solid fa-list-check"></i> TODO
          </Link>
          <Link href="/wishlist" onClick={closeMenu}>
            <i className="fa-solid fa-gift"></i> Wishlist
          </Link>
        </div>
      </div>

      <style jsx>{`
        .site-header {
          position: fixed;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          z-index: 1000;
          width: 100%;
          max-width: 768px;
          padding: 10px 20px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background-color: white;
          border-bottom: 2px solid #f3e5f5;
          box-sizing: border-box;
        }

        .logo-text {
          font-size: 24px;
          font-weight: 900;
          cursor: pointer;
          letter-spacing: 2px;
        }

        .logo-text span {
          display: inline-block;
        }
        .c { color: #9B7CC3; }
        .a { color: #F7A8C4; }
        .n { color: #A0E7D2; }
        .d { color: #A0E7D2; }
        .y { color: #9B7CC3; }

        .header-right {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-btn {
          background: none;
          border: none;
          color: #9B7CC3;
          font-size: 20px;
          cursor: pointer;
          padding: 5px;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s;
        }

        .header-btn:active {
          transform: scale(0.9);
        }

        .header-right .line-icon {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          object-fit: cover;
          border: 2px solid #A0E7D2;
          cursor: pointer;
        }

        .breadcrumb-container {
          position: fixed;
          top: 60px;
          left: 50%;
          transform: translateX(-50%);
          width: 100%;
          max-width: 768px;
          background: rgba(255, 255, 255, 0.95);
          padding: 8px 20px;
          z-index: 900;
          border-bottom: 1px solid #f3e5f5;
          box-sizing: border-box;
          backdrop-filter: blur(4px);
        }

        .breadcrumb-list {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #888;
          overflow-x: auto;
          white-space: nowrap;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .breadcrumb-list::-webkit-scrollbar { display: none; }

        .breadcrumb-item {
          color: #9B7CC3;
          text-decoration: none;
          display: flex;
          align-items: center;
        }
        .breadcrumb-item.active {
          color: #888;
          font-weight: normal;
        }
        .breadcrumb-separator {
          color: #ddd;
          font-size: 10px;
        }

        .menu-overlay {
          position: fixed;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: rgba(0,0,0,0.3);
          z-index: 1100;
          display: none;
        }
        .menu-overlay.show { display: block; }

        .slide-menu {
          position: fixed;
          top: 0; right: -80%;
          width: 80%;
          max-width: 300px;
          height: 100%;
          background: white;
          z-index: 1200;
          transition: right 0.3s ease;
          padding: 20px;
          box-shadow: -5px 0 15px rgba(0,0,0,0.1);
        }
        .slide-menu.open { right: 0; }

        .menu-header {
          display: flex;
          align-items: center;
          gap: 15px;
          margin-bottom: 30px;
          position: relative;
        }

        .menu-user-icon {
          width: 50px; height: 50px;
          border-radius: 50%;
          border: 2px solid #F7A8C4;
        }

        .menu-user-name {
          font-weight: bold;
          color: #9B7CC3;
          font-size: 18px;
        }

        .logout-button-small {
          font-size: 12px;
          color: #888;
          margin-top: 5px;
          cursor: pointer;
        }

        .close-menu {
          position: absolute;
          top: 0; right: 0;
          font-size: 24px;
          color: #ccc;
          cursor: pointer;
        }

        .slide-menu-section {
          display: grid;
          grid-template-columns: 1fr;
          gap: 15px;
        }

        .slide-menu-section :global(a) {
          display: flex;
          align-items: center;
          gap: 15px;
          padding: 15px;
          background: #fdf2f8;
          border-radius: 15px;
          text-decoration: none;
          color: #444;
          font-weight: bold;
          transition: background 0.2s;
        }

        .slide-menu-section :global(a):hover {
          background: #fce4ec;
        }

        .slide-menu-section i {
          color: #9B7CC3;
          font-size: 20px;
        }
      `}</style>
    </>
  );
}
