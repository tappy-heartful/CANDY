/**
 * FirebaseのDocumentSnapshotをプレーンなオブジェクトに変換する
 */
export const toPlainObject = (doc: any) => {
  const data = doc.data();
  if (!data) return { id: doc.id };
  const obj = { ...data, id: doc.id };
  
  // 再帰的にTimestampをミリ秒(number)に変換する
  const convertTimestamps = (item: any): any => {
    if (!item || typeof item !== "object") return item;
    
    // Firestore Timestamp or Date object
    if (typeof item.toMillis === "function") {
      return item.toMillis();
    }
    if (item instanceof Date) {
      return item.getTime();
    }
    
    if (Array.isArray(item)) {
      return item.map(convertTimestamps);
    }
    
    const result: any = {};
    for (const key in item) {
      result[key] = convertTimestamps(item[key]);
    }
    return result;
  };

  return convertTimestamps(obj);
};

/**
 * Firestore書き込み用に undefined のフィールドを再帰的に除去する
 */
export const sanitizeForFirestore = <T>(obj: T): T => {
  if (obj === undefined || obj === null) return obj;
  if (Array.isArray(obj)) {
    return obj.map(sanitizeForFirestore).filter((item) => item !== undefined) as unknown as T;
  }
  if (typeof obj === "object" && !(obj instanceof Date)) {
    // Firestore FieldValue 等の場合はそのまま返す
    if (typeof (obj as any).isEqual === "function") {
      return obj;
    }
    const result: any = {};
    for (const key of Object.keys(obj as any)) {
      const val = (obj as any)[key];
      if (val !== undefined) {
        result[key] = sanitizeForFirestore(val);
      }
    }
    return result as T;
  }
  return obj;
};
