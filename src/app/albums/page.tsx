import AlbumListClient from "@/src/features/album/views/AlbumListClient";

export const metadata = {
  title: "アルバム | CANDY",
  description: "ふたりの写真アルバム",
};

export default function AlbumsPage() {
  return <AlbumListClient />;
}
