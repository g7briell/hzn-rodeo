import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { videoUrls } = await req.json();

    if (!Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ success: true, viewersMap: {} });
    }

    const fetchViewersForUrl = async (rawUrl: string) => {
      if (!rawUrl || typeof rawUrl !== "string") return 0;
      const matchId = rawUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/);
      if (!matchId || !matchId[1]) return 0;
      const videoId = matchId[1];

      try {
        // Method 1: youtubei/v1/updated_metadata (returns live concurrent viewers directly)
        const res = await fetch("https://www.youtube.com/youtubei/v1/updated_metadata", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "WEB",
                clientVersion: "2.20240501.00.00"
              }
            },
            videoId: videoId
          })
        });

        if (res.ok) {
          const data = await res.json();
          const actions = data.actions || [];
          for (const action of actions) {
            const vRenderer = action.updateViewershipAction?.viewCount?.videoViewCountRenderer;
            if (vRenderer) {
              const text = vRenderer.unlabeledViewCountValue?.simpleText || 
                           vRenderer.extraShortViewCount?.simpleText || 
                           vRenderer.originalViewCount || 
                           vRenderer.viewCount?.simpleText || "";
              const digits = text.replace(/[^0-9]/g, "");
              if (digits) return parseInt(digits, 10);
            }
          }
        }

        // Method 2 Fallback: youtubei/v1/player
        const resPlayer = await fetch("https://www.youtube.com/youtubei/v1/player", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
          },
          body: JSON.stringify({
            context: {
              client: {
                clientName: "WEB",
                clientVersion: "2.20240501.00.00"
              }
            },
            videoId: videoId
          })
        });

        if (resPlayer.ok) {
          const dataPlayer = await resPlayer.json();
          const viewCountStr = dataPlayer.videoDetails?.viewCount || dataPlayer.microformat?.playerMicroformatRenderer?.viewCount;
          if (viewCountStr) {
            const digits = viewCountStr.replace(/[^0-9]/g, "");
            if (digits) return parseInt(digits, 10);
          }
        }
      } catch (e) {
        console.warn(`Error fetching YT viewers for ${videoId}:`, e);
      }
      return 0;
    };

    const viewersMap: { [key: string]: number } = {};
    await Promise.all(
      videoUrls.map(async (urlStr: string) => {
        const count = await fetchViewersForUrl(urlStr);
        viewersMap[urlStr] = count;
      })
    );

    return NextResponse.json({
      success: true,
      viewersMap
    });
  } catch (err: any) {
    console.error("Error in /api/youtube-viewers:", err);
    return NextResponse.json({ error: err.message || "Erro ao buscar espectadores" }, { status: 500 });
  }
}
