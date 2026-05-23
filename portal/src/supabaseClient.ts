import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co';
const supabaseAnonKey = 'sb_publishable_wX-v1S8OjLldjbwEQYaXVw_1ot31zcH';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
