const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1Nzc3OSwiZXhwIjoyMDk0MTMzNzc5fQ.TvSTk7fQjKqZM9T8Qx5aRkepE0OwsnmVR_qaP2yQ0VU';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log("Fixing RLS policies...");

  // Since we can't easily alter policies via Supabase JS without executing SQL,
  // we can use the service role key to delete directly if we wanted, 
  // but we can't change RLS policies through the JS client easily.
  // Wait, can we? No, we need pg_query or SQL.
  
  // Alternatively, the best way to fix the Admin panel delete bug is to use 
  // the service role key in the admin panel backend? The admin panel is a client component right now.
  // Actually, I can just write an API route for the Admin Panel!
  
  // Let's first backfill the director name for existing events
  const { data: eventos, error: evError } = await supabase.from('eventos_oficiais').select('*');
  const { data: licencas, error: licError } = await supabase.from('licencas').select('email, nome');

  for (let ev of eventos) {
    if (!ev.detalhes) ev.detalhes = {};
    if (!ev.detalhes.diretor || ev.detalhes.diretor === ev.organizador_email) {
      const lic = licencas.find(l => l.email === ev.organizador_email);
      if (lic && lic.nome) {
        ev.detalhes.diretor = lic.nome;
        await supabase.from('eventos_oficiais').update({ detalhes: ev.detalhes }).eq('id', ev.id);
        console.log("Updated event", ev.nome, "with director", lic.nome);
      }
    }
  }

  console.log("Data backfill done.");
}

run();
