"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { updateProfile } from "../api/user-client-service";
import { showDialog, showSpinner, hideSpinner, setSession } from "@/src/lib/functions";
import { useRouter } from "next/navigation";

export default function UserEditClient() {
  const { user, userData, refreshUserData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();
  const [nickname, setNickname] = useState("");

  useEffect(() => {
    setBreadcrumbs([{ title: "プロフィール編集" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (userData?.nickname) {
      setNickname(userData.nickname);
    }
  }, [userData]);

  const handleSave = async () => {
    if (!nickname.trim() || !user) {
      showDialog("ニックネームを入力してください", true);
      return;
    }

    showSpinner();
    try {
      await updateProfile(user.uid, { nickname: nickname.trim() });
      await refreshUserData();
      setSession("nickname", nickname.trim());
      hideSpinner(); // ダイアログを出す前にスピナーを消す
      await showDialog("プロフィールを更新しました！", true);
      router.push("/home");
    } catch (e) {
      console.error(e);
      hideSpinner(); // エラー時もスピナーを消す
      showDialog("更新に失敗しました");
    }
  };

  return (
    <div className="page-container">
      <style jsx>{`
        .edit-card {
          background: white;
          border-radius: 30px;
          padding: 30px;
          box-shadow: 0 10px 30px rgba(155, 124, 195, 0.1);
          border: 3px solid #f3e5f5;
          text-align: center;
        }
        .user-icon {
          width: 100px;
          height: 100px;
          border-radius: 50%;
          border: 4px solid #A0E7D2;
          margin-bottom: 20px;
          box-shadow: 0 4px 15px rgba(160, 231, 210, 0.3);
        }
        .input-label {
          display: block;
          text-align: left;
          font-weight: bold;
          color: #9B7CC3;
          margin-bottom: 8px;
          margin-left: 5px;
        }
        .nickname-input {
          width: 100%;
          padding: 15px;
          border-radius: 15px;
          border: 2px solid #F7A8C4;
          font-size: 16px;
          outline: none;
          margin-bottom: 30px;
          transition: border-color 0.2s;
        }
        .nickname-input:focus {
          border-color: #9B7CC3;
        }
        .save-btn {
          width: 100%;
          padding: 16px;
          border-radius: 30px;
          background-color: #F7A8C4;
          color: white;
          border: none;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 4px 15px rgba(247, 168, 196, 0.4);
        }
        .save-btn:hover {
          transform: translateY(-2px);
          background-color: #f896b8;
        }
        .save-btn:active {
          transform: translateY(0);
        }
        .note {
          margin-top: 20px;
          font-size: 13px;
          color: #888;
          line-height: 1.5;
        }
      `}</style>

      <div className="card-title-main"><span>👤</span> プロフィール編集</div>

      <div className="edit-card">
        <img src={userData?.pictureUrl || "/icon.png"} alt="User Profile" className="user-icon" />

        <div style={{ marginBottom: '20px' }}>
          <label className="input-label">ニックネーム</label>
          <input
            type="text"
            className="nickname-input"
            placeholder="例: たぴおか"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
          />
        </div>

        <button className="save-btn" onClick={handleSave}>
          保存する
        </button>

        <p className="note">
          ニックネームはアプリ内での表示に使用されます。<br />
          2人だけが見れる名前を設定してね！🍭
        </p>
      </div>
    </div>
  );
}
