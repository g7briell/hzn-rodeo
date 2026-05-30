const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://scivakieachwewdhnuhv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk');
async function test() {
  const { data } = await supabase.from('eventos_oficiais').select('*');
  let found = null;
  data.forEach(e => {
    if (e.detalhes && e.detalhes.noticias) {
      const n = e.detalhes.noticias.find(x => x.id === '1780104790182');
      if (n) found = n;
    }
  });
  console.log(JSON.stringify(found, null, 2));
}
test();
