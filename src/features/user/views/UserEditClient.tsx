"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import BackToHome from "@/src/components/Common/BackToHome";
import { updateProfile } from "@/src/features/user/api/user-client-service";
import { showDialog, showSpinner, hideSpinner, setSession } from "@/src/lib/functions";
import { useRouter } from "next/navigation";
import styles from "./UserEdit.module.css";

export default function UserEditClient() {
  const { user, userData, refreshUserData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const [formData, setFormData] = useState({
    nickname: "",
    paypayId: "",
    mbti: "",
    birthday: "",
    phone: "",
    emergencyContact: "",
    allergies: "",
    medications: "",
    medicalHistory: "",
    dislikedFoods: "",
    favoriteFoods: "",
    happyThings: "",
    dislikedThings: "",
    strengths: "",
    weaknesses: "",
    favoritePlaces: "",
    dislikedPlaces: "",
  });

  useEffect(() => {
    setBreadcrumbs([{ title: "プロフィール編集" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    if (userData) {
      setFormData({
        nickname: userData.nickname || "",
        paypayId: userData.paypayId || "",
        mbti: userData.mbti || "",
        birthday: userData.birthday || "",
        phone: userData.phone || "",
        emergencyContact: userData.emergencyContact || "",
        allergies: userData.allergies || "",
        medications: userData.medications || "",
        medicalHistory: userData.medicalHistory || "",
        dislikedFoods: userData.dislikedFoods || "",
        favoriteFoods: userData.favoriteFoods || "",
        happyThings: userData.happyThings || "",
        dislikedThings: userData.dislikedThings || "",
        strengths: userData.strengths || "",
        weaknesses: userData.weaknesses || "",
        favoritePlaces: userData.favoritePlaces || "",
        dislikedPlaces: userData.dislikedPlaces || "",
      });
    }
  }, [userData]);

  const handleSave = async () => {
    const {
      nickname, paypayId, mbti, birthday, phone, emergencyContact,
      allergies, medications, medicalHistory, dislikedFoods,
      favoriteFoods, happyThings, dislikedThings
    } = formData;

    if (!nickname.trim()) {
      showDialog("ニックネームを入力してください", true);
      return;
    }
    if (!paypayId.trim()) {
      showDialog("PayPay IDを入力してください", true);
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
    if (!favoriteFoods.trim()) {
      showDialog("好きな食べ物を入力してください", true);
      return;
    }
    if (!happyThings.trim()) {
      showDialog("されてうれしいことを入力してください", true);
      return;
    }
    if (!dislikedThings.trim()) {
      showDialog("されて嫌なことを入力してください", true);
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
    } finally {
      hideSpinner();
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
      <div className="card-title-main"><i className="fa-solid fa-user-pen"></i> プロフィール編集</div>

      <div className={styles.editCard}>
        <div className={styles.userIconContainer}>
          <img src={userData?.pictureUrl || "/icon.png"} alt="User Profile" className={styles.userIcon} />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            ニックネーム
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <input
            type="text"
            name="nickname"
            className={styles.appInput}
            placeholder="例: たぴおか"
            value={formData.nickname}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            MBTI
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <select
            name="mbti"
            className={styles.appSelect}
            value={formData.mbti}
            onChange={handleChange}
          >
            <option value="">選択してください</option>
            {mbtiOptions.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            誕生日
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <input
            type="date"
            name="birthday"
            className={styles.appInput}
            value={formData.birthday}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            電話番号
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <input
            type="tel"
            name="phone"
            className={styles.appInput}
            placeholder="例: 090-0000-0000"
            value={formData.phone}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            PayPay ID
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <input
            type="text"
            name="paypayId"
            className={styles.appInput}
            placeholder="例: paypay_id_123"
            value={formData.paypayId}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            緊急連絡先 (氏名・続柄・電話番号)
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="emergencyContact"
            className={styles.appTextarea}
            placeholder="例: 山田太郎 (父) 090-1111-2222"
            value={formData.emergencyContact}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            アレルギーの有無 (食品、薬、花粉など)
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="allergies"
            className={styles.appTextarea}
            placeholder="例: エビ、カニ、スギ花粉"
            value={formData.allergies}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            服用中の薬
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="medications"
            className={styles.appTextarea}
            placeholder="例: 特になし、または薬名など"
            value={formData.medications}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            既往歴・持病
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="medicalHistory"
            className={styles.appTextarea}
            placeholder="例: 喘息、アトピーなど"
            value={formData.medicalHistory}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            好きな食べ物
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="favoriteFoods"
            className={styles.appTextarea}
            placeholder="例: お寿司、焼肉"
            value={formData.favoriteFoods}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            苦手な食べ物
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="dislikedFoods"
            className={styles.appTextarea}
            placeholder="例: パクチー、レバー"
            value={formData.dislikedFoods}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            されてうれしいこと
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="happyThings"
            className={styles.appTextarea}
            placeholder="例: 話をしっかり聞いてくれること"
            value={formData.happyThings}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>
            されて嫌なこと
            <span className={styles.requiredBadge}>必須</span>
          </label>
          <textarea
            name="dislikedThings"
            className={styles.appTextarea}
            placeholder="例: 無視されること、約束を破られること"
            value={formData.dislikedThings}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>得意なこと</label>
          <textarea
            name="strengths"
            className={styles.appTextarea}
            placeholder="例: 料理、段取り、聞き上手"
            value={formData.strengths}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>苦手なこと</label>
          <textarea
            name="weaknesses"
            className={styles.appTextarea}
            placeholder="例: 朝起きること、細かい作業"
            value={formData.weaknesses}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>好きな場所</label>
          <textarea
            name="favoritePlaces"
            className={styles.appTextarea}
            placeholder="例: 海、カフェ、温泉"
            value={formData.favoritePlaces}
            onChange={handleChange}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>苦手な場所</label>
          <textarea
            name="dislikedPlaces"
            className={styles.appTextarea}
            placeholder="例: 人混み、騒がしい場所"
            value={formData.dislikedPlaces}
            onChange={handleChange}
          />
        </div>

        <button className={styles.saveBtn} onClick={handleSave}>
          保存する
        </button>

        <p className={styles.note}>
          これらの情報は2人だけが確認できます。<br />
          お互いのことをより深く知って、もっと仲良くなろう！🍭
        </p>
      </div>

      <BackToHome />
    </div>
  );
}
