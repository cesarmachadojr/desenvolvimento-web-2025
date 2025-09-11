
import pg from 'pg';



const pool = new pg.Pool({
    user: process.env.DB_USER || 'postgres', 
    host: process.env.DB_HOST || 'localhost',   
    database: process.env.DB_DATABASE || 'node_tasks_db', 
    password: process.env.DB_PASSWORD || 'cesinha',   
    port: process.env.DB_PORT || 5432,           
});

export { pool };
