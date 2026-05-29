import { useState, useEffect } from "react";
import { Anniversary } from "@/src/lib/firestore/types";
import styles from "./AnniversaryModal.module.css";
import { useAuth } from "@/src/contexts/AuthContext";

interface AnniversaryModalProps {
  anniversary: Anniversary | null;
  onClose: () => void;
  onSave: (data: { title: string; date: string }) => void;
  isSubmitting: boolean;
}

export default function AnniversaryModal({
  anniversary,
  onClose,
  onSave,
  isSubmitting,
}: AnniversaryModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [month, setMonth] = useState("1");
  const [day, setDay] = useState("1");

  useEffect(() => {
    if (anniversary && anniversary.date) {
      setTitle(anniversary.title);
      const [m, d] = anniversary.date.split("-");
      setMonth(parseInt(m, 10).toString());
      setDay(parseInt(d, 10).toString());
    } else {
      setTitle("");
      const today = new Date();
      setMonth((today.getMonth() + 1).toString());
      setDay(today.getDate().toString());
    }
  }, [anniversary]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");
    onSave({ title, date: `${mm}-${dd}` });
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2>{anniversary ? "記念日を編集" : "記念日を追加"}</h2>
          <button type="button" className={styles.closeBtn} onClick={onClose}><i className="fa-solid fa-xmark"></i></button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label>タイトル</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例: 誕生日"
              required
              className={styles.input}
            />
          </div>

          <div className={styles.formGroup}>
            <label>月日</label>
            <div className={styles.dateSelector}>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={styles.select}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>{m}月</option>
                ))}
              </select>
              <select value={day} onChange={(e) => setDay(e.target.value)} className={styles.select}>
                {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                  <option key={d} value={d}>{d}日</option>
                ))}
              </select>
            </div>
          </div>

          <button type="submit" disabled={isSubmitting || !title} className={styles.submitBtn}>
            {isSubmitting ? "保存中..." : "保存"}
          </button>
        </form>
      </div>
    </div>
  );
}
