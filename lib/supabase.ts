import { createClient } from '@supabase/supabase-js'

// Chaves inseridas diretamente para garantir a conexão imediata
const supabaseUrl = 'http://37.148.134.227:8000'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw'

export const supabase = createClient(supabaseUrl, supabaseKey)
