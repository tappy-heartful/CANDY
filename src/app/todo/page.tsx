"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { getTodos as getTodosAction, getGroups } from "@/src/features/todo/api/todo-server-actions";
import TodoListClient from "@/src/features/todo/views/TodoListClient";
import AuthGuard from "@/src/components/AuthGuard";
import { Todo, Group } from "@/src/lib/firestore/types";

export default function TodoPage() {
  const { user, loading } = useAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (user) {
        const [todoData, groupData] = await Promise.all([
          getTodosAction(user.uid),
          getGroups("todo")
        ]);
        setTodos(todoData);
        setGroups(groupData);
        setFetching(false);
      }
    }
    loadData();
  }, [user]);

  if (loading || fetching) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="spinner"></div>
        <style jsx>{`
          .spinner {
            width: 40px;
            height: 40px;
            border: 4px solid #A0E7D2;
            border-top: 4px solid #F7A8C4;
            border-radius: 50%;
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <AuthGuard>
      <TodoListClient initialTodos={todos} initialGroups={groups} />
    </AuthGuard>
  );
}
