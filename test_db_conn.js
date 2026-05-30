const { Client } = require('pg');

const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres';

async function testConnection() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        console.log("SUCESSO: Conectado ao banco de dados com a nova senha!");
    } catch (err) {
        console.error("ERRO:", err.message);
    } finally {
        await client.end();
    }
}

testConnection();
