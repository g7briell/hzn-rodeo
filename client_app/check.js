const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://scivakieachwewdhnuhv.supabase.co';
const SUPABASE_KEY = 'sb_publishable_wX-v1S8OjLldjbwEQYaXVw_1ot31zcH';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function run() {
  const { data, error } = await supabase.from('licencas').select('*').limit(1);
  if (error) console.error(error);
  if (data && data.length > 0) {
    console.log(Object.keys(data[0]));
  } else {
    console.log("No data found");
  }
}
run();
