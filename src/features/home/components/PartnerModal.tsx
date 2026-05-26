import { User as FirestoreUser } from "@/src/lib/firestore/types";
import styles from "../views/Home.module.css";

interface PartnerModalProps {
  partnerData: FirestoreUser | null;
  onClose: () => void;
}

export default function PartnerModal({ partnerData, onClose }: PartnerModalProps) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.partnerModal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalClose} onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </div>

        <div className={styles.partnerProfileHeader}>
          <img src={partnerData?.pictureUrl || "/icon.png"} alt="Partner" className={styles.partnerProfileImg} />
          <div className={styles.partnerNickname}>{partnerData?.nickname || "パートナー"} のプロフィール</div>
        </div>

        <div className={styles.infoList}>
          <InfoItem label="MBTI" value={partnerData?.mbti} />
          <InfoItem label="誕生日" value={partnerData?.birthday} />
          <InfoItem label="電話番号" value={partnerData?.phone} />
          <InfoItem label="緊急連絡先" value={partnerData?.emergencyContact} />
          <InfoItem label="アレルギー" value={partnerData?.allergies} />
          <InfoItem label="服用中の薬" value={partnerData?.medications} />
          <InfoItem label="既往歴・持病" value={partnerData?.medicalHistory} />
          <InfoItem label="苦手な食べ物" value={partnerData?.dislikedFoods} />
          <InfoItem label="得意なこと" value={partnerData?.strengths} />
          <InfoItem label="苦手なこと" value={partnerData?.weaknesses} />
          <InfoItem label="好きな場所" value={partnerData?.favoritePlaces} />
          <InfoItem label="苦手な場所" value={partnerData?.dislikedPlaces} />
        </div>
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
