"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import type { Photo } from "../api/album-client-service";
import styles from "./AlbumMap.module.css";

interface AlbumMapProps {
  photos: Photo[];
}

export default function AlbumMap({ photos }: AlbumMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<L.Map | null>(null);

  const handleLocateUser = () => {
    if (!navigator.geolocation || !leafletMap.current) {
      alert("位置情報の取得がサポートされていません。");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        if (leafletMap.current) {
          leafletMap.current.setView([latitude, longitude], 15);
        }
      },
      (error) => {
        console.error("Error getting geolocation:", error);
        alert("現在地の取得に失敗しました。GPSまたはブラウザの設定を確認してください。");
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  // 位置情報のある写真のみを抽出
  const validPhotos = photos.filter(
    (p) => typeof p.latitude === "number" && typeof p.longitude === "number"
  );

  useEffect(() => {
    if (!mapRef.current || validPhotos.length === 0) return;

    // 誤差約10m〜50mの範囲で座標を集約する簡易クラスタリング
    interface LocationGroup {
      latitude: number;
      longitude: number;
      photos: Photo[];
    }

    const getCoordsKey = (lat: number, lon: number) => {
      return `${lat.toFixed(4)}_${lon.toFixed(4)}`;
    };

    const groupsMap: { [key: string]: LocationGroup } = {};
    validPhotos.forEach((photo) => {
      const key = getCoordsKey(photo.latitude!, photo.longitude!);
      if (!groupsMap[key]) {
        groupsMap[key] = {
          latitude: photo.latitude!,
          longitude: photo.longitude!,
          photos: [],
        };
      }
      groupsMap[key].photos.push(photo);
    });

    const locationGroups = Object.values(groupsMap);

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

    // Safariなどでのタイル読み込みレイアウト崩れを防ぐためのサイズ再計算
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 100);

    // OpenStreetMapタイルを設定
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    const markers: L.Marker[] = [];

    locationGroups.forEach((group) => {
      // その座標の最新の写真を取得（撮影日時が最も新しいもの）
      const sortedPhotos = [...group.photos].sort((a, b) => (b.takenAt || b.createdAt) - (a.takenAt || a.createdAt));
      const latestPhoto = sortedPhotos[0];

      // 写真と枚数バッジを表示するHTMLを作成
      const icon = L.divIcon({
        className: styles.customMarker,
        html: `<div class="${styles.markerImageWrapper}">
                 <div class="${styles.markerImageContainer}" style="background-image: url('${latestPhoto.url}');"></div>
                 ${group.photos.length > 1 ? `<span class="${styles.markerBadge}">${group.photos.length}</span>` : ""}
               </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 48], // ピンの先端を中央下に合わせる
        popupAnchor: [0, -42]
      });

      const marker = L.marker([group.latitude, group.longitude], { icon }).addTo(map);

      // ポップアップ内にその場所のすべての写真を横スクロールで並べる
      const thumbsHtml = sortedPhotos.map((photo) => `
        <div class="${styles.popupPhotoItem}">
          <div class="${styles.popupImageWrapper}">
            <img src="${photo.url}" class="${styles.popupImage}" alt="photo preview" />
          </div>
        </div>
      `).join('');

      marker.bindPopup(`
        <div class="${styles.popupContainer}">
          <div class="${styles.popupHeader}">
            <i class="fa-solid fa-location-dot"></i>
            <span>思い出の場所 (${group.photos.length}枚)</span>
          </div>
          <div class="${styles.popupScrollContainer}">
            ${thumbsHtml}
          </div>
        </div>
      `, {
        maxWidth: 240,
        minWidth: 200
      });
      
      markers.push(marker);
    });

    // 複数ピンがある場合は自動的にすべてのピンが収まる範囲にする
    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.15));
    }

    return () => {
      clearTimeout(timer);
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
      <button className={styles.gpsBtn} onClick={handleLocateUser} title="現在地を表示">
        <i className="fa-solid fa-location-crosshairs"></i>
      </button>
    </div>
  );
}
