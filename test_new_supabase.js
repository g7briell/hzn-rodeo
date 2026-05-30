const supabaseUrl = 'https://api.rodeoapp.pro';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzgwMTE3MzYwLCJleHAiOjIwOTU0NzczNjB9.ZknzukXlmPHPJRq7xEN-2jiUz3z0lFxF99Cj-RNUQAw';

async function checkSystem() {
    console.log("Fazendo request direto pro PostgREST (Tabela patrocinios)...");
    const res = await fetch(`${supabaseUrl}/rest/v1/patrocinios`, {
        headers: {
            'apikey': supabaseAnonKey,
            'Authorization': `Bearer ${supabaseAnonKey}`
        }
    });

    console.log("Status REST:", res.status);
    const text = await res.text();
    console.log("Body REST:", text.substring(0, 200));

    console.log("\nFazendo request de Login (Auth)...");
    const resAuth = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
            'apikey': supabaseAnonKey,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email: 'fake@example.com', password: 'fake' })
    });

    console.log("Status Auth:", resAuth.status);
    const textAuth = await resAuth.text();
    console.log("Body Auth:", textAuth);
}

checkSystem();
