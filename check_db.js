const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase.from('eventos_oficiais').select('id, nome, detalhes');
  if (error) {
    console.error(error);
  } else {
    data.forEach(d => {
      console.log(`Evento: ${d.nome}`);
      const detalhes = typeof d.detalhes === 'string' ? JSON.parse(d.detalhes) : (d.detalhes || {});
      console.log(`portalConfig:`, detalhes.portalConfig);
    });
  }
}
run();
