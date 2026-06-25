const { Client } = require('pg');
const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres';

async function run() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        const res = await client.query("SELECT id, nome, detalhes FROM eventos_oficiais LIMIT 10;");
        for (let row of res.rows) {
            const det = typeof row.detalhes === 'string' ? JSON.parse(row.detalhes) : row.detalhes;
            if (!det) continue;
            if (det.ranking && det.ranking.length > 0) {
                console.log(`Evento: ${row.nome}`);
                console.log("Sample ranking item:", det.ranking[0]);
                break;
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
run();
