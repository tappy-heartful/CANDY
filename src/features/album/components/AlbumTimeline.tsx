"use client";

import { useEffect, useState } from "react";
import type { Photo } from "../api/album-client-service";
import styles from "./AlbumTimeline.module.css";

interface TimelineGroup {
  dateStr: string;
  rawDate: string;
  photos: Photo[];
}

interface AlbumTimelineProps {
  photos: Photo[];
}

export default function AlbumTimeline({ photos }: AlbumTimelineProps) {
  const [timelineGroups, setTimelineGroups] = useState<TimelineGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<TimelineGroup | null>(null);
  const [activePhoto, setActivePhoto] = useState<Photo | null>(null);

  useEffect(() => {
    if (photos.length === 0) {
      setTimelineGroups([]);
      return;
    }

    // 日付ごとにグループ化
    const groups: { [key: string]: Photo[] } = {};
    photos.forEach((photo) => {
      const timestamp = photo.takenAt || photo.createdAt;
      const dateObj = new Date(timestamp);
      const rawDate = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, "0")}-${String(dateObj.getDate()).padStart(2, "0")}`;
      if (!groups[rawDate]) {
        groups[rawDate] = [];
      }
      groups[rawDate].push(photo);
    });

    // タイムライングループの作成と日付降順ソート
    const sortedGroups = Object.entries(groups)
      .map(([rawDate, groupPhotos]) => {
        const dateObj = new Date(rawDate);
        const dateStr = dateObj.toLocaleDateString("ja-JP", {
          year: "numeric",
          month: "long",
          day: "numeric",
          weekday: "short"
        });
        return {
          dateStr,
          rawDate,
          photos: groupPhotos,
        };
      })
      .sort((a, b) => b.rawDate.localeCompare(a.rawDate));

    setTimelineGroups(sortedGroups);
  }, [photos]);

  if (photos.length === 0) {
    return (
      <div className={styles.emptyContainer}>
        <div className={styles.emptyCard}>
          <i className="fa-solid fa-timeline" style={{ fontSize: "3rem", color: "#F7A8C4", marginBottom: "15px" }}></i>
          <p className={styles.emptyText}>思い出のタイムラインはまだ空っぽです。</p>
          <p className={styles.emptySubText}>
            アルバムに写真をアップロードすると、こちらに日付ごとに自動で美しく整理されます。🍬
          </p>
        </div>
      </div>
    );
  }

  // ライトボックス内での次の画像・前の画像
  const activeIndex = activePhoto && selectedGroup 
    ? selectedGroup.photos.findIndex((p) => p.id === activePhoto.id) 
    : -1;

  const handlePrevPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedGroup || activeIndex <= 0) return;
    setActivePhoto(selectedGroup.photos[activeIndex - 1]);
  };

  const handleNextPhoto = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedGroup || activeIndex === -1 || activeIndex >= selectedGroup.photos.length - 1) return;
    setActivePhoto(selectedGroup.photos[activeIndex + 1]);
  };

  return (
    <div className={styles.timelineContainer}>
      <div className={styles.timelineLine}></div>
      <div className={styles.timelineList}>
        {timelineGroups.map((group) => (
          <div key={group.rawDate} className={styles.timelineItem}>
            {/* タイムラインのノード点 */}
            <div className={styles.timelineNode}>
              <i className="fa-solid fa-heart"></i>
            </div>
            
            {/* カード本体 */}
            <TimelineCard group={group} onClick={() => setSelectedGroup(group)} />
          </div>
        ))}
      </div>

      {/* 思い出写真一覧モーダル */}
      {selectedGroup && (
        <div className={styles.modalOverlay} onClick={() => setSelectedGroup(null)}>
          <div className={styles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>
                <i className="fa-solid fa-calendar-days" style={{ color: "#F7A8C4", marginRight: "8px" }}></i>
                {selectedGroup.dateStr}
                <span className={styles.modalCountBadge}>{selectedGroup.photos.length}枚</span>
              </div>
              <button className={styles.modalClose} onClick={() => setSelectedGroup(null)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            
            <div className={styles.modalPhotoGrid}>
              {selectedGroup.photos.map((photo) => (
                <div 
                  key={photo.id} 
                  className={styles.modalPhotoItem}
                  onClick={() => setActivePhoto(photo)}
                >
                  <img src={photo.url} alt="detail preview" className={styles.modalPhotoImg} />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ライトボックス (拡大表示) */}
      {activePhoto && selectedGroup && (
        <div className={styles.lightboxOverlay} onClick={() => setActivePhoto(null)}>
          <button className={styles.lightboxClose} onClick={() => setActivePhoto(null)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
          
          {activeIndex > 0 && (
            <button className={styles.lightboxPrev} onClick={handlePrevPhoto}>
              <i className="fa-solid fa-chevron-left"></i>
            </button>
          )}
          
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            <img src={activePhoto.url} alt="zoomed preview" className={styles.lightboxImg} />
            <div className={styles.lightboxInfo}>
              {activeIndex + 1} / {selectedGroup.photos.length}
            </div>
          </div>

          {activeIndex < selectedGroup.photos.length - 1 && (
            <button className={styles.lightboxNext} onClick={handleNextPhoto}>
              <i className="fa-solid fa-chevron-right"></i>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// 個別の日付カードコンポーネント (画像シャッフルのため別コンポーネント化)
function TimelineCard({ group, onClick }: { group: TimelineGroup; onClick: () => void }) {
  const [collagePhotos, setCollagePhotos] = useState<Photo[]>([]);

  useEffect(() => {
    // マウント時に写真をランダムにシャッフルして最大4枚を抽出
    const shuffled = [...group.photos].sort(() => 0.5 - Math.random());
    setCollagePhotos(shuffled.slice(0, 4));
  }, [group.photos]);

  return (
    <div className={styles.timelineCard} onClick={onClick}>
      <div className={styles.cardHeader}>
        <span className={styles.dateText}>{group.dateStr}</span>
        <span className={styles.photoCount}>{group.photos.length}枚の思い出</span>
      </div>

      <div className={`${styles.collageGrid} ${styles[`grid-${collagePhotos.length}`]}`}>
        {collagePhotos.map((photo) => (
          <div key={photo.id} className={styles.collageItem}>
            <img src={photo.url} alt="collage preview" className={styles.collageImg} />
          </div>
        ))}
      </div>
    </div>
  );
}
