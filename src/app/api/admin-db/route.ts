import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, data } = body;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://api.rodeoapp.pro';
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIiwiaXNzIjoic3VwYWJhc2UiLCJpYXQiOjE3ODAxMTczNjAsImV4cCI6MjA5NTQ3NzM2MH0.Bry4zMkU1QeOJYRiu60Vp-VdNak_sJZYc-tEx20pXFM';

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({ success: false, error: "Missing env variables" }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "insert-sponsor") {
      const { error } = await supabase.from("patrocinios").insert(data);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "delete-sponsor") {
      const { error } = await supabase.from("patrocinios").delete().eq("id", data.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "update-sponsor") {
      const { error } = await supabase.from("patrocinios").update(data.updates).eq("id", data.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "toggle-sponsor-status") {
      const { error } = await supabase.from("patrocinios").update({ status: data.status }).eq("id", data.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "insert-expense") {
      const { error } = await supabase.from("despesas").insert(data);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "delete-expense") {
      const { error } = await supabase.from("despesas").delete().eq("id", data.id);
      if (error) throw error;
      return NextResponse.json({ success: true });
    }

    if (action === "select-sponsors") {
      const { data, error } = await supabase.from("patrocinios").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    if (action === "select-expenses") {
      const { data, error } = await supabase.from("despesas").select("*").order("data", { ascending: false });
      if (error) throw error;
      return NextResponse.json({ success: true, data });
    }

    return NextResponse.json({ success: false, error: "Invalid action" }, { status: 400 });
  } catch (err: any) {
    console.error("Admin DB API Error:", err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
