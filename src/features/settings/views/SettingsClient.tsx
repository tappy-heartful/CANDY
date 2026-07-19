"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import BackToHome from "@/src/components/Common/BackToHome";
import { getNotificationSetting, saveNotificationSetting } from "@/src/features/settings/api/settings-client-service";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { useRouter } from "next/navigation";
import styles from "./SettingsClient.module.css";

export default function SettingsClient() {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();

  const [partnerNickname, setPartnerNickname] = useState("パートナー");
  const [formData, setFormData] = useState<{
    morningEnabled: boolean;
    morningTime: string;
    eventReminderEnabled: boolean;
    eventReminderMinutes: number[];
    dailyStatusEnabled: boolean;
    dailyStatusCommentEnabled: boolean;
  }>({
    morningEnabled: true,
    morningTime: "08:00",
    eventReminderEnabled: true,
    eventReminderMinutes: [10],
    dailyStatusEnabled: true,
    dailyStatusCommentEnabled: true,
  });

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setBreadcrumbs([{ title: "通知設定" }]);
  }, [setBreadcrumbs]);

  useEffect(() => {
    async function loadSettings() {
      if (!user) return;
      try {
        showSpinner();
        const [settings, partner] = await Promise.all([
          getNotificationSetting(user.uid),
          getPartnerData(user.uid)
        ]);
        if (partner?.nickname) {
          setPartnerNickname(partner.nickname);
        }
        let minutes: number[] = [10];
        if (settings.eventReminderMinutes !== undefined) {
          if (Array.isArray(settings.eventReminderMinutes)) {
            minutes = settings.eventReminderMinutes;
          } else {
            minutes = [Number(settings.eventReminderMinutes)];
          }
        }
        setFormData({
          morningEnabled: settings.morningEnabled,
          morningTime: settings.morningTime,
          eventReminderEnabled: settings.eventReminderEnabled,
          eventReminderMinutes: minutes,
          dailyStatusEnabled: settings.dailyStatusEnabled !== false,
          dailyStatusCommentEnabled: settings.dailyStatusCommentEnabled !== false,
        });
      } catch (e) {
        console.error("Failed to load notification settings:", e);
        showDialog("設定の読み込みに失敗しました。");
      } finally {
        setIsLoading(false);
        hideSpinner();
      }
    }
    loadSettings();
  }, [user]);

  const handleToggleChange = (name: "morningEnabled" | "eventReminderEnabled" | "dailyStatusEnabled" | "dailyStatusCommentEnabled") => {
    setFormData(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleReminderChange = (index: number, value: string) => {
    const num = parseInt(value, 10);
    setFormData(prev => {
      const newList = [...prev.eventReminderMinutes];
      newList[index] = isNaN(num) ? 0 : num;
      return { ...prev, eventReminderMinutes: newList };
    });
  };

  const handleAddReminder = () => {
    setFormData(prev => ({
      ...prev,
      eventReminderMinutes: [...prev.eventReminderMinutes, 10]
    }));
  };

  const handleRemoveReminder = (index: number) => {
    setFormData(prev => {
      const newList = prev.eventReminderMinutes.filter((_, i) => i !== index);
      return { ...prev, eventReminderMinutes: newList };
    });
  };

  const handleSave = async () => {
    if (!user) return;

    // バリデーション
    if (formData.morningEnabled && !formData.morningTime) {
      showDialog("朝のメッセージ通知時間を入力してください。", true);
      return;
    }

    if (formData.eventReminderEnabled) {
      if (formData.eventReminderMinutes.length === 0) {
        showDialog("イベント前通知のリマインダーを少なくとも1つ設定してください。", true);
        return;
      }
      for (const m of formData.eventReminderMinutes) {
        if (m < 0 || m > 60) {
          showDialog("イベント前通知は0分から60分の間で指定してください。", true);
          return;
        }
      }
    }

    try {
      showSpinner();
      await saveNotificationSetting(user.uid, formData);
      hideSpinner();
      await showDialog("通知設定を保存しました！", true);
      router.push("/home");
      router.refresh();
    } catch (e) {
      console.error("Failed to save settings:", e);
      hideSpinner();
      showDialog("設定の保存に失敗しました。");
    }
  };

  if (isLoading) {
    return <div className="page-container" />;
  }

  return (
    <div className="page-container">
      <div className="card-title-main">
        <i className="fa-solid fa-bell"></i> 通知設定
      </div>

      <div className={styles.editCard}>
        {/* 朝のメッセージ通知セクション */}
        <div className={styles.sectionTitle}>
          <i className="fa-solid fa-mug-hot"></i> 朝のメッセージ通知
        </div>

        <div className={styles.switchContainer}>
          <span className={styles.switchLabel}>朝の定期通知を送る</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={formData.morningEnabled}
              onChange={() => handleToggleChange("morningEnabled")}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>通知する時間</label>
          <input
            type="time"
            name="morningTime"
            className={styles.appInput}
            value={formData.morningTime}
            onChange={handleInputChange}
            disabled={!formData.morningEnabled}
          />
        </div>

        {/* イベント前通知セクション */}
        <div className={styles.sectionTitle}>
          <i className="fa-solid fa-clock"></i> イベント前通知 (リマインダー)
        </div>

        <div className={styles.switchContainer}>
          <span className={styles.switchLabel}>イベント前に通知する</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={formData.eventReminderEnabled}
              onChange={() => handleToggleChange("eventReminderEnabled")}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.inputLabel}>リマインダー (0〜60分前)</label>
          <div className={styles.reminderList}>
            {formData.eventReminderMinutes.map((minutes, index) => (
              <div key={index} className={styles.reminderItem}>
                <input
                  type="number"
                  className={styles.appInput}
                  min="0"
                  max="60"
                  placeholder="例: 10"
                  value={minutes ?? ""}
                  onChange={(e) => handleReminderChange(index, e.target.value)}
                  disabled={!formData.eventReminderEnabled}
                  style={{ flex: 1 }}
                />
                <span className={styles.reminderSuffix}>分前</span>
                <button
                  type="button"
                  className={styles.removeReminderBtn}
                  onClick={() => handleRemoveReminder(index)}
                  disabled={!formData.eventReminderEnabled}
                  title="削除"
                >
                  <i className="fa-solid fa-trash-can"></i>
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            className={styles.addReminderBtn}
            onClick={handleAddReminder}
            disabled={!formData.eventReminderEnabled}
          >
            <i className="fa-solid fa-plus"></i> リマインダーを追加
          </button>
        </div>

        {/* 今日のひとこと通知セクション */}
        <div className={styles.sectionTitle}>
          <i className="fa-solid fa-pen-nib"></i> 今日のひとこと通知
        </div>

        <div className={styles.switchContainer}>
          <span className={styles.switchLabel}>{partnerNickname}の一言の通知を受け取る</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={formData.dailyStatusEnabled}
              onChange={() => handleToggleChange("dailyStatusEnabled")}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.switchContainer}>
          <span className={styles.switchLabel}>{partnerNickname}のコメントの通知を受け取る</span>
          <label className={styles.switch}>
            <input
              type="checkbox"
              checked={formData.dailyStatusCommentEnabled}
              onChange={() => handleToggleChange("dailyStatusCommentEnabled")}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <button className={styles.saveBtn} onClick={handleSave}>
          設定を保存する
        </button>

        <p className={styles.note}>
          ※LINE公式アカウントから通知が届きます。
        </p>
      </div>

      <BackToHome />
    </div>
  );
}
