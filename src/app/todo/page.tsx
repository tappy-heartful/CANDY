"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getTodos as getTodosAction, getGroups } from "@/src/features/todo/api/todo-server-actions";
import TodoListClient from "@/src/features/todo/views/TodoListClient";
import AuthGuard from "@/src/components/AuthGuard";
import { Todo, Group } from "@/src/lib/firestore/types";
import styles from "./todo.module.css";

export default function TodoPage() {
  const { user, loading } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    setBreadcrumbs([{ title: "TODO" }]);
  }, [setBreadcrumbs]);

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
      <div className={styles.wrapper}>
        <div className={styles.spinner}></div>
      </div>
    );
  }

  return (
    <AuthGuard>
      <TodoListClient initialTodos={todos} initialGroups={groups} />
    </AuthGuard>
  );
}
