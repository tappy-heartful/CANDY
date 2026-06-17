"use client";

import { useEffect, useState } from "react";
import { Todo, Group } from "@/src/lib/firestore/types";
import { getGroups, addGroup } from "@/src/features/todo/api/todo-client-service";
import { showDialog } from "@/src/lib/functions";
import styles from "@/src/features/todo/views/TodoList.module.css";

interface TodoModalProps {
  date: string;
  currentUserId: string;
  myNickname?: string;
  partnerNickname?: string;
  onClose: () => void;
  onSave: (todosData: Partial<Todo>[]) => Promise<void>;
}

interface DateSetting {
  id: string;
  date: string;
  dateMode: "due" | "on";
}

export default function TodoModal({
  date,
  currentUserId,
  onClose,
  onSave,
}: TodoModalProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"personal" | "couple">("couple");
  const [groupId, setGroupId] = useState("");
  const [groups, setGroups] = useState<Group[]>([]);
  const [dateSettings, setDateSettings] = useState<DateSetting[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setDateSettings([
      { id: Math.random().toString(), date: date || "", dateMode: "due" }
    ]);
  }, [date]);

  const handleAddDateSetting = () => {
    setDateSettings((prev) => [
      ...prev,
      { id: Math.random().toString(), date: "", dateMode: "due" }
    ]);
  };

  const handleRemoveDateSetting = (id: string) => {
    setDateSettings((prev) => prev.filter((item) => item.id !== id));
  };

  const handleUpdateDateSetting = (id: string, field: "date" | "dateMode", value: any) => {
    setDateSettings((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  useEffect(() => {
    getGroups("todo")
      .then((data) => {
        setGroups(data);
        if (data.length > 0) {
          setGroupId(data[0].id);
        }
      })
      .catch((e) => console.error("Failed to load todo groups:", e));
  }, []);

  const handleCreateGroup = async () => {
    const name = prompt("新しいグループ名を入力してください");
    if (!name || !name.trim()) return;

    try {
      const docRef = await addGroup(name.trim(), "todo", currentUserId);
      const newGroup: Group = {
        id: docRef.id,
        name: name.trim(),
        type: "todo",
        uid: currentUserId,
        createdAt: Date.now(),
      };
      setGroups((prev) => [...prev, newGroup]);
      setGroupId(newGroup.id);
    } catch (e) {
      console.error("Failed to add group:", e);
      showDialog("グループの作成に失敗しました", true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      showDialog("タイトルを入力してください", true);
      return;
    }
    if (!groupId) {
      showDialog("グループを選択してください", true);
      return;
    }

    setIsSubmitting(true);
    try {
      const todosData: Partial<Todo>[] = dateSettings.map((setting) => ({
        title: title.trim(),
        type,
        dateMode: setting.dateMode,
        groupId,
        date: setting.date,
        uid: currentUserId,
      }));
      await onSave(todosData);
    } catch (e) {
      console.error("Failed to save todo:", e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} style={{ zIndex: 3000 }}>
      <div className={styles.todoModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalClose} onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </div>
        <div className={styles.modalHeader}>
          新しいTODO
        </div>
        <form onSubmit={handleSubmit} className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>タイトル</label>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="例: 週末の買い物に行く"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>グループ</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <select
                className={styles.modalSelect}
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                style={{ flex: 1 }}
                required
              >
                <option value="">グループを選択</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              <button type="button" className={styles.addGroupBtn} onClick={handleCreateGroup}>
                + 追加
              </button>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>共有設定</label>
            <div className={styles.radioGroup}>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="todoType"
                  value="personal"
                  checked={type === "personal"}
                  onChange={() => setType("personal")}
                />
                自分のTODO
              </label>
              <label className={styles.radioLabel}>
                <input
                  type="radio"
                  name="todoType"
                  value="couple"
                  checked={type === "couple"}
                  onChange={() => setType("couple")}
                />
                2人のTODO
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>日付 (オプション)</label>
            {dateSettings.map((setting) => (
              <div key={setting.id} className={styles.dateRowModal} style={{ marginBottom: '8px' }}>
                <input
                  type="date"
                  className={styles.modalInputDate}
                  value={setting.date}
                  onChange={(e) => handleUpdateDateSetting(setting.id, "date", e.target.value)}
                />
                <select
                  className={styles.modalSelectMode}
                  value={setting.dateMode}
                  onChange={(e) => handleUpdateDateSetting(setting.id, "dateMode", e.target.value as "due" | "on")}
                >
                  <option value="due">まで</option>
                  <option value="on">に</option>
                </select>
                {dateSettings.length > 1 && (
                  <button
                    type="button"
                    className={styles.removeDateBtn}
                    onClick={() => handleRemoveDateSetting(setting.id)}
                    title="削除"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                )}
              </div>
            ))}
            <div style={{ display: 'flex' }}>
              <button
                type="button"
                className={styles.addDateBtn}
                onClick={handleAddDateSetting}
              >
                <i className="fa-solid fa-plus"></i> 日付を追加
              </button>
            </div>
          </div>

          <div className={styles.modalFooter}>
            <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
              キャンセル
            </button>
            <button type="submit" className={styles.btnSave} disabled={isSubmitting}>
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

