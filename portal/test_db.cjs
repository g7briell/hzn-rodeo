const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://scivakieachwewdhnuhv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk');
async function test() {
  const { data, error } = await supabase.from('patrocinios').select('*').eq('tipo', 'portal');
  console.log('Portal Ads:', data);
  const { data: appAds, error: err2 } = await supabase.from('patrocinios').select('*').eq('tipo', 'app');
  console.log('App Ads:', appAds);
}
test();
