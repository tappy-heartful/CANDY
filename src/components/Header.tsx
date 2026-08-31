"use client";

import { Fragment, useEffect, useState } from "react";
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
  errorLog,
} from "@/src/lib/functions";
import styles from "./Header.module.css";

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

  // bodyにpadding-topをつけるかどうかを制御
  useEffect(() => {
    const isNoHeaderPage = ["/login", "/callback", "/agreement"].includes(pathname);
    if (isNoHeaderPage) {
      document.body.classList.remove("with-fixed-header");
    } else {
      document.body.classList.add("with-fixed-header");
    }
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
      await errorLog("ログアウト", error, uid);
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
        await errorLog("シェア", error, uid);
      });
    } else {
      navigator.clipboard.writeText(url)
        .then(() => showDialog("URLをコピーしました", true))
        .catch(async (error) => {
          console.error(error);
          await errorLog("URLコピー", error, uid);
        });
    }
  };

  const handleRefresh = () => {
    showSpinner();
    window.location.reload();
  };

  return (
    <>
      <header className={styles.siteHeader}>
        <div>
          <div className={styles.logoText} onClick={() => {
            if (pathname !== "/home") showSpinner();
            router.push("/home");
          }}>
            <span className={styles.c}>C</span>
            <span className={styles.a}>A</span>
            <span className={styles.n}>N</span>
            <span className={styles.d}>D</span>
            <span className={styles.y}>Y</span>
          </div>
        </div>

        <div className={styles.headerRight}>
          {user && (
            <>
              <img
                className={styles.lineIcon}
                src={pictureUrl}
                alt="User Icon"
              />
              <button className={styles.hamburgerBtn} onClick={toggleMenu}>
                <i className="fa-solid fa-bars"></i>
              </button>
            </>
          )}
        </div>
      </header>

      {/* Breadcrumbs */}
      {(items.length > 0 || pathname === "/home") && (
        <>
          <div className={styles.breadcrumbContainer}>
            <div className={styles.breadcrumbList}>
              {pathname === "/home" ? (
                <span className={`${styles.breadcrumbItem} ${styles.breadcrumbItemActive}`}>
                  <i className={`fa-solid fa-house ${styles.homeIcon}`}></i>ホーム
                </span>
              ) : (
                <>
                  <Link href="/home" className={styles.breadcrumbItem}>
                    <i className={`fa-solid fa-house ${styles.homeIcon}`}></i>ホーム
                  </Link>
                  {items.map((item, index) => (
                    <Fragment key={index}>
                      <span className={styles.breadcrumbSeparator}>/</span>
                      {item.href ? (
                        <Link href={item.href} className={styles.breadcrumbItem}>
                          {item.title}
                        </Link>
                      ) : (
                        <span className={`${styles.breadcrumbItem} ${styles.breadcrumbItemActive}`}>{item.title}</span>
                      )}
                    </Fragment>
                  ))}
                </>
              )}
            </div>
            <div className={styles.breadcrumbRight}>
              <button className={styles.breadcrumbBtn} onClick={handleRefresh}>
                <i className="fa-solid fa-rotate"></i>
              </button>
              <button className={styles.breadcrumbBtn} onClick={handleShare}>
                <i className="fa-solid fa-share-nodes"></i>
              </button>
            </div>
          </div>
          <div className={styles.breadcrumbSpacer}></div>
        </>
      )}

      {/* Slide Menu */}
      <div className={`${styles.menuOverlay} ${isMenuOpen ? styles.menuOverlayShow : ""}`} onClick={closeMenu}></div>
      <div className={`${styles.slideMenu} ${isMenuOpen ? styles.slideMenuOpen : ""}`}>
        <div className={styles.menuHeader}>
          <img className={styles.menuUserIcon} src={pictureUrl} alt="Profile" />
          <div>
            <div className={styles.menuUserName}>{displayName}</div>
            <div className={styles.logoutButtonSmall} onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> ログアウト
            </div>
          </div>
          <div className={styles.closeMenu} onClick={closeMenu}>
            <i className="fa-solid fa-xmark"></i>
          </div>
        </div>

        <div className={styles.slideMenuSection}>
          {/* メイン機能 (強調表示) */}
          <div className={styles.mainMenuGrid}>
            <Link href="/home" onClick={closeMenu} className={`${styles.menuLinkMain} ${styles.menuLinkHome}`}>
              <i className={`fa-solid fa-house ${styles.menuIconMain}`}></i> Home
            </Link>
            <Link href="/todo" onClick={closeMenu} className={styles.menuLinkMain}>
              <i className={`fa-solid fa-list-check ${styles.menuIconMain}`}></i> TODO
            </Link>
            <Link href="/albums" onClick={closeMenu} className={styles.menuLinkMain}>
              <i className={`fa-solid fa-images ${styles.menuIconMain}`}></i> アルバム
            </Link>
            <Link href="/budget" onClick={closeMenu} className={styles.menuLinkMain}>
              <i className={`fa-solid fa-wallet ${styles.menuIconMain}`}></i> 家計簿
            </Link>
            <Link href="/memo" onClick={closeMenu} className={styles.menuLinkMain}>
              <i className={`fa-solid fa-note-sticky ${styles.menuIconMain}`}></i> メモ
            </Link>
          </div>

          {/* ディバイダー */}
          <div className={styles.menuDivider}>
            <span>その他の機能</span>
          </div>

          {/* サブ機能 (控えめ表示) */}
          <div className={styles.subMenuGrid}>
            <Link href="/wishlist" onClick={closeMenu} className={styles.menuLinkSub}>
              <i className={`fa-solid fa-gift ${styles.menuIconSub}`}></i> Wishlist
            </Link>
            <Link href="/status-history" onClick={closeMenu} className={styles.menuLinkSub}>
              <i className={`fa-solid fa-clock-rotate-left ${styles.menuIconSub}`}></i> 過去の私たち
            </Link>
            <Link href="/anniversaries" onClick={closeMenu} className={styles.menuLinkSub}>
              <i className={`fa-solid fa-cake-candles ${styles.menuIconSub}`}></i> 記念日
            </Link>
            <Link href="/investment" onClick={closeMenu} className={styles.menuLinkSub}>
              <i className={`fa-solid fa-chart-line ${styles.menuIconSub}`}></i> 投資
            </Link>
            <Link href="/settlement" onClick={closeMenu} className={styles.menuLinkSub}>
              <i className={`fa-solid fa-hand-holding-dollar ${styles.menuIconSub}`}></i> ワリカン
            </Link>
            <Link href="/ideal-property" onClick={closeMenu} className={styles.menuLinkSub}>
              <i className={`fa-solid fa-house-chimney-window ${styles.menuIconSub}`}></i> 理想の物件
            </Link>
            <Link href="/settings" onClick={closeMenu} className={styles.menuLinkSub}>
              <i className={`fa-solid fa-bell ${styles.menuIconSub}`}></i> 通知設定
            </Link>
          </div>
        </div>

      </div>
    </>
  );
}
