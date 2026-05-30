const { Client } = require('pg');
const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:6543/postgres';

async function checkTables() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT tablename, tableowner 
            FROM pg_tables 
            WHERE schemaname = 'public';
        `);
        console.log("Tabelas publicas:", res.rows);
    } catch (err) {
        console.error("ERRO:", err.message);
    } finally {
        await client.end();
    }
}

checkTables();
