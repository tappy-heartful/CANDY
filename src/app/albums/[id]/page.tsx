import AlbumDetailClient from "@/src/features/album/views/AlbumDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AlbumDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AlbumDetailClient albumId={id} />;
}
