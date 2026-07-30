"use client";

import { useEffect, useRef, useState } from "react";
import type { Photo } from "../api/album-client-service";
import styles from "./AlbumMap.module.css";

// window に L (Leaflet) が定義されていると想定
declare global {
  interface Window {
    L: any;
  }
}

interface AlbumMapProps {
  photos: Photo[];
}

export default function AlbumMap({ photos }: AlbumMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);

  // 位置情報のある写真のみを抽出
  const validPhotos = photos.filter(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
  );

  useEffect(() => {
    if (window.L) {
      setIsLeafletLoaded(true);
      return;
    }

    // CSSの動的ロード
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);

    // JSの動的ロード
    const script = document.createElement("script");
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => {
      setIsLeafletLoaded(true);
    };
    document.body.appendChild(script);

    return () => {
      document.head.removeChild(link);
      document.body.removeChild(script);
    };
  }, []);

  useEffect(() => {
    if (!isLeafletLoaded || !mapRef.current || !window.L || validPhotos.length === 0) return;

    const L = window.L;

    // 既に地図インスタンスが存在する場合は一度破棄する
    if (leafletMap.current) {
      leafletMap.current.remove();
    }

    // 初期中心点は最初の写真の位置情報、なければ東京
    const initialCenter = [
      validPhotos[0].latitude!,
      validPhotos[0].longitude!
    ];

    const map = L.map(mapRef.current, {
      zoomControl: true,
      scrollWheelZoom: true,
    }).setView(initialCenter, 12);
    leafletMap.current = map;

    // OpenStreetMapタイルを設定
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markers: any[] = [];

    validPhotos.forEach((photo) => {
      // 写真をマーカーのアイコンとして表示
      const icon = L.divIcon({
        className: styles.customMarker,
        html: `<div class="${styles.markerImageWrapper}">
                 <img src="${photo.url}" class="${styles.markerImage}" alt="photo" />
               </div>`,
        iconSize: [46, 46],
        iconAnchor: [23, 46], // ピンの先端を中央下に合わせる
        popupAnchor: [0, -40]
      });

      const marker = L.marker([photo.latitude!, photo.longitude!], { icon }).addTo(map);

      // ポップアップの設定
      marker.bindPopup(`
        <div class="${styles.popupContainer}">
          <div class="${styles.popupImageWrapper}">
            <img src="${photo.url}" class="${styles.popupImage}" alt="photo preview" />
          </div>
          <div class="${styles.popupContent}">
            <p class="${styles.popupDate}">
              <i class="fa-regular fa-calendar"></i>
              ${new Date(photo.takenAt || photo.createdAt).toLocaleDateString("ja-JP")}
            </p>
            <a href="/albums/${photo.albumId}" class="${styles.popupButton}">
              <i class="fa-solid fa-images"></i>
              アルバムを見る
            </a>
          </div>
        </div>
      `);
      
      markers.push(marker);
    });

    // 複数ピンがある場合は自動的にすべてのピンが収まる範囲にする
    if (markers.length > 0) {
      const group = new L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [isLeafletLoaded, photos, validPhotos.length]);

  if (validPhotos.length === 0) {
    return (
      <div className={styles.emptyMapContainer}>
        <div className={styles.emptyCard}>
          <i className="fa-solid fa-map-location-dot" style={{ fontSize: "3rem", color: "#F7A8C4", marginBottom: "15px" }}></i>
          <p className={styles.emptyText}>
            位置情報（GPS）が含まれる写真をアップロードすると、こちらに優しくマッピングされます。
          </p>
          <p className={styles.emptySubText}>
            スマートフォンで撮影した位置情報付きの写真（JPEGなど）をアルバムに追加することで、思い出の場所がこの地図上に綺麗に表示されます。🍬
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.mapOuterContainer}>
      {!isLeafletLoaded && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <span>地図データを準備しています...</span>
        </div>
      )}
      <div ref={mapRef} className={styles.mapElement} />
    </div>
  );
}
