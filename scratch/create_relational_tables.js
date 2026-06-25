const { Client } = require('pg');
const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres';

async function run() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        console.log("Connected to DB, running DDL...");

        // Create rel_competidores
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.rel_competidores (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                cpf VARCHAR(20) UNIQUE,
                cidade VARCHAR(255),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            ALTER TABLE public.rel_competidores DISABLE ROW LEVEL SECURITY;
        `);
        console.log("Created public.rel_competidores and disabled RLS.");

        // Create rel_cias
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.rel_cias (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) UNIQUE NOT NULL,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            ALTER TABLE public.rel_cias DISABLE ROW LEVEL SECURITY;
        `);
        console.log("Created public.rel_cias and disabled RLS.");

        // Create rel_touros
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.rel_touros (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                cia VARCHAR(255) NOT NULL,
                lado VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
                CONSTRAINT rel_touros_nome_cia_key UNIQUE (nome, cia)
            );
            ALTER TABLE public.rel_touros DISABLE ROW LEVEL SECURITY;
        `);
        console.log("Created public.rel_touros and disabled RLS.");

        // Create rel_eventos
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.rel_eventos (
                id SERIAL PRIMARY KEY,
                nome VARCHAR(255) NOT NULL,
                cidade VARCHAR(255) NOT NULL,
                data VARCHAR(100),
                is_manual BOOLEAN DEFAULT false,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            ALTER TABLE public.rel_eventos DISABLE ROW LEVEL SECURITY;
        `);
        console.log("Created public.rel_eventos and disabled RLS.");

        // Create rel_montarias
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.rel_montarias (
                id SERIAL PRIMARY KEY,
                evento_id INTEGER REFERENCES public.rel_eventos(id) ON DELETE CASCADE,
                competidor_id INTEGER REFERENCES public.rel_competidores(id) ON DELETE CASCADE,
                touro_id INTEGER REFERENCES public.rel_touros(id) ON DELETE CASCADE,
                dia VARCHAR(50),
                tempo NUMERIC(5,2),
                j1_peao NUMERIC(5,2),
                j2_peao NUMERIC(5,2),
                j1_touro NUMERIC(5,2),
                j2_touro NUMERIC(5,2),
                total_peao NUMERIC(5,2),
                total_touro NUMERIC(5,2),
                nota_final NUMERIC(5,2),
                status VARCHAR(50),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
            );
            ALTER TABLE public.rel_montarias DISABLE ROW LEVEL SECURITY;
        `);
        console.log("Created public.rel_montarias and disabled RLS.");

        console.log("DDL executed successfully!");
    } catch (err) {
        console.error("DDL Execution Error:", err);
    } finally {
        await client.end();
    }
}
run();
