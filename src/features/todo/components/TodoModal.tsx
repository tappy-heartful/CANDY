import { useState, useEffect, useRef } from "react";
import { Group, Todo, TodoStep } from "@/src/lib/firestore/types";
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
    date?: string;
    dateMode?: "due" | "on";
    dates?: { date: string; dateMode: "due" | "on" }[];
    steps?: TodoStep[];
  }) => Promise<void>;
  isSubmitting: boolean;
  onAddGroup?: () => void;
}

interface DateSetting {
  id: string;
  date: string;
  dateMode: "due" | "on";
}

export default function TodoModal({ isOpen, todo, groups, defaultDate, onClose, onSave, isSubmitting, onAddGroup }: TodoModalProps) {
  const [title, setTitle] = useState("");
  const [groupId, setGroupId] = useState("");
  const [type, setType] = useState<"personal" | "couple">("personal");
  const [dateSettings, setDateSettings] = useState<DateSetting[]>([]);
  const [steps, setSteps] = useState<TodoStep[]>([]);

  useEffect(() => {
    if (isOpen) {
      if (todo) {
        setTitle(todo.title);
        setGroupId(todo.groupId || "");
        setType(todo.type);
        setDateSettings([
          { id: Math.random().toString(), date: todo.date || "", dateMode: todo.dateMode || "due" }
        ]);
        setSteps(todo.steps || []);
      } else {
        setTitle("");
        setGroupId(groups.length > 0 ? groups[0].id : "");
        setType("personal");
        setDateSettings([
          { id: Math.random().toString(), date: defaultDate || "", dateMode: "due" }
        ]);
        setSteps([]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, todo, defaultDate]);

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

  const handleAddStep = () => {
    const now = Date.now();
    const id = `new_${now}_${Math.random().toString(36).slice(2, 6)}`;
    setSteps((prev) => [
      ...prev,
      { id, title: "", isCompleted: false, createdAt: now, updatedAt: now }
    ]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateStepTitle = (id: string, newTitle: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, title: newTitle, updatedAt: Date.now() } : s))
    );
  };

  const handleToggleStepCompleted = (id: string) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isCompleted: !s.isCompleted, updatedAt: Date.now() } : s))
    );
  };

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
    const cleanSteps = steps.filter(s => s.title.trim() !== "");
    if (todo) {
      const firstSetting = dateSettings[0] || { date: "", dateMode: "due" };
      onSave({
        title,
        groupId,
        type,
        date: firstSetting.date,
        dateMode: firstSetting.dateMode as "due" | "on",
        steps: cleanSteps
      });
    } else {
      onSave({
        title,
        groupId,
        type,
        dates: dateSettings.map((s) => ({
          date: s.date,
          dateMode: s.dateMode as "due" | "on"
        })),
        steps: cleanSteps
      });
    }
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
                {todo === null && dateSettings.length > 1 && (
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
            {todo === null && (
              <div style={{ display: 'flex' }}>
                <button
                  type="button"
                  className={styles.addDateBtn}
                  onClick={handleAddDateSetting}
                >
                  <i className="fa-solid fa-plus"></i> 日付を追加
                </button>
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label className={styles.inputLabel}>ステップ (サブタスク)</label>
            <div className={styles.stepsListModal}>
              {steps.map((step) => (
                <div key={step.id} className={styles.stepItemModal}>
                  <input
                    type="checkbox"
                    checked={step.isCompleted}
                    onChange={() => handleToggleStepCompleted(step.id)}
                    className={styles.stepCheckbox}
                  />
                  <input
                    type="text"
                    value={step.title}
                    onChange={(e) => handleUpdateStepTitle(step.id, e.target.value)}
                    className={styles.stepInputModal}
                    placeholder="例: 牛乳を買う"
                  />
                  <button
                    type="button"
                    className={styles.deleteStepBtn}
                    onClick={() => handleRemoveStep(step.id)}
                    title="削除"
                  >
                    <i className="fa-solid fa-trash-can"></i>
                  </button>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex' }}>
              <button
                type="button"
                className={styles.addStepBtn}
                onClick={handleAddStep}
              >
                <i className="fa-solid fa-plus"></i> ステップを追加
              </button>
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
