const { Client } = require('pg');

const dbUrl = 'postgresql://authenticator:Gabriel1479@37.148.134.227:5432/postgres';
// Also try with 'postgres' just in case
const dbUrlFallback = 'postgresql://authenticator:postgres@37.148.134.227:5432/postgres';

async function testConnection() {
    console.log("Testando authenticator com Gabriel1479...");
    let client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        console.log("SUCESSO: authenticator usou Gabriel1479!");
        await client.end();
        return;
    } catch (err) {
        console.error("FALHA Gabriel1479:", err.message);
    }

    console.log("\nTestando authenticator com 'postgres'...");
    client = new Client({ connectionString: dbUrlFallback });
    try {
        await client.connect();
        console.log("SUCESSO: authenticator usou 'postgres'!");
        await client.end();
    } catch (err) {
        console.error("FALHA 'postgres':", err.message);
    }
}

testConnection();
