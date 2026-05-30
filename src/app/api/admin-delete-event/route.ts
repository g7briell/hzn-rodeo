import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.rodeoapp.pro';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODAxMTczNjAsImV4cCI6MjA5NTQ3NzM2MH0.Bry4zMkU1QeOJYRiu60Vp-VdNak_sJZYc-tEx20pXFM';
    
    if (!supabaseUrl || !supabaseServiceKey) {
       return NextResponse.json({ error: "Missing env variables" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { error } = await supabase.from('eventos_oficiais').delete().eq('id', id);
    if (error) throw error;
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin delete event error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
