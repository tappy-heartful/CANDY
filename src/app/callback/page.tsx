"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { auth, db } from "@/src/lib/firebase";
import { signInWithCustomToken } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { hideSpinner, setSession, showDialog, LOADING_MESSAGES } from "@/src/lib/functions";

function CallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasCalled = useRef(false);
  const [message, setMessage] = useState(LOADING_MESSAGES[0]);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 1500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const error = searchParams.get("error");

    if (error) {
      router.push("/login");
      return;
    }

    if (code && state && !hasCalled.current) {
      hasCalled.current = true;
      handleLogin(code, state);
    }
  }, [searchParams, router]);

  async function handleLogin(code: string, state: string) {
    try {
      const redirectUri = window.location.origin + window.location.pathname;

      const data = await fetch('/api/line/login', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, state, redirectUri }),
      });
      const result = await data.json();

      if (!data.ok) {
        if (result.error === 'NOT_FRIEND') {
          await showDialog("個別連絡のため、LINE公式アカウントを友だち追加してください。追加後に再度ログインをお願いします。", true);
          // 公式LINEのURLは後ほど修正が必要かもしれませんが、一旦そのまま
          window.open("https://lin.ee/Z4gtFj6", "_blank", "noopener,noreferrer");
          router.push("/login");
          return;
        }
        throw new Error(result.error);
      }

      const userCredential = await signInWithCustomToken(auth, result.customToken);
      const user = userCredential.user;

      const userRef = doc(db, "users", user.uid);
      const snap = await getDoc(userRef);

      const userData = {
        displayName: result.profile.displayName,
        pictureUrl: result.profile.pictureUrl,
        lastLoginAt: serverTimestamp(),
        ...(snap.exists() ? {} : { createdAt: serverTimestamp() })
      };

      await setDoc(userRef, userData, { merge: true });

      const updatedSnap = await getDoc(userRef);
      const finalData = updatedSnap.data();

      if (finalData) {
        Object.entries(finalData).forEach(([key, value]) => {
          setSession(key, value);
        });
        setSession("uid", user.uid);
      }

      const redirectAfterLogin = result.redirectAfterLogin || "/home";

      // 4. 規約同意チェック & リダイレクト
      if (!finalData?.agreedAt) {
        // 同意ページへ行く前に、本来行きたかった場所を覚えておく
        setSession("redirectAfterLogin", redirectAfterLogin);
        router.push("/agreement");
      } else {
        // ログイン成功フラグ（演出用）
        setSession("fromLogin", "true");
        router.push(redirectAfterLogin);
      }

    } catch (e) {
      console.error(e);
      await showDialog("ログインに失敗しました。通信環境を確認してください。", true);
      router.push("/login");
    } finally {
      hideSpinner();
    }
  }

  return (
    <div className="callback-loading">
      <style jsx>{`
        .callback-loading {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          background-color: #fff;
        }
        .candy-icon {
          font-size: 64px;
          color: #F7A8C4;
          margin-bottom: 24px;
          animation: bounce 1s infinite alternate;
        }
        @keyframes bounce {
          from { transform: translateY(0); }
          to { transform: translateY(-20px); }
        }
        .loading-message {
          font-size: 18px;
          color: #9B7CC3;
          font-weight: bold;
        }
      `}</style>
      <div className="candy-icon">🍬</div>
      <p className="loading-message">{message}</p>
    </div>
  );
}

export default function CallbackPage() {
  return (
    <Suspense fallback={<div className="loading-screen">読み込み中...</div>}>
      <CallbackContent />
    </Suspense>
  );
}
