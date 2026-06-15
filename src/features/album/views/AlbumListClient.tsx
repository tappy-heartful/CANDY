"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import AuthGuard from "@/src/components/AuthGuard";
import { useAuth } from "@/src/contexts/AuthContext";
import { useBreadcrumb } from "@/src/contexts/BreadcrumbContext";
import {
  getAlbums,
  createAlbum,
  getPhotos,
  getPrefectures,
  getMunicipalities,
  Album,
  Photo,
  Prefecture,
  Municipality
} from "../api/album-client-service";
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

  const formatDateDisplay = (album: Album) => {
    if (!album.startDate) return null;
    const start = album.startDate.replace(/-/g, "/");
    if (album.dateMode === "range" && album.endDate) {
      const end = album.endDate.replace(/-/g, "/");
      return `${start} 〜 ${end}`;
    }
    return start;
  };

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
        {formatDateDisplay(album) && (
          <div className={styles.albumDate}>
            <i className="fa-regular fa-calendar" style={{ marginRight: "4px", color: "#9B7CC3" }}></i>
            <span>{formatDateDisplay(album)}</span>
          </div>
        )}
        {(album.prefectureName || album.municipalityName) && (
          <div className={styles.albumLocation}>
            <i className="fa-solid fa-location-dot" style={{ marginRight: "4px", color: "#F7A8C4" }}></i>
            <span>
              {album.prefectureName || ""} {album.municipalityName || ""}
            </span>
          </div>
        )}
      </div>
    </Link>
  );
}

const getTodayString = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function AlbumListClient() {
  const { user } = useAuth();
  const { setBreadcrumbs } = useBreadcrumb();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  
  // モーダル用状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefectures, setPrefectures] = useState<Prefecture[]>([]);
  const [municipalities, setMunicipalities] = useState<Municipality[]>([]);
  const [selectedPrefCode, setSelectedPrefCode] = useState("");
  const [selectedMuniCode, setSelectedMuniCode] = useState("");

  // 日付設定用の状態
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [startDate, setStartDate] = useState(getTodayString());
  const [endDate, setEndDate] = useState(getTodayString());

  useEffect(() => {
    if (isModalOpen && prefectures.length === 0) {
      getPrefectures()
        .then((data) => setPrefectures(data))
        .catch((e) => console.error("Failed to fetch prefectures:", e));
    }
  }, [isModalOpen, prefectures]);

  const handlePrefChange = async (prefCode: string) => {
    setSelectedPrefCode(prefCode);
    setSelectedMuniCode("");
    setMunicipalities([]);
    if (!prefCode) return;

    try {
      const data = await getMunicipalities(prefCode);
      setMunicipalities(data);
    } catch (e) {
      console.error("Failed to fetch municipalities:", e);
    }
  };

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
      const pref = prefectures.find((p) => String(p.code).padStart(2, "0") === selectedPrefCode);
      const muni = municipalities.find((m) => m.code === selectedMuniCode);

      await createAlbum(
        trimmedName,
        user.uid,
        selectedPrefCode || undefined,
        pref?.name || undefined,
        selectedMuniCode || undefined,
        muni?.name || undefined,
        dateMode,
        startDate,
        dateMode === "range" ? endDate : undefined
      );
      setNewAlbumName("");
      setSelectedPrefCode("");
      setSelectedMuniCode("");
      setMunicipalities([]);
      setDateMode("single");
      setStartDate(getTodayString());
      setEndDate(getTodayString());
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
          <div
            className={styles.dialogOverlay}
            onClick={() => {
              setNewAlbumName("");
              setSelectedPrefCode("");
              setSelectedMuniCode("");
              setMunicipalities([]);
              setDateMode("single");
              setStartDate(getTodayString());
              setEndDate(getTodayString());
              setIsModalOpen(false);
            }}
          >
            <div className={styles.dialogBox} onClick={(e) => e.stopPropagation()}>
              <div className={styles.dialogTitle}>
                <i className="fa-solid fa-folder-plus" style={{ color: "#F7A8C4" }}></i>
                新規アルバム作成
              </div>
              <div className={styles.dialogFormGroup}>
                <label className={styles.dialogLabel}>アルバム名</label>
                <input
                  type="text"
                  className={styles.dialogInput}
                  placeholder="アルバム名を入力してください"
                  value={newAlbumName}
                  onChange={(e) => setNewAlbumName(e.target.value.slice(0, 20))}
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
                      name="dateMode"
                      value="single"
                      checked={dateMode === "single"}
                      onChange={() => setDateMode("single")}
                    />
                    <span>1日のみ</span>
                  </label>
                  <label className={styles.radioLabel}>
                    <input
                      type="radio"
                      name="dateMode"
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
                    setNewAlbumName("");
                    setSelectedPrefCode("");
                    setSelectedMuniCode("");
                    setMunicipalities([]);
                    setDateMode("single");
                    setStartDate(getTodayString());
                    setEndDate(getTodayString());
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
