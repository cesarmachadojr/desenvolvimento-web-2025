// db.js
// Configura e exporta o 'pool' de conexões com o PostgreSQL

import pg from 'pg';

// Utilize variáveis de ambiente para as credenciais do banco,
// isso é uma boa prática de segurança.
// Assegure-se de que estas variáveis estão definidas no seu ambiente de execução.
// Exemplo:
// process.env.DB_USER
// process.env.DB_HOST
// process.env.DB_DATABASE
// process.env.DB_PASSWORD
// process.env.DB_PORT
// ou preencha diretamente se estiver em um ambiente de desenvolvimento local
// e seguro.

const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres', // Substitua 'seu_usuario'
    host: process.env.DB_HOST || 'localhost',    // Substitua 'localhost' se for outro host
    database: process.env.DB_DATABASE || 'node_tasks_db', // Substitua 'guiadepraias' pelo nome do seu banco
    password: process.env.DB_PASSWORD || 'cesinha',    // Substitua 'sua_senha'
    port: process.env.DB_PORT || 5432,           // Porta padrão do PostgreSQL
});

export { pool };
