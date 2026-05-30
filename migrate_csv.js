const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const csv = require('csv-parser');

const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres';

const schema = `
CREATE TABLE IF NOT EXISTS despesas (
    id BIGINT PRIMARY KEY,
    descricao TEXT,
    valor NUMERIC,
    data DATE,
    created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS eventos_oficiais (
    id UUID PRIMARY KEY,
    created_at TIMESTAMPTZ,
    nome TEXT,
    data_inicio TEXT,
    data_fim TEXT,
    local TEXT,
    organizador_email TEXT,
    status TEXT,
    detalhes JSONB
);

CREATE TABLE IF NOT EXISTS perfis_portal (
    id UUID PRIMARY KEY,
    nome TEXT,
    email TEXT,
    whatsapp TEXT,
    cpf TEXT,
    rg TEXT,
    endereco TEXT,
    cargo TEXT,
    veio_do_app_desktop BOOLEAN,
    created_at TIMESTAMPTZ,
    foto TEXT,
    bio TEXT,
    link TEXT,
    capa TEXT,
    facebook TEXT,
    twitter TEXT,
    nascimento TEXT,
    instagram TEXT
);

CREATE TABLE IF NOT EXISTS licencas (
    id UUID PRIMARY KEY,
    email TEXT,
    key_code TEXT,
    hwid TEXT,
    dias_validos INTEGER,
    data_ativacao TIMESTAMPTZ,
    is_used BOOLEAN,
    created_at TIMESTAMPTZ,
    is_active BOOLEAN,
    last_seen TIMESTAMPTZ,
    nome TEXT,
    whatsapp TEXT,
    foto_url TEXT,
    descricao TEXT,
    esportes TEXT,
    app_version TEXT
);

CREATE TABLE IF NOT EXISTS boiadas_oficiais (
    id UUID PRIMARY KEY,
    nome TEXT,
    lados JSONB
);

CREATE TABLE IF NOT EXISTS patrocinios (
    id BIGINT PRIMARY KEY,
    empresa TEXT,
    valor_contrato NUMERIC,
    tempo_contrato INTEGER,
    tipo TEXT,
    logo_url TEXT,
    click_url TEXT,
    data_inicio DATE,
    status TEXT,
    created_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS otp_codes (
    id UUID PRIMARY KEY,
    email TEXT,
    code TEXT,
    created_at TIMESTAMPTZ
);
`;

const client = new Client({ connectionString: dbUrl });

const downloadsDir = 'C:\\Users\\Admin\\Downloads';

const csvFiles = {
  'boiadas_oficiais.csv': 'boiadas_oficiais',
  'eventos_oficiais.csv': 'eventos_oficiais',
  'licencas.csv': 'licencas',
  'Patrocinios.csv': 'patrocinios',
  'perfis_portal.csv': 'perfis_portal',
  'otp_codes.csv': 'otp_codes',
  'despesas.csv': 'despesas' // Might not exist, we'll check
};

async function processCSV(filePath, tableName) {
    if (!fs.existsSync(filePath)) {
        console.log(`Skipping ${tableName}: File not found at ${filePath}`);
        return;
    }
    
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data) => results.push(data))
            .on('end', async () => {
                if (results.length === 0) {
                    console.log(`${tableName} has 0 rows.`);
                    return resolve();
                }

                // Get columns dynamically from the first row
                const cols = Object.keys(results[0]);
                
                // Build insert query
                const colNames = cols.map(c => `"${c}"`).join(', ');
                const valPlaceholders = cols.map((_, i) => `$${i + 1}`).join(', ');
                
                const query = `INSERT INTO ${tableName} (${colNames}) VALUES (${valPlaceholders}) ON CONFLICT DO NOTHING`;
                
                let successCount = 0;
                for (const row of results) {
                    const values = cols.map(c => {
                        let val = row[c];
                        if (val === '') return null; // Convert empty string to null for CSV
                        return val;
                    });
                    
                    try {
                        await client.query(query, values);
                        successCount++;
                    } catch (err) {
                        console.error(`Error inserting into ${tableName}:`, err.message, 'Row:', values);
                    }
                }
                console.log(`Inserted ${successCount} rows into ${tableName}`);
                resolve();
            })
            .on('error', reject);
    });
}

async function run() {
    try {
        await client.connect();
        console.log('Connected to DB!');

        // 1. Create Schema
        await client.query(schema);
        console.log('Schema created successfully.');

        // 2. Process all CSVs
        for (const [filename, tableName] of Object.entries(csvFiles)) {
            const filePath = path.join(downloadsDir, filename);
            await processCSV(filePath, tableName);
        }

        console.log('Migration completed successfully!');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
