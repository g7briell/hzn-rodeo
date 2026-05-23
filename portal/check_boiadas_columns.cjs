const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODU1Nzc3OSwiZXhwIjoyMDk0MTMzNzc5fQ.TvSTk7fQjKqZM9T8Qx5aRkepE0OwsnmVR_qaP2yQ0VU';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  try {
    // We can fetch one row to inspect keys
    const { data, error } = await supabase.from('boiadas_oficiais').select('*').limit(1);
    if (error) {
      console.error(error);
    } else {
      console.log('Row data:', data);
    }
  } catch (err) {
    console.error(err);
  }
}

run();
