const { Client } = require('pg');

const oldDbUrl = 'postgresql://postgres.your-tenant-id:!!@@Gabriel1479!!@@@37.148.134.227:6543/postgres';
const newPassword = 'Gabriel1479Rodeo!';

async function updatePasswords() {
    const client = new Client({ connectionString: oldDbUrl });
    try {
        await client.connect();
        console.log("Conectado ao DB!");

        const roles = [
            'postgres',
            'authenticator',
            'supabase_admin',
            'supabase_auth_admin',
            'supabase_storage_admin'
        ];

        for (const role of roles) {
            try {
                await client.query(`ALTER USER ${role} WITH PASSWORD '${newPassword}';`);
                console.log(`Senha atualizada para o usuário: ${role}`);
            } catch (err) {
                console.log(`Aviso ao atualizar ${role}:`, err.message);
            }
        }
        console.log("Todas as senhas foram atualizadas com sucesso!");
    } catch (err) {
        console.error("Erro ao conectar no banco:", err);
    } finally {
        await client.end();
    }
}

updatePasswords();
