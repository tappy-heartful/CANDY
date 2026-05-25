'use client';

import { useState, useEffect } from 'react';
import * as utils from '@/src/lib/functions';
import styles from './login.module.css';

export default function LoginPage() {
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    utils.clearAllAppSession();
    utils.removeSession("fromLogin");
  }, []);

  const handleLogin = async () => {
    setIsLoggingIn(true);
    try {
      const res = await fetch('/api/line/get-url');
      const { loginUrl } = await res.json();
      window.location.href = loginUrl;
    } catch (err) {
      console.error(err);
      await utils.showDialog('ログインURL取得失敗', true);
      setIsLoggingIn(false);
    }
  };

  return (
    <div className={styles.loginPage}>
      <div className={styles.container}>
        <div className={styles.logoSection}>
          <div className={styles.candyIcon}>🍬</div>
          <h1 className={styles.title}>
            <span className={styles.c}>C</span>
            <span className={styles.a}>A</span>
            <span className={styles.n}>N</span>
            <span className={styles.d}>D</span>
            <span className={styles.y}>Y</span>
          </h1>
          <p className={styles.subtitle}>Sweet & Colorful Life</p>
        </div>

        <div className={styles.authSection}>
          <button
            className={`${styles.loginBtn} ${isLoggingIn ? styles.loggingIn : ''}`}
            onClick={handleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? '準備中...' : 'LINEでログイン'}
          </button>

          <a
            href="https://lin.ee/Z4gtFj6"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.addFriendBtn}
          >
            公式LINEを友だち追加
          </a>
        </div>
      </div>

      {/* Decorative elements */}
      <div className={`${styles.bubble} ${styles.bubble1}`}></div>
      <div className={`${styles.bubble} ${styles.bubble2}`}></div>
      <div className={`${styles.bubble} ${styles.bubble3}`}></div>
    </div>
  );
}
