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
          <button className={styles.headerBtn} onClick={handleRefresh}>
            <i className="fa-solid fa-rotate"></i>
          </button>
          <button className={styles.headerBtn} onClick={handleShare}>
            <i className="fa-solid fa-share-nodes"></i>
          </button>
          {user && (
            <img
              className={styles.lineIcon}
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
          <div className={styles.breadcrumbContainer}>
            <div className={styles.breadcrumbList}>
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
          <Link href="/home" onClick={closeMenu} className={styles.menuLink}>
            <i className={`fa-solid fa-house ${styles.menuIcon}`}></i> Home
          </Link>
          <Link href="/todo" onClick={closeMenu} className={styles.menuLink}>
            <i className={`fa-solid fa-list-check ${styles.menuIcon}`}></i> TODO
          </Link>
          <Link href="/wishlist" onClick={closeMenu} className={styles.menuLink}>
            <i className={`fa-solid fa-gift ${styles.menuIcon}`}></i> Wishlist
          </Link>
          <Link href="/status-history" onClick={closeMenu} className={styles.menuLink}>
            <i className={`fa-solid fa-clock-rotate-left ${styles.menuIcon}`}></i> 過去の私たち
          </Link>
          <Link href="/anniversaries" onClick={closeMenu} className={styles.menuLink}>
            <i className={`fa-solid fa-cake-candles ${styles.menuIcon}`}></i> 記念日
          </Link>
        </div>
      </div>
    </>
  );
}
