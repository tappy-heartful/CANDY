"use client";

import { useEffect, useState } from "react";
import { getSession, removeSession } from "@/src/lib/functions";
import { usePathname } from "next/navigation";
import { useAuth } from "@/src/contexts/AuthContext";
import styles from "./Footer.module.css";

export default function Footer() {
  const pathname = usePathname();
  const { userData } = useAuth();

  const [showOverlay, setShowOverlay] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

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

  // メニューを表示しないページ
  if (["/login", "/callback", "/agreement"].includes(pathname)) return null;

  const manualClose = () => {
    setIsAnimating(false);
    setTimeout(() => setShowOverlay(false), 500);
  };

  return (
    <>
      <footer className={styles.siteFooter}>
        <div className={styles.copyright}>&copy; 2026 CANDY Project</div>
        <div className={styles.developedBy}>Made with 💖 for Two</div>
      </footer>

      {showOverlay && (
        <div
          className={`${styles.firstLoginOverlay} ${isAnimating ? styles.show : ""}`}
          onClick={manualClose}
        >
          <div className={styles.firstLoginContent}>
            <img className={styles.userIcon} src={pictureUrl} alt="User Icon" />
            <p className={styles.welcomeMessage}>
              おかえりなさい！<br />
              <span className={styles.welcomeName}>{displayName}</span>さん 🍬
            </p>
          </div>
        </div>
      )}
    </>
  );
}
