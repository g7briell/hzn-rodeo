import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { customUrl, query } = await req.json();

    // 1. If custom YouTube URL provided, fetch single video info via oEmbed
    if (customUrl && typeof customUrl === "string" && customUrl.trim()) {
      const trimmed = customUrl.trim();
      const ytIdMatch = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|live\/))([a-zA-Z0-9_-]{11})/);
      
      if (!ytIdMatch || !ytIdMatch[1]) {
        return NextResponse.json({ error: "Link do YouTube inválido. Verifique a URL digitada." }, { status: 400 });
      }

      const videoId = ytIdMatch[1];
      const videoLink = `https://www.youtube.com/watch?v=${videoId}`;
      const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

      let title = `Transmissão ao Vivo (${videoId})`;
      let channel = "YouTube";

      try {
        const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(videoLink)}&format=json`;
        const oembedRes = await fetch(oembedUrl);
        if (oembedRes.ok) {
          const oembedData = await oembedRes.json();
          if (oembedData.title) title = oembedData.title;
          if (oembedData.author_name) channel = oembedData.author_name;
        }
      } catch (e) {
        console.warn("oEmbed lookup failed, using fallback title", e);
      }

      return NextResponse.json({
        success: true,
        customVideo: {
          videoId,
          titulo: title,
          channel,
          thumbnail,
          link: videoLink,
          isLive: true,
          selected: true
        }
      });
    }

    // 2. Search YouTube strictly for streams that are CURRENTLY LIVE NOW (&sp=CAMSAkAB)
    const searchQueries = [
      query || "rodeio ao vivo",
      "festa do peao ao vivo",
      "montarias em touro ao vivo",
      "laco comprido ao vivo",
      "vaquejada ao vivo"
    ];

    const fetchSearchForQuery = async (queryStr: string) => {
      try {
        const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(queryStr)}&sp=CAMSAkAB`;
        const response = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
            "Accept-Language": "pt-BR,pt;q=0.9",
            "Cookie": "SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg"
          }
        });
        const html = await response.text();
        const match = html.match(/ytInitialData\s*=\s*({.+?});/);
        if (!match) return [];
        const data = JSON.parse(match[1]);
        const contents = data.contents?.twoColumnSearchResultsRenderer?.primaryContents?.sectionListRenderer?.contents || [];
        const videos: any[] = [];
        
        contents.forEach((sec: any) => {
          const items = sec.itemSectionRenderer?.contents || [];
          items.forEach((item: any) => {
            const v = item.videoRenderer;
            if (v && v.videoId) {
              const title = v.title?.runs?.[0]?.text || v.title?.simpleText || "";
              const channel = v.ownerText?.runs?.[0]?.text || "";
              const thumbnail = `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`;

              // Strict check: Only videos currently streaming live right now
              const overlays = v.thumbnailOverlays || [];
              const isLiveOverlay = overlays.some((o: any) => o.thumbnailOverlayTimeStatusRenderer?.style === "LIVE");
              
              const badges = v.badges || [];
              const isLiveBadge = badges.some((b: any) => 
                b.metadataBadgeRenderer?.style === "BADGE_STYLE_TYPE_LIVE_NOW" || 
                (b.metadataBadgeRenderer?.label || "").toLowerCase().includes("ao vivo agora") ||
                (b.metadataBadgeRenderer?.label || "").toLowerCase() === "ao vivo"
              );

              const viewText = (v.viewCountText?.runs?.[0]?.text || v.viewCountText?.simpleText || "").toLowerCase();
              const isLiveViewText = viewText.includes("assistindo") || viewText.includes("watching");

              const isCurrentlyLive = isLiveOverlay || isLiveBadge || isLiveViewText;

              if (!isCurrentlyLive) return; // Filter out ended / recorded streams!

              // Relevance check for rodeo / festa do peao / touros / vaquejada / laco
              const lowerTitle = title.toLowerCase();
              const lowerChannel = channel.toLowerCase();
              const isRodeoRelated = 
                lowerTitle.includes("rodeio") || lowerTitle.includes("rodeo") || lowerTitle.includes("peao") || lowerTitle.includes("peão") ||
                lowerTitle.includes("touro") || lowerTitle.includes("laço") || lowerTitle.includes("laco") || lowerTitle.includes("vaquejada") ||
                lowerChannel.includes("rodeo") || lowerChannel.includes("rozeta") || lowerChannel.includes("acr") || lowerChannel.includes("crp") ||
                lowerChannel.includes("vaquejada") || lowerChannel.includes("laço") || lowerChannel.includes("laco") || lowerChannel.includes("festa");

              if (!isRodeoRelated) return; // Filter out unrelated live streams!

              videos.push({
                videoId: v.videoId,
                titulo: title,
                channel,
                thumbnail,
                isLive: true,
                link: `https://www.youtube.com/watch?v=${v.videoId}`
              });
            }
          });
        });
        return videos;
      } catch (err) {
        console.warn(`Search failed for ${queryStr}:`, err);
        return [];
      }
    };

    const resultsArray = await Promise.all(searchQueries.map(q => fetchSearchForQuery(q)));
    const allVideos = resultsArray.flat();

    const map = new Set();
    const uniqueLiveVideos: any[] = [];
    allVideos.forEach(v => {
      if (!map.has(v.videoId)) {
        map.add(v.videoId);
        uniqueLiveVideos.push(v);
      }
    });

    return NextResponse.json({
      success: true,
      lives: uniqueLiveVideos
    });
  } catch (err: any) {
    console.error("Error in /api/search-lives:", err);
    return NextResponse.json({ error: err.message || "Erro ao buscar lives no YouTube" }, { status: 500 });
  }
}
