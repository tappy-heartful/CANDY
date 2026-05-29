import Link from "next/link";
import styles from "./BackToHome.module.css";

export default function BackToHome() {
  return (
    <div className={styles.container}>
      <Link href="/home" className={styles.backBtn}>
        <i className="fa-solid fa-chevron-left"></i> ホームへ戻る
      </Link>
    </div>
  );
}
