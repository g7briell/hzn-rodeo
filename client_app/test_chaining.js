const { createClient } = require('@supabase/supabase-js');

const supabase = createClient('https://scivakieachwewdhnuhv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk');

async function run() {
  const channel = supabase.channel("rodeo-realtime-channel-test-chain");
  
  channel
    .on('broadcast', { event: 'evt1' }, (payload) => {
      console.log('EVT1 RECEIVED:', payload.event);
    })
    .on('broadcast', { event: 'evt2' }, (payload) => {
      console.log('EVT2 RECEIVED:', payload.event);
    });

  channel.subscribe(async (status) => {
    console.log('Status:', status);
    if (status === 'SUBSCRIBED') {
      console.log('Sending broadcast evt1...');
      await channel.send({ type: "broadcast", event: "evt1", payload: {} });
      
      console.log('Sending broadcast evt2...');
      await channel.send({ type: "broadcast", event: "evt2", payload: {} });
      
      setTimeout(() => process.exit(0), 2000);
    }
  });
}

run();
