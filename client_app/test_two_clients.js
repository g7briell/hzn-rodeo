const { createClient } = require('@supabase/supabase-js');

const supabase1 = createClient('https://scivakieachwewdhnuhv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk');
const supabase2 = createClient('https://scivakieachwewdhnuhv.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk');

async function run() {
  const channel1 = supabase1.channel("rodeo-realtime-channel-test-chain");
  
  channel1
    .on('broadcast', { event: 'evt1' }, (payload) => console.log('EVT1 RECEIVED'))
    .on('broadcast', { event: 'evt2' }, (payload) => console.log('EVT2 RECEIVED'))
    .on('broadcast', { event: '*' }, (payload) => console.log('WILDCARD RECEIVED', payload.event));

  channel1.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      const channel2 = supabase2.channel("rodeo-realtime-channel-test-chain");
      channel2.subscribe(async (s2) => {
        if (s2 === 'SUBSCRIBED') {
          console.log('Sending broadcast evt1...');
          await channel2.send({ type: "broadcast", event: "evt1", payload: {} });
          
          console.log('Sending broadcast evt2...');
          await channel2.send({ type: "broadcast", event: "evt2", payload: {} });
          
          setTimeout(() => process.exit(0), 2000);
        }
      });
    }
  });
}

run();
