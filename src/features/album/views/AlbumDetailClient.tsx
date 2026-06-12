"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import { getPartnerData } from "@/src/features/user/api/user-client-service";
import {
  getPhotos,
  uploadPhoto,
  deletePhotos,
  deleteAlbum,
  updateAlbumName,
  Album,
  Photo,
} from "../api/album-client-service";
import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import styles from "./Album.module.css";

interface AlbumDetailClientProps {
  albumId: string;
}

export default function AlbumDetailClient({ albumId }: AlbumDetailClientProps) {
  const { user, userData } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const router = useRouter();
  
  const [album, setAlbum] = useState<Album | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [partnerData, setPartnerData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // メニュー・編集等の状態
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [renameValue, setRenameValue] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  
  // 選択モード関連
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);
  
  // ライトボックス関連
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // パートナー情報の取得
  useEffect(() => {
    if (user) {
      getPartnerData(user.uid).then(setPartnerData);
    }
  }, [user]);

  // アルバム本体と写真データの取得
  const fetchData = async () => {
    try {
      const albumRef = doc(db, "albums", albumId);
      const snap = await getDoc(albumRef);
      if (snap.exists()) {
        const albumData = { id: snap.id, ...snap.data() } as Album;
        setAlbum(albumData);
        setRenameValue(albumData.name);
        
        // パンくずリストを設定
        setBreadcrumbs([
          { title: "アルバム", href: "/albums" },
          { title: albumData.name }
        ]);

        const photoData = await getPhotos(albumId);
        setPhotos(photoData);
      } else {
        // アルバムが存在しない
        router.replace("/albums");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [albumId]);

  // メニュー外部クリックで閉じる処理
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // アルバム名の変更
  const handleRenameAlbum = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !album) return;

    setIsRenaming(true);
    try {
      await updateAlbumName(album.id, trimmed);
      setIsRenameModalOpen(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      setIsRenaming(false);
    }
  };

  // アルバムの削除
  const handleDeleteAlbum = async () => {
    if (!album) return;
    setIsMenuOpen(false);
    
    const confirm = await showDialog(`アルバム「${album.name}」を削除しますか？\nアルバム内の写真もすべて削除されます。`, false);
    if (!confirm) return;

    showSpinner();
    try {
      await deleteAlbum(album.id);
      router.push("/albums");
    } catch (e) {
      console.error(e);
      hideSpinner();
    }
  };

  // ファイルアップロードのハンドラ
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user || !album) return;

    showSpinner();
    try {
      // 複数ファイルを順次アップロード
      for (let i = 0; i < files.length; i++) {
        await uploadPhoto(album.id, files[i], user.uid);
      }
      await fetchData();
    } catch (err) {
      console.error(err);
    } finally {
      hideSpinner();
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // 写真選択のトグル
  const handlePhotoClick = (photo: Photo) => {
    if (isSelectMode) {
      const isSelected = selectedPhotos.some((p) => p.id === photo.id);
      if (isSelected) {
        setSelectedPhotos(selectedPhotos.filter((p) => p.id !== photo.id));
      } else {
        setSelectedPhotos([...selectedPhotos, photo]);
      }
    } else {
      setActivePhoto(photo);
    }
  };

  // 選択写真の一括削除
  const handleDeleteSelected = async () => {
    if (selectedPhotos.length === 0) return;
    
    const confirm = await showDialog(`${selectedPhotos.length}件の写真を削除しますか？`, false);
    if (!confirm) return;

    showSpinner();
    try {
      await deletePhotos(selectedPhotos);
      setSelectedPhotos([]);
      setIsSelectMode(false);
      await fetchData();
    } catch (e) {
      console.error(e);
    } finally {
      hideSpinner();
    }
  };

  // 選択写真の一括ダウンロード（各写真を新しいウィンドウ・タブで開く）
  const handleDownloadSelected = () => {
    if (selectedPhotos.length === 0) return;
    
    selectedPhotos.forEach((photo) => {
      window.open(photo.url, "_blank");
    });
    
    setSelectedPhotos([]);
    setIsSelectMode(false);
  };

  // アップローダー名の判別表示
  const getUploaderName = (photo: Photo) => {
    if (photo.uid === user?.uid) {
      return userData?.nickname || userData?.displayName || "自分";
    }
    if (partnerData && photo.uid === partnerData.id) {
      return partnerData.nickname || partnerData.displayName || "パートナー";
    }
    return "ゲスト";
  };

  // 日付のフォーマット
  const formatUploadDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return `${d.getFullYear()}/${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  if (loading || !album) {
    return (
      <AuthGuard>
        <div className={`page-container ${styles.albumContainer}`}>
          <div className={styles.emptyGrid}>
            <span className={styles.emptyText}>読み込み中...</span>
          </div>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div className={`page-container ${styles.albumContainer}`}>
        {/* ヘッダーエリア */}
        <div className={styles.detailHeader}>
          <div className={styles.detailInfo}>
            <h1 className="page-title" style={{ margin: 0 }}>
              <i className="fa-solid fa-image" style={{ color: "#F7A8C4", marginRight: "10px" }}></i>
              {album.name}
            </h1>
            <span className={styles.photoCountText}>写真 {photos.length}件</span>
          </div>

          {!isSelectMode && (
            <div className={styles.headerActions} ref={menuRef}>
              <button className={styles.moreBtn} onClick={() => setIsMenuOpen(!isMenuOpen)}>
                <i className="fa-solid fa-ellipsis-vertical"></i>
              </button>
              {isMenuOpen && (
                <div className={styles.actionMenu}>
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setIsSelectMode(true);
                      setSelectedPhotos([]);
                      setIsMenuOpen(false);
                    }}
                  >
                    <i className="fa-solid fa-square-check"></i>
                    選択する
                  </button>
                  <button
                    className={styles.menuItem}
                    onClick={() => {
                      setIsRenameModalOpen(true);
                      setIsMenuOpen(false);
                    }}
                  >
                    <i className="fa-solid fa-pen-to-square"></i>
                    アルバム名を変更
                  </button>
                  <button
                    className={`${styles.menuItem} ${styles.menuItemDanger}`}
                    onClick={handleDeleteAlbum}
                  >
                    <i className="fa-solid fa-trash-can"></i>
                    アルバムを削除
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 写真のグリッド（3カラム表示） */}
        <div className={styles.photoGrid}>
          {photos.length > 0 ? (
            photos.map((photo) => {
              const isSelected = selectedPhotos.some((p) => p.id === photo.id);
              const selectionIndex = selectedPhotos.findIndex((p) => p.id === photo.id);

              return (
                <div
                  key={photo.id}
                  className={`${styles.photoItem} ${isSelected ? styles.selected : ""}`}
                  onClick={() => handlePhotoClick(photo)}
                >
                  <img src={photo.url} alt="Photo" className={styles.photoImg} />
                  
                  {isSelectMode && (
                    <div className={styles.selectOverlay}>
                      {isSelected && (
                        <span className={styles.selectedNumber}>
                          {selectionIndex + 1}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          ) : (
            <div className={styles.emptyGrid}>
              <i className={`fa-solid fa-images ${styles.emptyIcon}`}></i>
              <span className={styles.emptyText}>
                このアルバムにはまだ写真がありません。<br />
                右下の＋ボタンから追加しましょう！🍭
              </span>
            </div>
          )}
        </div>

        {/* アップロード用の隠しinputとプラスボタン */}
        {!isSelectMode && (
          <>
            <input
              type="file"
              multiple
              accept="image/*"
              ref={fileInputRef}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              className={styles.floatingUploadBtn}
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="fa-solid fa-plus"></i>
            </button>
          </>
        )}

        {/* 選択モード時の下部固定アクションバー */}
        {isSelectMode && (
          <div className={styles.actionBar}>
            <span className={styles.selectionCount}>
              {selectedPhotos.length}件 選択中
            </span>
            <div className={styles.actionBarButtons}>
              <button
                className={styles.actionBtn}
                onClick={handleDownloadSelected}
                disabled={selectedPhotos.length === 0}
                title="ダウンロード"
              >
                <i className="fa-solid fa-download"></i>
              </button>
              <button
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                onClick={handleDeleteSelected}
                disabled={selectedPhotos.length === 0}
                title="削除"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
              <button
                className={styles.actionBtn}
                onClick={() => {
                  setIsSelectMode(false);
                  setSelectedPhotos([]);
                }}
                title="キャンセル"
              >
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
          </div>
        )}

        {/* 写真詳細モーダル (ライトボックス) */}
        {activePhoto && (
          <div className={styles.lightboxOverlay} onClick={() => setActivePhoto(null)}>
            <button className={styles.lightboxClose} onClick={() => setActivePhoto(null)}>
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
              <img src={activePhoto.url} alt="Lightbox Photo" className={styles.lightboxImg} />
              <div className={styles.lightboxMeta}>
                <span className={styles.uploaderName}>
                  アップロード: {getUploaderName(activePhoto)}
                </span>
                <span className={styles.uploadDate}>
                  {formatUploadDate(activePhoto.createdAt)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* アルバム名変更ダイアログ */}
        {isRenameModalOpen && (
          <div className={styles.dialogOverlay} onClick={() => setIsRenameModalOpen(false)}>
            <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
              <div className={styles.dialogTitle}>
                <i className="fa-solid fa-pen-to-square" style={{ color: "#F7A8C4" }}></i>
                アルバム名変更
              </div>
              <input
                type="text"
                className={styles.dialogInput}
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value.slice(0, 20))}
                maxLength={20}
                autoFocus
              />
              <div className={styles.dialogButtons}>
                <button
                  className={`${styles.dialogBtn} ${styles.btnCancel}`}
                  onClick={() => {
                    setRenameValue(album.name);
                    setIsRenameModalOpen(false);
                  }}
                  disabled={isRenaming}
                >
                  キャンセル
                </button>
                <button
                  className={`${styles.dialogBtn} ${styles.btnOk}`}
                  onClick={handleRenameAlbum}
                  disabled={!renameValue.trim() || renameValue.trim() === album.name || isRenaming}
                >
                  {isRenaming ? "変更中..." : "変更する"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
