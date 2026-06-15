"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import type { Photo } from "@/src/features/album/api/album-client-service";
import styles from "./PhotoSlideshow.module.css";

interface PhotoSlideshowProps {
  photos: Photo[];
  albumsMap: Record<string, string>;
  myNickname: string;
  partnerNickname: string;
  partnerId: string | null;
  currentUserId: string;
}

export default function PhotoSlideshow({
  photos,
  albumsMap,
  myNickname,
  partnerNickname,
  partnerId,
  currentUserId,
}: PhotoSlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const getUploaderName = (photo: Photo) => {
    if (photo.uid === currentUserId) return myNickname;
    if (partnerId && photo.uid === partnerId) return partnerNickname;
    return "ゲスト";
  };

  const startTimer = () => {
    stopTimer();
    if (photos.length > 1) {
      timerRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
      }, 4000); // 4秒ごとに自動切り替え
    }
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    startTimer();
    return () => stopTimer();
  }, [photos]);

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopTimer();
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
    startTimer();
  };

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopTimer();
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
    startTimer();
  };

  const handleDotClick = (index: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    stopTimer();
    setCurrentIndex(index);
    startTimer();
  };

  if (photos.length === 0) {
    return (
      <div className={`${styles.slideshowContainer} candy-float-delay-1`}>
        <div className={styles.emptySlideshow}>
          <div className={styles.emptyIcon}>🍭</div>
          <div className={styles.emptyText}>
            まだ写真がありません。<br />
            アルバムにふたりの思い出を追加しましょう！
          </div>
          <Link href="/albums" className={styles.emptyLink}>
            アルバムを開く
          </Link>
        </div>
      </div>
    );
  }

  const activePhoto = photos[currentIndex];
  const albumName = albumsMap[activePhoto.albumId] || "アルバム";
  const uploader = getUploaderName(activePhoto);

  return (
    <div className={`${styles.slideshowContainer} candy-float-delay-1`}>
      <h2 className={styles.slideshowHeader}>
        <i className="fa-solid fa-camera-retro" style={{ color: "#F7A8C4", marginRight: "8px" }}></i>
        最近の思い出
      </h2>

      <Link href={`/albums/${activePhoto.albumId}`} className={styles.sliderWrapper}>
        <div className={styles.slideContainer}>
          {photos.map((photo, idx) => (
            <div
              key={photo.id}
              className={`${styles.slide} ${idx === currentIndex ? styles.slideActive : ""}`}
              style={{ backgroundImage: `url(${photo.url})` }}
            >
              {idx === currentIndex && (
                <div className={styles.slideOverlay}>
                  <div className={styles.photoInfo}>
                    <span className={styles.albumBadge}>
                      <i className="fa-solid fa-images" style={{ marginRight: "4px" }}></i>
                      {albumName}
                    </span>
                    <span className={styles.uploaderName}>
                      <i className="fa-solid fa-circle-user" style={{ marginRight: "4px" }}></i>
                      {uploader}
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}

          {photos.length > 1 && (
            <>
              <button className={`${styles.navBtn} ${styles.prevBtn}`} onClick={handlePrev}>
                <i className="fa-solid fa-chevron-left"></i>
              </button>
              <button className={`${styles.navBtn} ${styles.nextBtn}`} onClick={handleNext}>
                <i className="fa-solid fa-chevron-right"></i>
              </button>
            </>
          )}
        </div>
      </Link>

      {photos.length > 1 && (
        <div className={styles.dotsContainer}>
          {photos.map((_, idx) => (
            <button
              key={idx}
              className={`${styles.dot} ${idx === currentIndex ? styles.dotActive : ""}`}
              onClick={(e) => handleDotClick(idx, e)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
