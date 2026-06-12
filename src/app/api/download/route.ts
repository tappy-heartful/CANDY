import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get("url");
    const name = searchParams.get("name") || "download.jpg";

    if (!url) {
      return new NextResponse("Missing url parameter", { status: 400 });
    }

    // セキュリティ制限: Firebase Storage のドメインからのダウンロードのみを許可
    if (!url.startsWith("https://firebasestorage.googleapis.com/")) {
      return new NextResponse("Unauthorized download source", { status: 403 });
    }

    const res = await fetch(url);
    if (!res.ok) {
      return new NextResponse("Failed to fetch image", { status: 500 });
    }

    const blob = await res.blob();
    const headers = new Headers();
    headers.set("Content-Type", blob.type || "image/jpeg");
    
    // ファイル名をエンコードして Content-Disposition にセット (強制ダウンロードをトリガー)
    const encodedName = encodeURIComponent(name);
    headers.set("Content-Disposition", `attachment; filename*=UTF-8''${encodedName}`);

    return new NextResponse(blob, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return new NextResponse("Internal server error", { status: 500 });
  }
}
