import { User as FirestoreUser } from "@/src/lib/firestore/types";
import styles from "../views/Home.module.css";
import Link from "next/link";

interface ProfileModalProps {
  userData: FirestoreUser | null;
  title: string;
  isMe?: boolean;
  onClose: () => void;
}

export default function ProfileModal({ userData, title, isMe, onClose }: ProfileModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.partnerModal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalClose} onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        <div className={styles.partnerProfileHeader}>
          <img src={userData?.pictureUrl || "/icon.png"} alt="Profile" className={styles.partnerProfileImg} />
          <div className={styles.partnerNickname}>{userData?.nickname || "未設定"}{title}</div>
        </div>

        <div className={styles.infoList}>
          <InfoItem label="MBTI" value={userData?.mbti} />
          <InfoItem label="誕生日" value={userData?.birthday} />
          <InfoItem label="電話番号" value={userData?.phone} />
          <InfoItem label="緊急連絡先" value={userData?.emergencyContact} />
          <InfoItem label="アレルギー" value={userData?.allergies} />
          <InfoItem label="服用中の薬" value={userData?.medications} />
          <InfoItem label="既往歴・持病" value={userData?.medicalHistory} />
          <InfoItem label="好きな食べ物" value={userData?.favoriteFoods} />
          <InfoItem label="苦手な食べ物" value={userData?.dislikedFoods} />
          <InfoItem label="されてうれしいこと" value={userData?.happyThings} />
          <InfoItem label="されて嫌なこと" value={userData?.dislikedThings} />
          <InfoItem label="得意なこと" value={userData?.strengths} />
          <InfoItem label="苦手なこと" value={userData?.weaknesses} />
          <InfoItem label="好きな場所" value={userData?.favoritePlaces} />
          <InfoItem label="苦手な場所" value={userData?.dislikedPlaces} />
        </div>

        {isMe && (
          <div style={{ marginTop: "24px", textAlign: "center" }}>
            <Link href="/user/edit" className={styles.editProfileBtn}>
              <i className="fa-solid fa-pen"></i> 情報を編集する
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <div className={styles.infoValue}>{value || "未設定"}</div>
    </div>
  );
}
