const { Client } = require('pg');
const dbUrl = 'postgresql://postgres.your-tenant-id:Gabriel1479@37.148.134.227:5432/postgres';

async function run() {
    const client = new Client({ connectionString: dbUrl });
    try {
        await client.connect();
        console.log("Connected. Clearing old relational records for clean migration...");
        await client.query("TRUNCATE TABLE public.rel_montarias, public.rel_eventos, public.rel_touros, public.rel_cias, public.rel_competidores RESTART IDENTITY CASCADE;");
        console.log("Cleared.");

        console.log("Fetching all events from eventos_oficiais...");
        const res = await client.query("SELECT id, nome, local, data_inicio, detalhes, status, created_at FROM public.eventos_oficiais;");
        const events = res.rows;
        console.log(`Found ${events.length} events.`);

        // Maps to keep track of inserted entities to prevent duplicate inserts
        const compByCpf = new Map(); // cpf -> id
        const compByName = new Map(); // normalizedName -> id
        const ciaByName = new Map(); // normalizedName -> id
        const bullByNameCia = new Map(); // "normalizedBull#normalizedCia" -> id

        // Helper to normalize string
        const normalize = (str) => {
            if (!str) return '';
            return str.trim().toUpperCase();
        };

        const cleanCpf = (cpf) => {
            if (!cpf) return '';
            return cpf.replace(/\D/g, '');
        };

        // 1. First Pass: Gather all competitors, cias, and bulls from all events
        console.log("Scanning events for competitors, cias and bulls...");
        for (const ev of events) {
            const det = typeof ev.detalhes === 'string' ? JSON.parse(ev.detalhes) : ev.detalhes;
            if (!det) continue;

            // Process competitors in ranking
            if (Array.isArray(det.ranking)) {
                for (const rider of det.ranking) {
                    const name = normalize(rider.nome);
                    const cpf = cleanCpf(rider.cpf);
                    const cidade = normalize(rider.cidade || rider.local);

                    if (!name) continue;

                    let compId = null;
                    if (cpf && compByCpf.has(cpf)) {
                        compId = compByCpf.get(cpf);
                    } else if (compByName.has(name)) {
                        compId = compByName.get(name);
                    }

                    if (!compId) {
                        // Insert competitor
                        const insRes = await client.query(
                            `INSERT INTO public.rel_competidores (nome, cpf, cidade) 
                             VALUES ($1, $2, $3) 
                             ON CONFLICT (cpf) DO UPDATE SET nome = EXCLUDED.nome, cidade = COALESCE(public.rel_competidores.cidade, EXCLUDED.cidade)
                             RETURNING id;`,
                            [name, cpf || null, cidade || null]
                        );
                        compId = insRes.rows[0].id;
                        if (cpf) compByCpf.set(cpf, compId);
                        compByName.set(name, compId);
                    } else {
                        // If we found a CPF for an existing name-only record, update it
                        if (cpf && !compByCpf.has(cpf)) {
                            await client.query(
                                `UPDATE public.rel_competidores SET cpf = $1 WHERE id = $2 ON CONFLICT (cpf) DO NOTHING;`,
                                [cpf, compId]
                            );
                            compByCpf.set(cpf, compId);
                        }
                    }
                }
            }

            // Process competitors, cias, and bulls in notas
            if (Array.isArray(det.notas)) {
                for (const nota of det.notas) {
                    const riderName = normalize(nota.peao);
                    const riderCpf = cleanCpf(nota.cpf);
                    const bullName = normalize(nota.touro);
                    const ciaName = normalize(nota.cia);

                    // Insert competitor if not exists
                    if (riderName) {
                        let compId = null;
                        if (riderCpf && compByCpf.has(riderCpf)) {
                            compId = compByCpf.get(riderCpf);
                        } else if (compByName.has(riderName)) {
                            compId = compByName.get(riderName);
                        }

                        if (!compId) {
                            const insRes = await client.query(
                                `INSERT INTO public.rel_competidores (nome, cpf) 
                                 VALUES ($1, $2) 
                                 ON CONFLICT (cpf) DO UPDATE SET nome = EXCLUDED.nome
                                 RETURNING id;`,
                                [riderName, riderCpf || null]
                            );
                            compId = insRes.rows[0].id;
                            if (riderCpf) compByCpf.set(riderCpf, compId);
                            compByName.set(riderName, compId);
                        } else {
                            if (riderCpf && !compByCpf.has(riderCpf)) {
                                await client.query(
                                    `UPDATE public.rel_competidores SET cpf = $1 WHERE id = $2 ON CONFLICT (cpf) DO NOTHING;`,
                                    [riderCpf, compId]
                                );
                                compByCpf.set(riderCpf, compId);
                            }
                        }
                    }

                    // Insert Cia if not exists
                    if (ciaName) {
                        let ciaId = null;
                        if (ciaByName.has(ciaName)) {
                            ciaId = ciaByName.get(ciaName);
                        } else {
                            const insRes = await client.query(
                                `INSERT INTO public.rel_cias (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id;`,
                                [ciaName]
                            );
                            ciaId = insRes.rows[0].id;
                            ciaByName.set(ciaName, ciaId);
                        }
                    }

                    // Insert Bull if not exists
                    if (bullName && ciaName) {
                        const key = `${bullName}#${ciaName}`;
                        let bullId = null;
                        if (bullByNameCia.has(key)) {
                            bullId = bullByNameCia.get(key);
                        } else {
                            const insRes = await client.query(
                                `INSERT INTO public.rel_touros (nome, cia) VALUES ($1, $2) ON CONFLICT (nome, cia) DO UPDATE SET nome = EXCLUDED.nome RETURNING id;`,
                                [bullName, ciaName]
                            );
                            bullId = insRes.rows[0].id;
                            bullByNameCia.set(key, bullId);
                        }
                    }
                }
            }

            // Process boiadas to get bulls and their sides
            if (Array.isArray(det.boiadas)) {
                for (const boiada of det.boiadas) {
                    const ciaName = normalize(boiada.nome);
                    if (!ciaName) continue;

                    // Insert Cia
                    let ciaId = null;
                    if (ciaByName.has(ciaName)) {
                        ciaId = ciaByName.get(ciaName);
                    } else {
                        const insRes = await client.query(
                            `INSERT INTO public.rel_cias (nome) VALUES ($1) ON CONFLICT (nome) DO UPDATE SET nome = EXCLUDED.nome RETURNING id;`,
                            [ciaName]
                        );
                        ciaId = insRes.rows[0].id;
                        ciaByName.set(ciaName, ciaId);
                    }

                    // Insert Bulls under this boiada
                    const lados = boiada.lados || {};
                    const touros = boiada.touros || Object.keys(lados);
                    for (const tName of touros) {
                        const bullName = normalize(tName);
                        if (!bullName || bullName === '__META') continue;

                        const key = `${bullName}#${ciaName}`;
                        let lado = lados[tName] || null;
                        if (lado) lado = lado.trim();

                        let bullId = null;
                        if (bullByNameCia.has(key)) {
                            bullId = bullByNameCia.get(key);
                            if (lado) {
                                await client.query(
                                    `UPDATE public.rel_touros SET lado = $1 WHERE id = $2;`,
                                    [lado, bullId]
                                );
                            }
                        } else {
                            const insRes = await client.query(
                                `INSERT INTO public.rel_touros (nome, cia, lado) VALUES ($1, $2, $3) ON CONFLICT (nome, cia) DO UPDATE SET lado = COALESCE(public.rel_touros.lado, EXCLUDED.lado) RETURNING id;`,
                                [bullName, ciaName, lado]
                            );
                            bullId = insRes.rows[0].id;
                            bullByNameCia.set(key, bullId);
                        }
                    }
                }
            }
        }

        console.log(`Migration scanner stats: Competitors: ${compByName.size}, Cias: ${ciaByName.size}, Bulls: ${bullByNameCia.size}`);

        // 2. Second Pass: Insert Events and their Rides (Montarias)
        console.log("Migrating events and montarias...");
        for (const ev of events) {
            const det = typeof ev.detalhes === 'string' ? JSON.parse(ev.detalhes) : ev.detalhes;
            if (!det) continue;

            const evNome = normalize(ev.nome);
            const evCidade = normalize(ev.local || 'DESCONHECIDA');
            const evData = ev.data_inicio || '';

            // Insert event into rel_eventos
            const evRes = await client.query(
                `INSERT INTO public.rel_eventos (nome, cidade, data, is_manual) VALUES ($1, $2, $3, false) RETURNING id;`,
                [evNome, evCidade, evData]
            );
            const relEvId = evRes.rows[0].id;

            if (Array.isArray(det.notas)) {
                for (const nota of det.notas) {
                    const riderName = normalize(nota.peao);
                    const riderCpf = cleanCpf(nota.cpf);
                    const bullName = normalize(nota.touro);
                    const ciaName = normalize(nota.cia);

                    if (!riderName) continue;

                    // Get competitor ID
                    let compId = null;
                    if (riderCpf && compByCpf.has(riderCpf)) {
                        compId = compByCpf.get(riderCpf);
                    } else if (compByName.has(riderName)) {
                        compId = compByName.get(riderName);
                    }

                    // Get bull ID
                    let bullId = null;
                    if (bullName && ciaName) {
                        const key = `${bullName}#${ciaName}`;
                        if (bullByNameCia.has(key)) {
                            bullId = bullByNameCia.get(key);
                        }
                    }

                    if (!compId) {
                        // Fallback/insert if missing (should not happen based on Pass 1, but safe)
                        const insRes = await client.query(
                            `INSERT INTO public.rel_competidores (nome, cpf) VALUES ($1, $2) ON CONFLICT (cpf) DO UPDATE SET nome = EXCLUDED.nome RETURNING id;`,
                            [riderName, riderCpf || null]
                        );
                        compId = insRes.rows[0].id;
                        if (riderCpf) compByCpf.set(riderCpf, compId);
                        compByName.set(riderName, compId);
                    }

                    if (!bullId && bullName && ciaName) {
                        // Fallback/insert if missing
                        const insRes = await client.query(
                            `INSERT INTO public.rel_touros (nome, cia) VALUES ($1, $2) ON CONFLICT (nome, cia) DO UPDATE SET nome = EXCLUDED.nome RETURNING id;`,
                            [bullName, ciaName]
                        );
                        bullId = insRes.rows[0].id;
                        bullByNameCia.set(`${bullName}#${ciaName}`, bullId);
                    }

                    const dia = nota.dia || 'DIA 1';
                    const tempo = typeof nota.tempo === 'number' ? nota.tempo : parseFloat(nota.tempo) || null;
                    const j1_peao = typeof nota.j1_peao === 'number' ? nota.j1_peao : parseFloat(nota.j1_peao) || 0;
                    const j2_peao = typeof nota.j2_peao === 'number' ? nota.j2_peao : parseFloat(nota.j2_peao) || 0;
                    const j1_touro = typeof nota.j1_touro === 'number' ? nota.j1_touro : parseFloat(nota.j1_touro) || 0;
                    const j2_touro = typeof nota.j2_touro === 'number' ? nota.j2_touro : parseFloat(nota.j2_touro) || 0;
                    const total_peao = typeof nota.totalPeao === 'number' ? nota.totalPeao : parseFloat(nota.totalPeao) || (j1_peao + j2_peao);
                    const total_touro = typeof nota.totalTouro === 'number' ? nota.totalTouro : parseFloat(nota.totalTouro) || (j1_touro + j2_touro);
                    const nota_final = total_peao + total_touro;
                    const status = nota.status || 'ativa';

                    await client.query(
                        `INSERT INTO public.rel_montarias 
                         (evento_id, competidor_id, touro_id, dia, tempo, j1_peao, j2_peao, j1_touro, j2_touro, total_peao, total_touro, nota_final, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13);`,
                        [
                            relEvId,
                            compId,
                            bullId,
                            dia,
                            tempo,
                            j1_peao,
                            j2_peao,
                            j1_touro,
                            j2_touro,
                            total_peao,
                            total_touro,
                            nota_final,
                            status
                        ]
                    );
                }
            }
        }

        console.log("Migration complete!");
    } catch (err) {
        console.error("Migration Error:", err);
    } finally {
        await client.end();
    }
}
run();
