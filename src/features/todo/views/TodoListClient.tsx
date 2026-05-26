"use client";

import { useEffect, useMemo, useState } from "react";
import { Group, Todo, TodoStep, User as FirestoreUser } from "@/src/lib/firestore/types";
import { addTodo, addTodoStep, addGroup, toggleTodoStep, updateTodo } from "@/src/features/todo/api/todo-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import styles from "./TodoList.module.css";

interface TodoListClientProps {
  initialTodos: Todo[];
  initialGroups: Group[];
}

export default function TodoListClient({ initialTodos, initialGroups }: TodoListClientProps) {
  const { user, userData } = useAuth();
  const [todos, setTodos] = useState(initialTodos);
  const [groups, setGroups] = useState(initialGroups);
  const [filterState, setFilterState] = useState({
    couple: true,
    me: true,
    partner: false,
  });
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [newTodoDateMode, setNewTodoDateMode] = useState<"due" | "on">("due");
  const [newTodoDate, setNewTodoDate] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || "");
  const [stepInputs, setStepInputs] = useState<Record<string, string>>({});
  const [partnerData, setPartnerData] = useState<FirestoreUser | null>(null);

  useEffect(() => {
    if (!user) return;
    getPartnerData(user.uid).then((p) => setPartnerData(p));
  }, [user]);

  const handleToggleComplete = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, { isCompleted: !todo.isCompleted });
      setTodos(todos.map(t => t.id === todo.id ? { ...t, isCompleted: !t.isCompleted } : t));
    } catch (e) {
      showDialog("更新に失敗しました");
    }
  };

  const handleTodoDateChange = async (todoId: string, value: string) => {
    try {
      await updateTodo(todoId, { date: value || "" });
      setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, date: value || "" } : t)));
    } catch (e) {
      showDialog("更新に失敗しました");
    }
  };

  const handleTodoDateModeChange = async (todoId: string, value: "due" | "on") => {
    try {
      await updateTodo(todoId, { dateMode: value });
      setTodos((prev) => prev.map((t) => (t.id === todoId ? { ...t, dateMode: value } : t)));
    } catch (e) {
      showDialog("更新に失敗しました");
    }
  };

  const handleAddTodo = async (type: "personal" | "couple") => {
    if (!newTodoTitle || !user) return;
    showSpinner();
    try {
      await addTodo({
        title: newTodoTitle,
        type,
        uid: user.uid,
        groupId: selectedGroupId,
        showToPartner: type === "couple",
        dateMode: newTodoDateMode,
        date: newTodoDate || "",
      });
      window.location.reload();
    } catch (e) {
      showDialog("追加に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleAddStep = async (todoId: string) => {
    const title = stepInputs[todoId] || "";
    if (!title.trim()) {
      showDialog("ステップの内容を入力してください", true);
      return;
    }
    showSpinner();
    try {
      const newStep = await addTodoStep(todoId, title);
      setStepInputs((prev) => ({ ...prev, [todoId]: "" }));
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId
            ? {
                ...t,
                steps: newStep ? [...(t.steps || []), newStep] : t.steps,
              }
            : t,
        ),
      );
    } catch (e) {
      showDialog("追加に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleToggleStep = async (todoId: string, step: TodoStep) => {
    showSpinner();
    try {
      await toggleTodoStep(todoId, step.id);
      setTodos((prev) =>
        prev.map((t) =>
          t.id === todoId
            ? {
                ...t,
                steps: (t.steps || []).map((s) => (s.id === step.id ? { ...s, isCompleted: !s.isCompleted, updatedAt: Date.now() } : s)),
              }
            : t,
        ),
      );
    } catch (e) {
      showDialog("更新に失敗しました");
    } finally {
      hideSpinner();
    }
  };

  const handleAddGroup = async () => {
    const name = await showDialog("新しいグループ名を入力してください", false, true) as string;
    if (!name || !user) return;
    try {
      await addGroup(name, "todo", user.uid);
      window.location.reload();
    } catch (e) {
      showDialog("グループ追加に失敗しました");
    }
  };

  const visibleTodos = useMemo(() => {
    if (!user) return [];
    return todos.filter((t) => {
      if (t.type === "couple") return filterState.couple;
      const isMe = t.uid === user.uid;
      if (isMe) return filterState.me;
      return filterState.partner;
    });
  }, [todos, filterState, user]);

  const groupNameById = useMemo(() => {
    const map = new Map<string, string>();
    groups.forEach((g) => map.set(g.id, g.name));
    map.set("", "未分類");
    return map;
  }, [groups]);

  const groupOrder = useMemo(() => {
    return [...groups.map((g) => g.id), ""];
  }, [groups]);

  const myLabel = userData?.nickname || "自分";
  const partnerLabel = partnerData?.nickname || "相手";

  const toggleFilter = (key: "couple" | "me" | "partner") => {
    setFilterState((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (!next.couple && !next.me && !next.partner) {
        showDialog("いずれかを選択してください", true);
        return prev;
      }
      return next;
    });
  };

  const renderTodoList = (list: Todo[]) => {
    const hasAny = list.length > 0;
    if (!hasAny) {
      return <div style={{ textAlign: "center", color: "#ccc", padding: "20px" }}>TODOはありません</div>;
    }

    const byGroup: Record<string, Todo[]> = {};
    list.forEach((t) => {
      const key = t.groupId || "";
      if (!byGroup[key]) byGroup[key] = [];
      byGroup[key].push(t);
    });

    return (
      <div className="grouped-list">
        {groupOrder.map((groupId) => {
          const groupTodos = byGroup[groupId] || [];
          if (groupTodos.length === 0) return null;
          return (
            <div key={groupId} className={styles.groupBlock}>
              <div className={styles.groupTitle}>{groupNameById.get(groupId) || "未分類"}</div>
              <div className={styles.todoList}>
                {groupTodos.map((todo) => (
                  <div key={todo.id} className={`${styles.todoItem} ${todo.isCompleted ? styles.completed : ""}`}>
                    <div className={styles.todoTop}>
                      <input
                        type="checkbox"
                        className={styles.todoCheckbox}
                        checked={todo.isCompleted}
                        onChange={() => handleToggleComplete(todo)}
                      />
                      <div className={styles.todoInfo}>
                        <div className={styles.todoTitle}>
                          <span
                            className={`${styles.badge} ${
                              todo.type === "couple"
                                ? styles.badgeCouple
                                : todo.uid === user?.uid
                                  ? styles.badgeMe
                                  : styles.badgePartner
                            }`}
                          >
                            {todo.type === "couple" ? "2人" : todo.uid === user?.uid ? myLabel : partnerLabel}
                          </span>
                          {todo.title}
                        </div>
                        <div className={styles.todoMeta}>
                          <div className={styles.dateRow}>
                            <select
                              className={styles.dateModeSelect}
                              value={todo.dateMode || "due"}
                              onChange={(e) => handleTodoDateModeChange(todo.id, e.target.value as "due" | "on")}
                            >
                              <option value="due">期限</option>
                              <option value="on">日付</option>
                            </select>
                            <input
                              type="date"
                              className={styles.dateInput}
                              value={todo.date || ""}
                              onChange={(e) => handleTodoDateChange(todo.id, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.steps}>
                      {(todo.steps || []).length > 0 && (
                        <div className={styles.stepsList}>
                          {(todo.steps || []).map((step) => (
                            <div key={step.id} className={`${styles.stepItem} ${step.isCompleted ? styles.completed : ""}`}>
                              <input
                                type="checkbox"
                                className={styles.stepCheckbox}
                                checked={step.isCompleted}
                                onChange={() => handleToggleStep(todo.id, step)}
                              />
                              <span className={styles.stepTitle}>{step.title}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={styles.stepAdd}>
                        <input
                          type="text"
                          className={styles.stepInput}
                          placeholder="例: お店に電話する"
                          value={stepInputs[todo.id] || ""}
                          onChange={(e) => setStepInputs((prev) => ({ ...prev, [todo.id]: e.target.value }))}
                        />
                        <button className={styles.stepAddBtn} onClick={() => handleAddStep(todo.id)}>
                          + ステップ追加
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="page-container">

      <div className={styles.todoHeader}>
        <div className="card-title-main"><i className="fa-solid fa-list-check"></i> TODO List</div>
        <button onClick={handleAddGroup} className={styles.addGroupBtn}>+ グループ追加</button>
      </div>

      <div className={styles.inputSection}>
        <input
          type="text"
          className={styles.todoInput}
          placeholder="例: 週末の買い物に行く"
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
        />
        <div className={styles.dateRow}>
          <select
            className={styles.dateModeSelect}
            value={newTodoDateMode}
            onChange={(e) => setNewTodoDateMode(e.target.value as "due" | "on")}
          >
            <option value="due">期限</option>
            <option value="on">日付</option>
          </select>
          <input
            type="date"
            className={styles.dateInput}
            value={newTodoDate}
            onChange={(e) => setNewTodoDate(e.target.value)}
          />
        </div>
        <select
          className={styles.groupSelect}
          value={selectedGroupId}
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">グループを選択</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className={styles.btnGroup}>
          <button className={`${styles.btnAdd} ${styles.btnPersonal}`} onClick={() => handleAddTodo("personal")}>自分のTODO</button>
          <button className={`${styles.btnAdd} ${styles.btnCouple}`} onClick={() => handleAddTodo("couple")}>2人のTODO</button>
        </div>
      </div>

      <div className={styles.filterTabs}>
        <button
          className={`${styles.tab} ${filterState.couple ? styles.active : ""}`}
          onClick={() => toggleFilter("couple")}
        >
          2人
        </button>
        <button
          className={`${styles.tab} ${filterState.me ? styles.active : ""}`}
          onClick={() => toggleFilter("me")}
        >
          {myLabel}
        </button>
        <button
          className={`${styles.tab} ${filterState.partner ? styles.active : ""}`}
          onClick={() => toggleFilter("partner")}
        >
          {partnerLabel}
        </button>
      </div>

      <div className="content-card">
        <div className="card-title-main"><i className="fa-solid fa-hourglass-half"></i> 未完了</div>
        {renderTodoList(visibleTodos.filter((t) => !t.isCompleted))}
      </div>

      <div className="content-card">
        <div className="card-title-main"><i className="fa-solid fa-check"></i> 完了</div>
        {renderTodoList(visibleTodos.filter((t) => t.isCompleted))}
      </div>
    </div>
  );
}
