import { db } from "@/src/lib/firebase";
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  getDoc,
} from "firebase/firestore";
import { Todo, TodoStep } from "@/src/lib/firestore/types";

export async function addTodo(data: Partial<Todo>) {
  const todosRef = collection(db, "todos");
  return await addDoc(todosRef, {
    ...data,
    isCompleted: false,
    steps: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function updateTodo(id: string, data: Partial<Todo>) {
  const todoRef = doc(db, "todos", id);
  return await updateDoc(todoRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteTodo(id: string) {
  const todoRef = doc(db, "todos", id);
  return await deleteDoc(todoRef);
}

export async function addTodoStep(todoId: string, title: string): Promise<TodoStep | undefined> {
  const trimmed = title.trim();
  if (!trimmed) return;

  const todoRef = doc(db, "todos", todoId);
  const snap = await getDoc(todoRef);
  if (!snap.exists()) return;

  const todoData = snap.data() as Partial<Todo>;
  const currentSteps = Array.isArray(todoData.steps) ? (todoData.steps as TodoStep[]) : [];
  const now = Date.now();
  const id = `${now}_${Math.random().toString(36).slice(2, 10)}`;
  const newStep: TodoStep = { id, title: trimmed, isCompleted: false, createdAt: now, updatedAt: now };
  const nextSteps: TodoStep[] = [...currentSteps, newStep];

  await updateDoc(todoRef, {
    steps: nextSteps,
    updatedAt: serverTimestamp(),
  });
  return newStep;
}

export async function toggleTodoStep(todoId: string, stepId: string) {
  const todoRef = doc(db, "todos", todoId);
  const snap = await getDoc(todoRef);
  if (!snap.exists()) return;

  const todoData = snap.data() as Partial<Todo>;
  const currentSteps = Array.isArray(todoData.steps) ? todoData.steps : [];
  const now = Date.now();
  const nextSteps = currentSteps.map((s) =>
    s.id === stepId ? { ...s, isCompleted: !s.isCompleted, updatedAt: now } : s,
  );

  return await updateDoc(todoRef, {
    steps: nextSteps,
    updatedAt: serverTimestamp(),
  });
}

export async function addGroup(name: string, type: "todo" | "wishlist", uid: string) {
  const groupsRef = collection(db, "groups");
  return await addDoc(groupsRef, {
    name,
    type,
    uid,
    createdAt: serverTimestamp(),
  });
}
