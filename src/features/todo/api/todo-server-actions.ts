import { db } from "@/src/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { Todo, Group } from "@/src/lib/firestore/types";
import { toPlainObject } from "@/src/lib/firestore/utils";

/**
 * TODOリストを取得する
 * 自分が見れるもの：自分のTODO + 2人のTODO + 相手が公開しているTODO
 */
export async function getTodos(uid: string) {
  // 本来は2人のUIDを取得して複雑なクエリが必要だが、
  // シンプルにするため一旦全件取得してフィルタリングするロジックにするか、
  // または2人のUIDを特定してクエリを組む。

  const todosRef = collection(db, "todos");
  const q = query(todosRef, orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  const allTodos = snap.docs.map((doc) => toPlainObject(doc) as Todo);

  // フィルタリング:
  // 1. 自分のTODO (uid == currentUid)
  // 2. 2人のTODO (type == "couple")
  // 3. 相手のTODOで公開されているもの (暫定仕様として全て表示)
  return allTodos.filter(
    (t) => t.uid === uid || t.type === "couple" || t.type === "personal"
  );
}

export async function getGroups(type: "todo" | "wishlist") {
  const groupsRef = collection(db, "groups");
  const q = query(groupsRef, where("type", "==", type));
  const snap = await getDocs(q);
  return snap.docs.map(doc => toPlainObject(doc) as Group);
}
