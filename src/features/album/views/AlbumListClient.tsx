"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getAlbums, createAlbum, getPhotos, Album, Photo } from "../api/album-client-service";
import styles from "./Album.module.css";

// アルバム個別カードコンポーネント（件数とカバー画像を非同期で取得）
function AlbumCard({ album }: { album: Album }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPhotos(album.id)
      .then((data) => {
        setPhotos(data);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [album.id]);

  const coverUrl = photos.length > 0 ? photos[0].url : null;

  return (
    <Link href={`/albums/${album.id}`} className={styles.albumCard}>
      <div className={styles.coverContainer}>
        {coverUrl ? (
          <img src={coverUrl} alt={album.name} className={styles.albumCover} />
        ) : (
          <div className={styles.noPhotosCover}>
            <i className={`fa-solid fa-folder-open ${styles.noPhotosIcon}`}></i>
            <span style={{ fontSize: "11px", color: "#aaa" }}>写真を追加</span>
          </div>
        )}
        {!loading && (
          <span className={styles.photoCountBadge}>
            {photos.length}
          </span>
        )}
      </div>
      <div className={styles.albumInfo}>
        <h3 className={styles.albumName}>{album.name}</h3>
      </div>
    </Link>
  );
}

export default function AlbumListClient() {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル用状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setBreadcrumbs([{ title: "アルバム" }]);
  }, [setBreadcrumbs]);

  const fetchAlbums = async () => {
    try {
      const data = await getAlbums();
      setAlbums(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleCreateAlbum = async () => {
    const trimmedName = newAlbumName.trim();
    if (!trimmedName || !user) return;

    setIsSubmitting(true);
    try {
      await createAlbum(trimmedName, user.uid);
      setNewAlbumName("");
      setIsModalOpen(false);
      // 再取得
      await fetchAlbums();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthGuard>
      <div className={`page-container ${styles.albumContainer}`}>
        <div className={styles.headerRow}>
          <h1 className="page-title" style={{ margin: 0 }}>
            <i className="fa-solid fa-images" style={{ color: "#F7A8C4", marginRight: "10px" }}></i>
            アルバム
          </h1>
          <button className={styles.createBtn} onClick={() => setIsModalOpen(true)}>
            <i className="fa-solid fa-plus"></i>
            アルバム作成
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyGrid}>
            <span className={styles.emptyText}>読み込み中...</span>
          </div>
        ) : albums.length > 0 ? (
          <div className={styles.albumGrid}>
            {albums.map((album) => (
              <AlbumCard key={album.id} album={album} />
            ))}
          </div>
        ) : (
          <div className={styles.emptyGrid}>
            <i className={`fa-solid fa-images ${styles.emptyIcon}`}></i>
            <span className={styles.emptyText}>
              アルバムがまだありません。<br />
              右上のボタンから作成しましょう！🍬
            </span>
          </div>
        )}

        {/* アルバム作成モーダル */}
        {isModalOpen && (
          <div className={styles.dialogOverlay} onClick={() => setIsModalOpen(false)}>
            <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
              <div className={styles.dialogTitle}>
                <i className="fa-solid fa-folder-plus" style={{ color: "#F7A8C4" }}></i>
                新規アルバム作成
              </div>
              <input
                type="text"
                className={styles.dialogInput}
                placeholder="アルバム名を入力してください"
                value={newAlbumName}
                onChange={(e) => setNewAlbumName(e.target.value.slice(0, 20))}
                maxLength={20}
                autoFocus
              />
              <div className={styles.dialogButtons}>
                <button
                  className={`${styles.dialogBtn} ${styles.btnCancel}`}
                  onClick={() => {
                    setNewAlbumName("");
                    setIsModalOpen(false);
                  }}
                  disabled={isSubmitting}
                >
                  キャンセル
                </button>
                <button
                  className={`${styles.dialogBtn} ${styles.btnOk}`}
                  onClick={handleCreateAlbum}
                  disabled={!newAlbumName.trim() || isSubmitting}
                >
                  {isSubmitting ? "作成中..." : "作成する"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
