"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Photo } from "../api/album-client-service";
import styles from "./AlbumMap.module.css";

interface AlbumMapProps {
  photos: Photo[];
}

export default function AlbumMap({ photos }: AlbumMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  // 位置情報のある写真のみを抽出
  const validPhotos = photos.filter(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
  );

  useEffect(() => {
    if (!mapRef.current || validPhotos.length === 0) return;

    // 既に地図インスタンスが存在する場合は一度破棄する
    if (leafletMap.current) {
      leafletMap.current.remove();
    }

    // 初期中心点は最初の写真の位置情報、なければ東京
    const initialCenter: L.LatLngExpression = [
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

    const markers: L.Marker[] = [];

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
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [photos, validPhotos.length]);

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
      <div ref={mapRef} className={styles.mapElement} />
    </div>
  );
}
