import pg from 'pg';

// Cria o pool de conexão com base nas variáveis de ambiente
const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres', 
    host: process.env.DB_HOST || 'localhost',   
    database: process.env.DB_DATABASE || 'node_tasks_db', 
    password: process.env.DB_PASSWORD || 'cesinha',   
    port: process.env.DB_PORT || 5432,           
});

/**
 * Testa a conexão com o banco de dados.
 */
export const testConnection = async () => {
    try {
        await pool.query('SELECT 1');
        console.log('✅ [SUCESSO] Conexão com o banco de dados estabelecida.');
    } catch (err) {
        console.error('❌ [ERRO CRÍTICO] Falha ao conectar ao banco de dados:', err.message);
        console.error('Verifique se o PostgreSQL está rodando e as variáveis de ambiente (DB_*) em seu arquivo .env estão corretas.');
        // Opcional: Lançar o erro para interromper o servidor, já que ele depende do BD
        throw new Error("Falha na conexão com o banco de dados.");
    }
};

// Exporta o pool de conexão para ser usado pelos controllers
export { pool };