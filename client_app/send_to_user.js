const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const channel = supabase.channel("rodeo-force-update-channel");
  
  channel.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      console.log('Sending broadcast...');
      await channel.send({
        type: "broadcast",
        event: "force-update",
        payload: { email: "g7briell@hotmail.com" }
      });
      console.log('Broadcast sent!');
      setTimeout(() => process.exit(0), 1000);
    }
  });
}

run();
