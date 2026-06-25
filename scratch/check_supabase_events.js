const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://api.rodeoapp.pro';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkEvents() {
    try {
        const { data, error } = await supabase
            .from('eventos_oficiais')
            .select('id, nome, status, organizador_email, detalhes, created_at')
            .order('created_at', { ascending: false })
            .limit(5);

        if (error) throw error;
        
        console.log("Latest 5 events in Suapbase:");
        data.forEach(e => {
            console.log(`- ID: ${e.id}, Nome: ${e.nome}, Email: ${e.organizador_email}, Status: ${e.status}, Sorteios: ${JSON.stringify(e.detalhes?.sorteios || [])}`);
        });
    } catch (e) {
        console.error("Error checking events:", e);
    }
}

checkEvents();
