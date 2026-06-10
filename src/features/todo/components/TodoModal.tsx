import { useState, useEffect, useRef } from "react";
import { Group, Todo } from "@/src/lib/firestore/types";
import styles from "../views/TodoList.module.css";

interface TodoModalProps {
  isOpen: boolean;
  todo: Todo | null; // null if creating new
  groups: Group[];
  defaultDate?: string;
  onClose: () => void;
  onSave: (data: {
    title: string;
    groupId: string;
    type: "personal" | "couple";
    date: string;
    dateMode: "due" | "on";
  }) => Promise<void>;
  isSubmitting: boolean;
  onAddGroup?: () => void;
}

export default function TodoModal({ isOpen, todo, groups, defaultDate, onClose, onSave, isSubmitting, onAddGroup }: TodoModalProps) {
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const [type, setType] = useState<"personal" | "couple">("personal");
  const [date, setDate] = useState("");
  const [dateMode, setDateMode] = useState<"due" | "on">("due");

  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title);
        setGroupId(todo.groupId || "");
        setType(todo.type);
        setDate(todo.date || "");
        setDateMode(todo.dateMode || "due");
      } else {
        setTitle("");
        setGroupId(groups.length > 0 ? groups[0].id : "");
        setType("personal");
        setDate(defaultDate || "");
        setDateMode("due");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, todo, defaultDate]);

  const prevGroupsLength = useRef(groups.length);
  useEffect(() => {
    if (isOpen) {
      if (groups.length > 0 && !groupId) {
        setGroupId(groups[0].id);
      } else if (groups.length > prevGroupsLength.current) {
        const newGroup = groups[groups.length - 1];
        if (newGroup) {
          setGroupId(newGroup.id);
        }
      }
    }
    prevGroupsLength.current = groups.length;
  }, [groups, groupId, isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({ title, groupId, type, date, dateMode });
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.todoModal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalClose} onClick={onClose}>
          <i className="fa-solid fa-xmark"></i>
        </div>
        <div className={styles.modalHeader}>
          {todo ? "TODOを編集" : "新しいTODO"}
        </div>
        <div className={styles.modalBody}>
          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>タイトル</label>
            <input
              type="text"
              className={styles.modalInput}
              placeholder="例: 週末の買い物に行く"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
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
              >
                <option value="">グループを選択</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
              {onAddGroup && (
                <button type="button" className={styles.addGroupBtn} onClick={onAddGroup}>
                  + 追加
                </button>
              )}
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
                  disabled={todo !== null} // 既存のTODOのタイプ変更は防ぐ（権限周りが複雑になるため）
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
                  disabled={todo !== null}
                />
                2人のTODO
              </label>
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>日付 (オプション)</label>
            <div className={styles.dateRowModal}>
              <input
                type="date"
                className={styles.modalInputDate}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <select
                className={styles.modalSelectMode}
                value={dateMode}
                onChange={(e) => setDateMode(e.target.value as "due" | "on")}
              >
                <option value="on">に</option>
                <option value="due">まで</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.btnCancel} onClick={onClose} disabled={isSubmitting}>
            キャンセル
          </button>
          <button className={styles.btnSave} onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "保存する"}
          </button>
        </div>
      </div>
    </div>
  );
}
