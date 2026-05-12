import { createClient } from '@supabase/supabase-js'

// Chaves inseridas diretamente para garantir a conexão imediata
const supabaseUrl = 'https://scivakieachwewdhnuhv.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNjaXZha2llYWNod2V3ZGhudWh2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1NTc3NzksImV4cCI6MjA5NDEzMzc3OX0.nwCC0FYPBsMGhuj7xJju9ubFD2GjKmlTLOptz0UFWfk'

export const supabase = createClient(supabaseUrl, supabaseKey)
