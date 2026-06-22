'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import * as utils from '@/src/lib/functions';
import styles from './login.module.css';
import { db, auth } from '@/src/lib/firebase';
import { doc, onSnapshot, getDoc, setDoc, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { signInWithCustomToken } from 'firebase/auth';

export default function LoginPage() {
  const router = useRouter();
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showPwaGuide, setShowPwaGuide] = useState(false);
  const [pwaSessionId, setPwaSessionId] = useState<string | null>(null);
  const [pwaLoginUrl, setPwaLoginUrl] = useState<string | null>(null);
  const isRedirectingRef = useRef(false);

  useEffect(() => {
    utils.clearAllAppSession();
    utils.removeSession("fromLogin");

    // PWA Standaloneモードの検知
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true;
    setIsStandalone(standalone);

    // URLパラメータから pwaSessionId を取得
    const params = new URLSearchParams(window.location.search);
    const urlSessionId = params.get('pwaSessionId');

    if (standalone) {
      // PWA Standaloneモードの場合
      // ランダムなセッションIDを生成 (UUIDライクな文字コード)
      const sessionId = 'pwa-' + Math.random().toString(36).substring(2, 15) + '-' + Date.now().toString(36);
      setPwaSessionId(sessionId);

      // LINEログインの認証URLを事前にサーバーから取得
      const fetchPwaLoginUrl = async () => {
        try {
          const res = await fetch(`/api/line/get-url?pwaSessionId=${sessionId}`);
          const { loginUrl } = await res.json();
          setPwaLoginUrl(loginUrl);
        } catch (err) {
          console.error('Failed to pre-fetch PWA login URL:', err);
        }
      };
      fetchPwaLoginUrl();

      // Firestore の監視
      const unsub = onSnapshot(doc(db, 'pwaAuthSessions', sessionId), async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.status === 'completed' && data.customToken) {
            unsub(); // 監視解除
            setIsLoggingIn(true);
            try {
              // Firebase サインイン
              const userCredential = await signInWithCustomToken(auth, data.customToken);
              const user = userCredential.user;

              // コールバックページと同様のセッション同期処理
              const userRef = doc(db, "users", user.uid);
              const snap = await getDoc(userRef);

              const userData = {
                displayName: data.profile?.displayName || '',
                pictureUrl: data.profile?.pictureUrl || '',
                lastLoginAt: serverTimestamp(),
                ...(snap.exists() ? {} : { createdAt: serverTimestamp() })
              };

              await setDoc(userRef, userData, { merge: true });

              const updatedSnap = await getDoc(userRef);
              const finalData = updatedSnap.data();

              if (finalData) {
                Object.entries(finalData).forEach(([key, value]) => {
                  utils.setSession(key, value);
                });
                utils.setSession("uid", user.uid);
              }

              // セッションドキュメントの削除
              await deleteDoc(doc(db, 'pwaAuthSessions', sessionId));

              const redirectAfterLogin = "/home";
              if (!finalData?.agreedAt) {
                utils.setSession("redirectAfterLogin", redirectAfterLogin);
                router.push("/agreement");
              } else {
                utils.setSession("fromLogin", "true");
                router.push(redirectAfterLogin);
              }
            } catch (err) {
              console.error(err);
              await utils.showDialog('ログインの同期に失敗しました。もう一度お試しください。', true);
              setIsLoggingIn(false);
            }
          }
        }
      });

      return () => {
        unsub();
      };
    } else if (urlSessionId && !isRedirectingRef.current) {
      // 外部ブラウザで pwaSessionId が渡されて開かれた場合、自動でLINEログインへ遷移
      isRedirectingRef.current = true;
      handleLogin(urlSessionId);
    }
  }, [router]);

  const handleLogin = async (sessionIdParam?: string | null) => {
    setIsLoggingIn(true);
    const sid = sessionIdParam || pwaSessionId;
    
    // PWA Standaloneかつ自動リダイレクトでない場合は、リンククリックで遷移するためここでは何もしない
    if (isStandalone && !sessionIdParam) {
      setIsLoggingIn(false);
      return;
    }

    try {
      let fetchUrl = '/api/line/get-url';
      if (sid) {
        fetchUrl += `?pwaSessionId=${sid}`;
      }
      const res = await fetch(fetchUrl);
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
          {showPwaGuide ? (
            <div className={styles.pwaGuideBox}>
              <p className={styles.pwaGuideText}>
                LINEログインのため外部ブラウザを起動しました。<br />
                ブラウザ側でログインを完了すると、自動的にこのアプリにログインされます。<br />
                ※ログイン完了までこの画面を閉じずにお待ちください。
              </p>
              <button
                className={styles.pwaCancelBtn}
                onClick={() => setShowPwaGuide(false)}
              >
                キャンセル
              </button>
            </div>
          ) : (
            <>
              {isStandalone ? (
                pwaLoginUrl ? (
                  <a
                    href={pwaLoginUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.loginBtn}
                    onClick={() => {
                      setShowPwaGuide(true);
                    }}
                  >
                    LINEでログイン
                  </a>
                ) : (
                  <button className={styles.loginBtn} disabled>
                    準備中...
                  </button>
                )
              ) : (
                <button
                  className={`${styles.loginBtn} ${isLoggingIn ? styles.loggingIn : ''}`}
                  onClick={() => handleLogin()}
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? '準備中...' : 'LINEでログイン'}
                </button>
              )}

              <a
                href="https://lin.ee/o8SSLxF"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.addFriendBtn}
              >
                公式LINEを友だち追加
              </a>
            </>
          )}
        </div>
      </div>

      {/* Decorative elements */}
      <div className={`${styles.bubble} ${styles.bubble1}`}></div>
      <div className={`${styles.bubble} ${styles.bubble2}`}></div>
      <div className={`${styles.bubble} ${styles.bubble3}`}></div>
    </div>
  );
}
