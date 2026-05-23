const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseAnonKey = 'sb_publishable_wX-v1S8OjLldjbwEQYaXVw_1ot31zcH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    const tables = ['boiadas_oficiais', 'perfis_portal', 'licencas', 'otp_codes', 'boiadas_pendentes', 'boiadas_sugeridas', 'solicitacoes_boiadas', 'sugestoes_boiadas'];
    for (const table of tables) {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}' does NOT exist or error:`, error.message);
      } else {
        console.log(`Table '${table}' EXISTS!`);
      }
    }
  } catch (err) {
    console.error('Error:', err);
  }
}

run();
