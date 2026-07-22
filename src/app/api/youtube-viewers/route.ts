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
        const searchUrl = `https://www.youtube.com/results?search_query=${videoId}`;
        const response = await fetch(searchUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9",
            "Cookie": "SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg"
          }
        });
        const html = await response.text();
        const matchData = html.match(/ytInitialData\s*=\s*({.+?});/);
        if (!matchData) return 0;

        const data = JSON.parse(matchData[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];

        let viewers = 0;
        contents.forEach((sec: any) => {
          const items = sec.itemSectionRenderer?.contents || [];
          items.forEach((item: any) => {
            const v = item.videoRenderer;
            if (v && v.videoId === videoId) {
              const runs = v.viewCountText?.runs || [];
              const rawText = runs.map((r: any) => r.text).join('') || v.viewCountText?.simpleText || '';
              
              if (rawText.toLowerCase().includes('assistindo') || rawText.toLowerCase().includes('watching')) {
                const cleanedDigits = rawText.replace(/[^0-9]/g, '');
                if (cleanedDigits) viewers = parseInt(cleanedDigits, 10);
              }
            }
          });
        });

        return viewers;
      } catch (e) {
        console.warn(`Error fetching YT viewers for ${videoId}:`, e);
        return 0;
      }
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
