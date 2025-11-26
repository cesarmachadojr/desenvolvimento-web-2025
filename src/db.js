import pg from 'pg';

// 1. Prioriza a string de conexão completa (DATABASE_URL) fornecida pelo Render.
//    Se não existir (ou seja, você está em desenvolvimento local), usa as variáveis separadas.
const connectionString = process.env.DATABASE_URL;

const pool = new pg.Pool(connectionString ? {
    connectionString: connectionString,
    // 2. CONFIGURAÇÃO OBRIGATÓRIA PARA RENDER: Habilita SSL/TLS.
    //    'rejectUnauthorized: false' é frequentemente necessário para evitar erros em alguns provedores.
    ssl: {
        rejectUnauthorized: false,
    },
} : {
    // 3. FALLBACK: Configuração para Desenvolvimento Local (Usando suas variáveis antigas como fallback)
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
        // ... (Seu código de erro) ...
        console.error('❌ [ERRO CRÍTICO] Falha ao conectar ao banco de dados:', err.message);
        throw new Error("Falha na conexão com o banco de dados.");
    }
};

// Exporta o pool de conexão para ser usado pelos controllers
export { pool };