const { Client } = require('pg');
const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres';

async function reloadSchema() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        await client.query("NOTIFY pgrst, 'reload schema';");
        console.log("Schema reload trigger sent!");
    } catch (err) {
        console.error("ERRO:", err.message);
    } finally {
        await client.end();
    }
}

reloadSchema();
