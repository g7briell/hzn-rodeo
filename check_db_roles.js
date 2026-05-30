const { Client } = require('pg');

const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres';

async function checkRoles() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT rolname FROM pg_roles;");
        console.log("Roles no banco:", res.rows.map(r => r.rolname).join(', '));
    } catch (err) {
        console.error("ERRO:", err.message);
    } finally {
        await client.end();
    }
}

checkRoles();
