const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseAnonKey = 'sb_publishable_wX-v1S8OjLldjbwEQYaXVw_1ot31zcH';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function run() {
  try {
    // Check tables by trying to query them or doing a general query if possible,
    // or listing typical tables. Since we don't have direct access to pg_tables via anonymous key usually,
    // let's try querying metadata or common tables, or see what tables we know.
    // Let's try executing an RPC or a query on public tables.
    // Actually, let's list some known tables we can guess or fetch schema from supabase:
    const tables = ['boiadas_oficiais', 'perfis_portal', 'licencas', 'otp_codes', 'boiadas_pendentes', 'boiadas_sugeridas', 'solicitacoes_boiadas'];
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
