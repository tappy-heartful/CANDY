'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from "@/src/contexts/AuthContext";
import { db } from "@/src/lib/firebase";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  showSpinner,
  hideSpinner,
  showDialog,
  writeLog,
  setSession,
  getSession
} from '@/src/lib/functions';
import styles from './agreement.module.css';

export default function AgreementPage() {
  const router = useRouter();
  const [isAgreed, setIsAgreed] = useState(false);
  const { user, loading, refreshUserData } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleAgree = async () => {
    if (!isAgreed || !user) return;

    showSpinner();
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        agreedAt: serverTimestamp(),
      });

      await refreshUserData();

      await writeLog({
        dataId: user.uid,
        action: '利用規約同意',
        status: 'success',
      });

      setSession("fromLogin", "true");
      const redirectPath = getSession("redirectAfterLogin") || "/home";
      router.push(redirectPath);

    } catch (e: unknown) {
      console.error("Agreement update error:", e);
      const message = e instanceof Error ? e.message : String(e);
      await writeLog({
        dataId: user?.uid || 'unknown',
        action: '利用規約同意失敗',
        status: 'error',
        errorDetail: { message },
      });
      await showDialog("同意処理の保存に失敗しました。通信環境を確認してください。", true);
    } finally {
      hideSpinner();
    }
  };

  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <div className={styles.agreementPage}>
      <div className={styles.container}>
        <header className={styles.header}>
          <div className={styles.icon}>🍬</div>
          <h1>CANDY ご利用規約</h1>
        </header>

        <main className={styles.main}>
          <section className={styles.section}>
            <p>
              「CANDY」へようこそ！<br />
              本アプリは、あなたの日常をより甘く、カラフルに彩るためのプライベートツールです。
              安心・安全にご利用いただくため、以下の内容をご確認ください。
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>🍭 取得する情報について</h2>
            <ul className={styles.list}>
              <li><strong>LINEプロフィール：</strong>表示名、アイコン画像、ユーザーID</li>
              <li><strong>利用状況：</strong>ログイン日時、操作ログ</li>
            </ul>
            <p className={styles.note}>
              ※ 取得した情報は、本アプリ内での本人確認およびサービス向上のみに使用され、第三者に公開されることはありません。
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>✨ 安全なご利用のために</h2>
            <ul className={styles.list}>
              <li>個人を特定しすぎる情報の入力はお控えください。</li>
              <li>他のユーザーが不快に思うような表現や行為は禁止です。</li>
              <li>不正なアクセスやシステムの改ざんを試みないでください。</li>
            </ul>
          </section>

          <div className={styles.checkboxWrapper}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
              />
              規約の内容を理解し、同意します
            </label>
          </div>

          <button
            className={`${styles.agreeBtn} ${isAgreed ? styles.active : ''}`}
            disabled={!isAgreed}
            onClick={handleAgree}
          >
            同意してはじめる
          </button>
        </main>

        <footer className={styles.footer}>
          <Link href="/login" className={styles.backLink}>ログインに戻る</Link>
        </footer>
      </div>
    </div>
  );
}
