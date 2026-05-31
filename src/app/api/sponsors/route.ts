import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.rodeoapp.pro';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODAxMTczNjAsImV4cCI6MjA5NTQ3NzM2MH0.Bry4zMkU1QeOJYRiu60Vp-VdNak_sJZYc-tEx20pXFM';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { data, error } = await supabase
      .from("patrocinios")
      .select("*")
      .eq("status", "ativo")
      .order("created_at", { ascending: false });

    if (error) throw error;

    // Filter and map sponsors with app veiculation active
    const appSponsors = (data || [])
      .filter((sponsor: any) => {
        // Backwards compatibility for legacy sponsors
        if (!sponsor.detalhes || Object.keys(sponsor.detalhes).length === 0) {
          return sponsor.tipo === 'app';
        }
        return sponsor.detalhes?.splash_app?.ativo === true;
      })
      .map((sponsor: any) => {
        if (!sponsor.detalhes || Object.keys(sponsor.detalhes).length === 0) {
          return sponsor;
        }
        const splash = sponsor.detalhes.splash_app;
        const baseClickUrl = splash.click_url || '#';
        const finalClickUrl = baseClickUrl.split('#pos-')[0] + '#pos-' + (splash.posicao || '3');
        return {
          ...sponsor,
          logo_url: splash.logo_url || sponsor.logo_url,
          click_url: finalClickUrl,
          tipo: 'app'
        };
      });

    // Increment views for app sponsors
    if (appSponsors.length > 0) {
      for (const sponsor of appSponsors) {
        const currentViews = Number(sponsor.views_count || 0);
        await supabase
          .from("patrocinios")
          .update({ views_count: currentViews + 1 })
          .eq("id", sponsor.id);
      }
    }

    return NextResponse.json(appSponsors, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (err: any) {
    console.error("API Get Sponsors Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid sponsor IDs" }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.rodeoapp.pro';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODAxMTczNjAsImV4cCI6MjA5NTQ3NzM2MH0.Bry4zMkU1QeOJYRiu60Vp-VdNak_sJZYc-tEx20pXFM';

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Increment views_count for specified sponsor IDs (e.g. from news portal)
    for (const id of ids) {
      const { data } = await supabase
        .from("patrocinios")
        .select("views_count")
        .eq("id", id)
        .maybeSingle();

      const current = Number(data?.views_count || 0);
      await supabase
        .from("patrocinios")
        .update({ views_count: current + 1 })
        .eq("id", id);
    }

    return NextResponse.json({ success: true }, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type"
      }
    });
  } catch (err: any) {
    console.error("API Post Sponsors Impression Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}
