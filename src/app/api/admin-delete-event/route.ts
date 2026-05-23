import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "No ID provided" }, { status: 400 });
    
    const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
    const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1Nzc3OSwiZXhwIjoyMDk0MTMzNzc5fQ.TvSTk7fQjKqZM9T8Qx5aRkepE0OwsnmVR_qaP2yQ0VU';
    
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
