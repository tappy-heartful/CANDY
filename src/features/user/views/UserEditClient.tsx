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

  const [formData, setFormData] = useState({
    nickname: "",
    mbti: "",
    birthday: "",
    phone: "",
    emergencyContact: "",
    allergies: "",
    medications: "",
    medicalHistory: "",
    dislikedFoods: "",
  });

  useEffect(() => {
    setBreadcrumbs([{ title: "プロフィール編集" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (userData) {
      setFormData({
        nickname: userData.nickname || "",
        mbti: userData.mbti || "",
        birthday: userData.birthday || "",
        phone: userData.phone || "",
        emergencyContact: userData.emergencyContact || "",
        allergies: userData.allergies || "",
        medications: userData.medications || "",
        medicalHistory: userData.medicalHistory || "",
        dislikedFoods: userData.dislikedFoods || "",
      });
    }
  }, [userData]);

  const handleSave = async () => {
    const {
      nickname, mbti, birthday, phone, emergencyContact,
      allergies, medications, medicalHistory, dislikedFoods
    } = formData;

    if (!nickname.trim()) {
      showDialog("ニックネームを入力してください", true);
      return;
    }
    if (!mbti) {
      showDialog("MBTIを選択してください", true);
      return;
    }
    if (!birthday) {
      showDialog("誕生日を入力してください", true);
      return;
    }
    if (!phone.trim()) {
      showDialog("電話番号を入力してください", true);
      return;
    }
    if (!emergencyContact.trim()) {
      showDialog("緊急連絡先を入力してください", true);
      return;
    }
    if (!allergies.trim()) {
      showDialog("アレルギーの有無を入力してください", true);
      return;
    }
    if (!medications.trim()) {
      showDialog("服用中の薬を入力してください", true);
      return;
    }
    if (!medicalHistory.trim()) {
      showDialog("既往歴・持病を入力してください", true);
      return;
    }
    if (!dislikedFoods.trim()) {
      showDialog("苦手な食べ物を入力してください", true);
      return;
    }

    if (!user) return;

    showSpinner();
    try {
      await updateProfile(user.uid, formData);
      await refreshUserData();

      // セッションの更新
      Object.entries(formData).forEach(([key, value]) => {
        setSession(key, value);
      });

      hideSpinner();
      await showDialog("プロフィールを更新しました！", true);
      router.push("/home");
      router.refresh(); // 最新状態を反映
    } catch (e) {
      console.error(e);
      hideSpinner();
      showDialog("更新に失敗しました");
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const mbtiOptions = [
    "INTJ", "INTP", "ENTJ", "ENTP",
    "INFJ", "INFP", "ENFJ", "ENFP",
    "ISTJ", "ISFJ", "ESTJ", "ESFJ",
    "ISTP", "ISFP", "ESTP", "ESFP"
  ];

  return (
    <div className="page-container">
      <style jsx>{`
        .edit-card {
          background: white;
          border-radius: 30px;
          padding: 20px;
          box-shadow: 0 10px 30px rgba(155, 124, 195, 0.1);
          border: 3px solid #f3e5f5;
          margin-bottom: 20px;
        }
        .user-icon-container {
          text-align: center;
          margin-bottom: 20px;
        }
        .user-icon {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: 4px solid #A0E7D2;
          box-shadow: 0 4px 15px rgba(160, 231, 210, 0.3);
        }
        .form-group {
          margin-bottom: 20px;
        }
        .input-label {
          display: block;
          text-align: left;
          font-weight: bold;
          color: #9B7CC3;
          margin-bottom: 8px;
          margin-left: 5px;
          font-size: 14px;
        }
        .app-input, .app-select, .app-textarea {
          width: 100%;
          padding: 12px 15px;
          border-radius: 12px;
          border: 2px solid #F7A8C4;
          font-size: 16px;
          outline: none;
          transition: border-color 0.2s;
          background-color: #fff;
        }
        .app-input:focus, .app-select:focus, .app-textarea:focus {
          border-color: #9B7CC3;
        }
        .app-textarea {
          min-height: 80px;
          resize: vertical;
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
          margin-top: 10px;
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
          text-align: center;
        }
      `}</style>

      <div className="card-title-main"><span>👤</span> プロフィール編集</div>

      <div className="edit-card">
        <div className="user-icon-container">
          <img src={userData?.pictureUrl || "/icon.png"} alt="User Profile" className="user-icon" />
        </div>

        <div className="form-group">
          <label className="input-label">ニックネーム</label>
          <input
            type="text"
            name="nickname"
            className="app-input"
            placeholder="例: たぴおか"
            value={formData.nickname}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="input-label">MBTI</label>
          <select
            name="mbti"
            className="app-select"
            value={formData.mbti}
            onChange={handleChange}
          >
            <option value="">選択してください</option>
            {mbtiOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="input-label">誕生日</label>
          <input
            type="date"
            name="birthday"
            className="app-input"
            value={formData.birthday}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="input-label">電話番号</label>
          <input
            type="tel"
            name="phone"
            className="app-input"
            placeholder="例: 090-0000-0000"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="input-label">緊急連絡先 (氏名・続柄・電話番号)</label>
          <textarea
            name="emergencyContact"
            className="app-textarea"
            placeholder="例: 山田太郎 (父) 090-1111-2222"
            value={formData.emergencyContact}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="input-label">アレルギーの有無 (食品、薬、花粉など)</label>
          <textarea
            name="allergies"
            className="app-textarea"
            placeholder="例: エビ、カニ、スギ花粉"
            value={formData.allergies}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="input-label">服用中の薬</label>
          <textarea
            name="medications"
            className="app-textarea"
            placeholder="例: 特になし、または薬名など"
            value={formData.medications}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="input-label">既往歴・持病</label>
          <textarea
            name="medicalHistory"
            className="app-textarea"
            placeholder="例: 喘息、アトピーなど"
            value={formData.medicalHistory}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label className="input-label">苦手な食べ物</label>
          <textarea
            name="dislikedFoods"
            className="app-textarea"
            placeholder="例: パクチー、レバー"
            value={formData.dislikedFoods}
            onChange={handleChange}
          />
        </div>

        <button className="save-btn" onClick={handleSave}>
          保存する
        </button>

        <p className="note">
          これらの情報は2人だけが確認できます。<br />
          お互いのことをより深く知って、もっと仲良くなろう！🍭
        </p>
      </div>
    </div>
  );
}
