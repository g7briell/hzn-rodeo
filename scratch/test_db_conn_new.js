const { Client } = require('pg');

async function test() {
    const urls = [
        'postgresql://postgres:Gabriel1479Rodeo!@37.148.134.227:5432/postgres',
        'postgresql://postgres:Gabriel1479Rodeo!@37.148.134.227:6543/postgres',
        'postgresql://postgres:Gabriel1479@37.148.134.227:5432/postgres',
        'postgresql://postgres:Gabriel1479@37.148.134.227:6543/postgres',
        'postgresql://postgres.your-tenant-id:Gabriel1479Rodeo!@37.148.134.227:5432/postgres',
        'postgresql://postgres.your-tenant-id:Gabriel1479Rodeo!@37.148.134.227:6543/postgres',
        'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres',
        'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:6543/postgres'
    ];
    for (let url of urls) {
        console.log("Testing:", url.replace(/:[^:@]+@/, ':***@'));
        const client = new Client({ connectionString: url, connectionTimeoutMillis: 3000 });
        try {
            await client.connect();
            console.log("SUCCESS!");
            const res = await client.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public';");
            console.log("Tables:", res.rows.map(r => r.tablename));
            await client.end();
            return;
        } catch (err) {
            console.log("FAILED:", err.message);
        }
    }
}
test();
