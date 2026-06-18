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
  updateAlbum,
  getPrefectures,
  getMunicipalities,
  Album,
  Photo,
  Prefecture,
  Municipality,
} from "../api/album-client-service";
import { db } from "@/src/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { showSpinner, hideSpinner, showDialog } from "@/src/lib/functions";
import styles from "./Album.module.css";

interface AlbumDetailClientProps {
  albumId: string;
}

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

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

  // 都道府県・市区町村用の状態
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedPrefCode, setSelectedPrefCode] = useState("");
  const [selectedMuniCode, setSelectedMuniCode] = useState("");

  // 日付設定用の状態
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());

  // 選択モード関連
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedPhotos, setSelectedPhotos] = useState<Photo[]>([]);

  // ライトボックス関連
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);
  const [swipeY, setSwipeY] = useState(0);
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const touchEndY = useRef<number | null>(null);

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
        // 撮影日時の古い順（昇順）に並べ替える
        const sortedPhotos = [...photoData].sort((a, b) => {
          const timeA = a.takenAt ?? a.createdAt;
          const timeB = b.takenAt ?? b.createdAt;
          return timeA - timeB;
        });
        setPhotos(sortedPhotos);
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

  // キーボードでの画像切り替え (左右矢印キー)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!activePhoto) return;
      const activeIndex = photos.findIndex((p) => p.id === activePhoto.id);
      if (activeIndex === -1) return;

      if (e.key === "ArrowLeft") {
        if (activeIndex > 0) {
          setSlideDirection("left");
          setActivePhoto(photos[activeIndex - 1]);
        }
      } else if (e.key === "ArrowRight") {
        if (activeIndex < photos.length - 1) {
          setSlideDirection("right");
          setActivePhoto(photos[activeIndex + 1]);
        }
      } else if (e.key === "Escape") {
        setActivePhoto(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activePhoto, photos]);

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

  // モーダルが開いた際に都道府県をロード
  useEffect(() => {
    if (isRenameModalOpen && prefectures.length === 0) {
      getPrefectures()
        .then((data) => setPrefectures(data))
        .catch((e) => console.error("Failed to fetch prefectures:", e));
    }
  }, [isRenameModalOpen, prefectures]);

  // モーダルが開いた際に登録済みの都道府県・市区町村・日付を初期値として反映
  useEffect(() => {
    if (isRenameModalOpen && album) {
      const prefCode = album.prefectureCode || "";
      const muniCode = album.municipalityCode || "";
      setSelectedPrefCode(prefCode);
      setSelectedMuniCode(muniCode);

      setDateMode(album.dateMode || "single");
      setStartDate(album.startDate || getTodayString());
      setEndDate(album.endDate || album.startDate || getTodayString());

      if (prefCode) {
        getMunicipalities(prefCode)
          .then((data) => setMunicipalities(data))
          .catch((e) => console.error("Failed to fetch municipalities on init:", e));
      } else {
        setMunicipalities([]);
      }
    }
  }, [isRenameModalOpen, album]);

  // 都道府県が変更された際のハンドラ
  const handlePrefChange = async (prefCode: string) => {
    setSelectedPrefCode(prefCode);
    setSelectedMuniCode("");
    setMunicipalities([]);
    if (!prefCode) return;

    try {
      const data = await getMunicipalities(prefCode);
      setMunicipalities(data);
    } catch (e) {
      console.error("Failed to fetch municipalities on change:", e);
    }
  };

  // アルバム情報の変更
  const handleUpdateAlbum = async () => {
    const trimmed = renameValue.trim();
    if (!trimmed || !album) return;

    setIsRenaming(true);
    try {
      const pref = prefectures.find((p) => String(p.code).padStart(2, "0") === selectedPrefCode);
      const muni = municipalities.find((m) => m.code === selectedMuniCode);

      await updateAlbum(
        album.id,
        trimmed,
        selectedPrefCode || undefined,
        pref?.name || undefined,
        selectedMuniCode || undefined,
        muni?.name || undefined,
        dateMode,
        startDate,
        dateMode === "range" ? endDate : undefined
      );
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
      setSlideDirection(null);
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

  // 選択写真の一括ダウンロード
  const handleDownloadSelected = () => {
    if (selectedPhotos.length === 0) return;

    selectedPhotos.forEach((photo) => {
      const filename = `album_${album?.name || "photo"}_${photo.id}.jpg`;
      const downloadUrl = `/api/download?url=${encodeURIComponent(photo.url)}&name=${encodeURIComponent(filename)}`;
      const a = document.createElement("a");
      a.href = downloadUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
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

  // 前後の画像への切り替え
  const handlePrevPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activePhoto) return;
    const activeIndex = photos.findIndex((p) => p.id === activePhoto.id);
    if (activeIndex > 0) {
      setSlideDirection("left");
      setActivePhoto(photos[activeIndex - 1]);
    }
  };

  const handleNextPhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!activePhoto) return;
    const activeIndex = photos.findIndex((p) => p.id === activePhoto.id);
    if (activeIndex < photos.length - 1) {
      setSlideDirection("right");
      setActivePhoto(photos[activeIndex + 1]);
    }
  };

  // スワイプ処理用ハンドラ
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchEndX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchEndY.current = e.touches[0].clientY;
    setIsDragging(true);
    setSwipeY(0);
    setSwipeX(0);
    setSlideDirection(null);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
    touchEndY.current = e.touches[0].clientY;

    if (touchStartY.current === null || touchStartX.current === null) return;

    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;

    // 縦横どちらのスワイプが支配的か判定
    if (Math.abs(diffY) > Math.abs(diffX)) {
      // 縦スワイプが支配的
      if (diffY < 0) {
        setSwipeY(-diffY);
      } else {
        setSwipeY(0);
      }
      setSwipeX(0);
    } else {
      // 横スワイプが支配的
      setSwipeX(-diffX); // 指の動きに合わせて移動
      setSwipeY(0);
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);

    if (
      touchStartX.current === null ||
      touchEndX.current === null ||
      touchStartY.current === null ||
      touchEndY.current === null ||
      !activePhoto
    ) {
      setSwipeY(0);
      setSwipeX(0);
      return;
    }

    const diffX = touchStartX.current - touchEndX.current;
    const diffY = touchStartY.current - touchEndY.current;
    const minSwipeDistance = 70; // 閾値を70pxに設定

    if (Math.abs(diffY) > Math.abs(diffX)) {
      // 縦スワイプの処理
      if (diffY < -minSwipeDistance) {
        setActivePhoto(null);
      }
    } else {
      // 横スワイプの処理
      const activeIndex = photos.findIndex((p) => p.id === activePhoto.id);
      if (activeIndex !== -1) {
        if (diffX > minSwipeDistance && activeIndex < photos.length - 1) {
          // 左スワイプ（次の画像へ）
          setSlideDirection("right");
          setActivePhoto(photos[activeIndex + 1]);
        } else if (diffX < -minSwipeDistance && activeIndex > 0) {
          // 右スワイプ（前の画像へ）
          setSlideDirection("left");
          setActivePhoto(photos[activeIndex - 1]);
        }
      }
    }

    setSwipeY(0);
    setSwipeX(0);
    touchStartX.current = null;
    touchEndX.current = null;
    touchStartY.current = null;
    touchEndY.current = null;
  };

  // 単一写真のダウンロード
  const handleDownloadSingle = (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const filename = `album_${album?.name || "photo"}_${photo.id}.jpg`;
    const downloadUrl = `/api/download?url=${encodeURIComponent(photo.url)}&name=${encodeURIComponent(filename)}`;
    const a = document.createElement("a");
    a.href = downloadUrl;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // 単一写真の削除
  const handleDeleteSingle = async (photo: Photo, e: React.MouseEvent) => {
    e.stopPropagation();
    const confirm = await showDialog("この写真を削除しますか？", false);
    if (!confirm) return;

    showSpinner();
    try {
      await deletePhotos([photo]);

      const activeIndex = photos.findIndex((p) => p.id === photo.id);
      const newPhotos = photos.filter((p) => p.id !== photo.id);
      setPhotos(newPhotos);

      if (newPhotos.length > 0) {
        // 次の写真を表示する（最後の場合は1つ前）
        const nextIndex = activeIndex < newPhotos.length ? activeIndex : newPhotos.length - 1;
        setActivePhoto(newPhotos[nextIndex]);
      } else {
        setActivePhoto(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      hideSpinner();
    }
  };

  const formatDateDisplay = (album: Album) => {
    if (!album.startDate) return null;
    const start = album.startDate.replace(/-/g, "/");
    if (album.dateMode === "range" && album.endDate) {
      const end = album.endDate.replace(/-/g, "/");
      return `${start} 〜 ${end}`;
    }
    return start;
  };

  const activeIndex = activePhoto ? photos.findIndex((p) => p.id === activePhoto.id) : -1;

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
            <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center", marginTop: "4px" }}>
              <span className={styles.photoCountText}>写真 {photos.length}件</span>
              {formatDateDisplay(album) && (
                <span className={styles.detailDate} style={{ fontSize: "12px", color: "#888", display: "inline-flex", alignItems: "center" }}>
                  <i className="fa-regular fa-calendar" style={{ marginRight: "4px", color: "#9B7CC3" }}></i>
                  {formatDateDisplay(album)}
                </span>
              )}
              {(album.prefectureName || album.municipalityName) && (
                <span className={styles.detailLocation}>
                  <i className="fa-solid fa-location-dot" style={{ marginRight: "4px", color: "#F7A8C4" }}></i>
                  {album.prefectureName || ""} {album.municipalityName || ""}
                </span>
              )}
            </div>
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
                    アルバム情報を編集
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
          <div
            className={styles.lightboxOverlay}
            style={{
              backgroundColor: `rgba(0, 0, 0, ${0.95 - Math.min(0.45, Math.max(Math.abs(swipeX) / 600, swipeY / 600))})`
            }}
            onClick={() => setActivePhoto(null)}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* 上部ヘッダー */}
            <div
              className={styles.lightboxHeader}
              style={{
                opacity: 1 - Math.min(0.8, Math.max(Math.abs(swipeX) / 300, swipeY / 300)),
                transition: isDragging ? "none" : "opacity 0.2s ease"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className={styles.lightboxHeaderInfo}>
                <h2 className={styles.lightboxAlbumName}>
                  {album.name} ({activeIndex !== -1 ? activeIndex + 1 : 0} / {photos.length})
                </h2>
                <div className={styles.lightboxUploader}>
                  {getUploaderName(activePhoto)} • {activePhoto.takenAt ? "撮影" : "アップロード"}: {formatUploadDate(activePhoto.takenAt ?? activePhoto.createdAt)}
                </div>
              </div>
              <button className={styles.lightboxClose} onClick={() => setActivePhoto(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>

            {/* 左矢印ナビゲーション */}
            {activeIndex > 0 && (
              <button
                className={styles.lightboxPrev}
                style={{
                  opacity: 1 - Math.min(0.8, Math.max(Math.abs(swipeX) / 300, swipeY / 300)),
                  transition: isDragging ? "none" : "opacity 0.2s ease"
                }}
                onClick={handlePrevPhoto}
              >
                <i className="fa-solid fa-chevron-left"></i>
              </button>
            )}

            <div
              key={activePhoto.id}
              className={`${styles.lightboxContent} ${
                slideDirection === "right"
                  ? styles.slideInFromRight
                  : slideDirection === "left"
                  ? styles.slideInFromLeft
                  : ""
              }`}
              style={{
                transform: `translate3d(${swipeX}px, ${swipeY}px, 0)`,
                opacity: 1 - Math.min(0.6, Math.max(Math.abs(swipeX) / 500, swipeY / 500)),
                transition: isDragging ? "none" : "transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1)"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={activePhoto.url} alt="Lightbox Photo" className={styles.lightboxImg} />
            </div>

            {/* 右矢印ナビゲーション */}
            {activeIndex < photos.length - 1 && (
              <button
                className={styles.lightboxNext}
                style={{
                  opacity: 1 - Math.min(0.8, Math.max(Math.abs(swipeX) / 300, swipeY / 300)),
                  transition: isDragging ? "none" : "opacity 0.2s ease"
                }}
                onClick={handleNextPhoto}
              >
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            )}

            {/* 下部アクションバー (ダウンロード・削除) */}
            <div
              className={styles.lightboxActionBar}
              style={{
                opacity: 1 - Math.min(0.8, Math.max(Math.abs(swipeX) / 300, swipeY / 300)),
                transition: isDragging ? "none" : "opacity 0.2s ease"
              }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className={styles.lightboxActionBtn}
                onClick={(e) => handleDownloadSingle(activePhoto, e)}
                title="ダウンロード"
              >
                <i className="fa-solid fa-download"></i>
              </button>
              <button
                className={`${styles.lightboxActionBtn} ${styles.lightboxActionBtnDanger}`}
                onClick={(e) => handleDeleteSingle(activePhoto, e)}
                title="削除"
              >
                <i className="fa-solid fa-trash-can"></i>
              </button>
            </div>
          </div>
        )}

        {/* アルバム情報編集ダイアログ */}
        {isRenameModalOpen && (
          <div
            className={styles.dialogOverlay}
            onClick={() => {
              setRenameValue(album.name);
              setSelectedPrefCode(album.prefectureCode || "");
              setSelectedMuniCode(album.municipalityCode || "");
              setDateMode(album.dateMode || "single");
              setStartDate(album.startDate || getTodayString());
              setEndDate(album.endDate || album.startDate || getTodayString());
              setIsRenameModalOpen(false);
            }}
          >
            <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
              <div className={styles.dialogTitle}>
                <i className="fa-solid fa-pen-to-square" style={{ color: "#F7A8C4" }}></i>
                アルバム情報編集
              </div>
              <div className={styles.dialogFormGroup}>
                <label className={styles.dialogLabel}>アルバム名</label>
                <input
                  type="text"
                  className={styles.dialogInput}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value.slice(0, 20))}
                  maxLength={20}
                  autoFocus
                />
              </div>

              <div className={styles.dialogFormGroup}>
                <label className={styles.dialogLabel}>日付設定</label>
                <div className={styles.radioGroup}>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="editDateMode"
                      value="single"
                      checked={dateMode === "single"}
                      onChange={() => setDateMode("single")}
                    />
                    <span>1日のみ</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="editDateMode"
                      value="range"
                      checked={dateMode === "range"}
                      onChange={() => setDateMode("range")}
                    />
                    <span>期間</span>
                  </label>
                </div>
              </div>

              {dateMode === "single" ? (
                <div className={styles.dialogFormGroup}>
                  <label className={styles.dialogLabel}>日付</label>
                  <input
                    type="date"
                    className={styles.dialogInput}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
              ) : (
                <div className={styles.dialogFormGroup}>
                  <label className={styles.dialogLabel}>期間設定</label>
                  <div className={styles.dateRangeInputs}>
                    <input
                      type="date"
                      className={styles.dialogInput}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                    <span className={styles.dateRangeSeparator}>〜</span>
                    <input
                      type="date"
                      className={styles.dialogInput}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      min={startDate}
                    />
                  </div>
                </div>
              )}

              <div className={styles.dialogFormGroup}>
                <label className={styles.dialogLabel}>都道府県（任意）</label>
                <select
                  className={styles.dialogSelect}
                  value={selectedPrefCode}
                  onChange={(e) => handlePrefChange(e.target.value)}
                >
                  <option value="">選択してください</option>
                  {prefectures.map((pref) => (
                    <option key={pref.code} value={String(pref.code).padStart(2, "0")}>
                      {pref.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.dialogFormGroup}>
                <label className={styles.dialogLabel}>市区町村（任意）</label>
                <select
                  className={styles.dialogSelect}
                  value={selectedMuniCode}
                  onChange={(e) => setSelectedMuniCode(e.target.value)}
                  disabled={!selectedPrefCode}
                >
                  <option value="">選択してください</option>
                  {municipalities.map((muni) => (
                    <option key={muni.code} value={muni.code}>
                      {muni.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.dialogButtons}>
                <button
                  className={`${styles.dialogBtn} ${styles.btnCancel}`}
                  onClick={() => {
                    setRenameValue(album.name);
                    setSelectedPrefCode(album.prefectureCode || "");
                    setSelectedMuniCode(album.municipalityCode || "");
                    setDateMode(album.dateMode || "single");
                    setStartDate(album.startDate || getTodayString());
                    setEndDate(album.endDate || album.startDate || getTodayString());
                    setIsRenameModalOpen(false);
                  }}
                  disabled={isRenaming}
                >
                  キャンセル
                </button>
                <button
                  className={`${styles.dialogBtn} ${styles.btnOk}`}
                  onClick={handleUpdateAlbum}
                  disabled={
                    !renameValue.trim() ||
                    isRenaming ||
                    (renameValue.trim() === album.name &&
                      selectedPrefCode === (album.prefectureCode || "") &&
                      selectedMuniCode === (album.municipalityCode || "") &&
                      dateMode === (album.dateMode || "single") &&
                      startDate === (album.startDate || "") &&
                      (dateMode === "single" || endDate === (album.endDate || album.startDate || "")))
                  }
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
