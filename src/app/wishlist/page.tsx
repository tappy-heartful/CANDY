"use client";

import AuthGuard from "@/src/components/AuthGuard";
import { useEffect, useState } from "react";
import { useAuth } from "@/src/contexts/AuthContext";
import { getWishlist } from "@/src/features/wishlist/api/wishlist-server-actions";
import { getGroups } from "@/src/features/todo/api/todo-server-actions";
import WishlistClient from "@/src/features/wishlist/views/WishlistClient";
import { Wishlist, Group } from "@/src/lib/firestore/types";

export default function WishlistPage() {
  const { user, loading } = useAuth();
  const [items, setItems] = useState<Wishlist[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (user) {
      Promise.all([
        getWishlist(user.uid),
        getGroups("wishlist")
      ]).then(([wishData, groupData]) => {
        setItems(wishData);
        setGroups(groupData);
        setFetching(false);
      });
    }
  }, [user]);

  if (loading || fetching) return <div>読み込み中...</div>;

  return (
    <AuthGuard>
      <WishlistClient initialWishlist={items} initialGroups={groups} />
    </AuthGuard>
  );
}
