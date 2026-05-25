"use client";

import { useState } from "react";
import { Todo, Group } from "@/src/lib/firestore/types";
import { updateTodo, deleteTodo, addTodo, addGroup } from "../api/todo-client-service";
import { useAuth } from "@/src/contexts/AuthContext";
import { showDialog, showSpinner, hideSpinner } from "@/src/lib/functions";

interface TodoListClientProps {
  initialTodos: Todo[];
  initialGroups: Group[];
}

export default function TodoListClient({ initialTodos, initialGroups }: TodoListClientProps) {
  const { user } = useAuth();
  const [todos, setTodos] = useState(initialTodos);
  const [groups, setGroups] = useState(initialGroups);
  const [filter, setFilter] = useState<"all" | "personal" | "couple">("all");
  const [newTodoTitle, setNewTodoTitle] = useState("");
  const [selectedGroupId, setSelectedGroupId] = useState(groups[0]?.id || "");

  const handleToggleComplete = async (todo: Todo) => {
    try {
      await updateTodo(todo.id, { isCompleted: !todo.isCompleted });
      setTodos(todos.map(t => t.id === todo.id ? { ...t, isCompleted: !t.isCompleted } : t));
    } catch (e) {
      showDialog("更新に失敗しました");
    }
  };

  const handleAddTodo = async (type: "personal" | "couple") => {
    if (!newTodoTitle || !user) return;
    showSpinner();
    try {
      const res = await addTodo({
        title: newTodoTitle,
        type,
        uid: user.uid,
        groupId: selectedGroupId,
        showToPartner: type === "couple", // デフォルト設定
      });
      // 簡易的に再取得せずに追加（本来はResからデータを構築するかrouter.refresh）
      window.location.reload(); 
    } catch (e) {
      showDialog("追加に失敗しました");
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

  return (
    <div className="todo-container">
      <style jsx>{`
        .todo-container { padding: 20px; max-width: 600px; margin: 0 auto; }
        .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .title { color: #9B7CC3; font-size: 24px; font-weight: bold; }
        .filter-tabs { display: flex; gap: 10px; margin-bottom: 20px; }
        .tab { padding: 8px 16px; border-radius: 20px; border: 2px solid #9B7CC3; background: none; color: #9B7CC3; cursor: pointer; }
        .tab.active { background: #9B7CC3; color: white; }
        .input-section { background: #fdf2f8; padding: 20px; border-radius: 20px; margin-bottom: 20px; border: 2px dashed #F7A8C4; }
        .todo-input { width: 100%; padding: 12px; border-radius: 10px; border: 2px solid #F7A8C4; margin-bottom: 10px; outline: none; }
        .group-select { width: 100%; padding: 8px; border-radius: 10px; border: 1px solid #ccc; margin-bottom: 10px; }
        .btn-group { display: flex; gap: 10px; }
        .btn-add { flex: 1; padding: 10px; border-radius: 15px; border: none; font-weight: bold; cursor: pointer; color: white; }
        .btn-personal { background: #F7A8C4; }
        .btn-couple { background: #A0E7D2; }
        .todo-list { display: flex; flex-direction: column; gap: 12px; }
        .todo-item { display: flex; align-items: center; background: white; padding: 15px; border-radius: 15px; box-shadow: 0 4px 10px rgba(0,0,0,0.05); border-left: 5px solid #9B7CC3; }
        .todo-item.completed { opacity: 0.6; text-decoration: line-through; }
        .todo-checkbox { width: 20px; height: 20px; margin-right: 15px; accent-color: #9B7CC3; cursor: pointer; }
        .todo-info { flex: 1; }
        .todo-title { font-weight: bold; color: #444; }
        .todo-meta { font-size: 12px; color: #888; margin-top: 4px; }
        .badge { padding: 2px 8px; border-radius: 10px; font-size: 10px; margin-right: 5px; color: white; }
        .badge-personal { background: #F7A8C4; }
        .badge-couple { background: #A0E7D2; }
      `}</style>

      <div className="header">
        <div className="title">🍭 TODO List</div>
        <button onClick={handleAddGroup} className="tab">+ Group</button>
      </div>

      <div className="input-section">
        <input 
          type="text" 
          className="todo-input" 
          placeholder="なにする？" 
          value={newTodoTitle}
          onChange={(e) => setNewTodoTitle(e.target.value)}
        />
        <select 
          className="group-select" 
          value={selectedGroupId} 
          onChange={(e) => setSelectedGroupId(e.target.value)}
        >
          <option value="">グループを選択</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
        <div className="btn-group">
          <button className="btn-add btn-personal" onClick={() => handleAddTodo("personal")}>自分のTODO</button>
          <button className="btn-add btn-couple" onClick={() => handleAddTodo("couple")}>2人のTODO</button>
        </div>
      </div>

      <div className="filter-tabs">
        <button className={`tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>すべて</button>
        <button className={`tab ${filter === "personal" ? "active" : ""}`} onClick={() => setFilter("personal")}>自分</button>
        <button className={`tab ${filter === "couple" ? "active" : ""}`} onClick={() => setFilter("couple")}>2人</button>
      </div>

      <div className="todo-list">
        {todos
          .filter(t => filter === "all" || t.type === filter)
          .map(todo => (
            <div key={todo.id} className={`todo-item ${todo.isCompleted ? "completed" : ""}`}>
              <input 
                type="checkbox" 
                className="todo-checkbox" 
                checked={todo.isCompleted} 
                onChange={() => handleToggleComplete(todo)}
              />
              <div className="todo-info">
                <div className="todo-title">
                  <span className={`badge ${todo.type === "personal" ? "badge-personal" : "badge-couple"}`}>
                    {todo.type === "personal" ? "自分" : "2人"}
                  </span>
                  {todo.title}
                </div>
                <div className="todo-meta">
                  {groups.find(g => g.id === todo.groupId)?.name || "未分類"}
                </div>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
