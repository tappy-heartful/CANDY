import { db } from "@/src/lib/firebase";
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Todo, Group } from "@/src/lib/firestore/types";

export async function addTodo(data: Partial<Todo>) {
  const todosRef = collection(db, "todos");
  return await addDoc(todosRef, {
    ...data,
    isCompleted: false,
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

export async function addGroup(name: string, type: "todo" | "wishlist", uid: string) {
  const groupsRef = collection(db, "groups");
  return await addDoc(groupsRef, {
    name,
    type,
    uid,
    createdAt: serverTimestamp(),
  });
}
