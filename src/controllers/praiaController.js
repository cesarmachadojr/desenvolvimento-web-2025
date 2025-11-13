// src/controllers/praiaController.js
import { pool } from "../db.js";

// --- Listar todas as praias (com filtro opcional por cidade/estado) ---
// O parâmetro isSSR (Server-Side Rendering) indica se a função deve retornar os dados (para EJS) 
// ou enviar uma resposta JSON direta (para API)
export const listarPraias = async (req, res, isSSR = false) => {
    const { cidade, estado } = req.query;
    
    // Consulta simples: usa a coluna 'media_avaliacao' que é mantida pelo avaliacaoController
    let query = "SELECT * FROM praias p";
    const values = [];
    
    if (cidade || estado) {
        query += " WHERE";
        let conditionIndex = 1;
        if (cidade) {
            query += ` cidade ILIKE $${conditionIndex++}`;
            values.push(`%${cidade}%`);
        }
        if (estado) {
            if (values.length > 0) query += " AND";
            query += ` estado ILIKE $${conditionIndex++}`;
            values.push(`%${estado}%`);
        }
    }
    
    query += " ORDER BY nome ASC";

    try {
        const result = await pool.query(query, values);
        
        // Se for Server-Side Rendering (chamada interna pelo server.js), retorna o objeto 'result'
        if (isSSR) {
            // Mapeia os dados para formatar a avaliação para exibição amigável (ex: 4.50 ou 0.00)
            const formattedRows = result.rows.map(praia => ({
                ...praia,
                media_avaliacao: praia.media_avaliacao ? parseFloat(praia.media_avaliacao).toFixed(2) : '0.00'
            }));
            return { rows: formattedRows };
        }
        
        // Se for chamada API, envia JSON
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar praias:", err.message);
        
        if (isSSR) {
            throw err;
        }
        
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Detalhar uma praia específica ---
export const detalharPraia = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("SELECT * FROM praias WHERE id_praia = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Praia não encontrada." });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao detalhar praia:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Criar uma nova praia ---
export const criarPraia = async (req, res) => {
    const { nome, cidade, estado, descricao, foto_url } = req.body;
    
    if (!nome || !cidade || !estado) {
        return res.status(400).json({ error: "Nome, cidade e estado são obrigatórios." });
    }

    try {
        const result = await pool.query(
            "INSERT INTO praias (nome, cidade, estado, descricao, foto_url) VALUES ($1, $2, $3, $4, $5) RETURNING *",
            [nome, cidade, estado, descricao, foto_url]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar praia:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Atualizar uma praia ---\
export const atualizarPraia = async (req, res) => {
    const { id } = req.params;
    const { nome, cidade, estado, descricao, foto_url } = req.body;
    
    let updates = [];
    let values = [];
    let idx = 1;

    if (nome) { updates.push(`nome = $${idx++}`); values.push(nome); }
    if (cidade) { updates.push(`cidade = $${idx++}`); values.push(cidade); }
    if (estado) { updates.push(`estado = $${idx++}`); values.push(estado); }
    if (descricao !== undefined) { updates.push(`descricao = $${idx++}`); values.push(descricao); }
    if (foto_url !== undefined) { updates.push(`foto_url = $${idx++}`); values.push(foto_url); }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: "Nenhum campo fornecido para atualização." });
    }

    values.push(id);
    const query = `UPDATE praias SET ${updates.join(", ")} WHERE id_praia = $${idx} RETURNING *`;

    try {
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Praia não encontrada." });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar praia:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Deletar uma praia ---
export const deletarPraia = async (req, res) => {
    const { id } = req.params;
    try {
        // É importante deletar primeiro as avaliações relacionadas (se houver CASCADE no BD, não é necessário aqui)
        // Mas por segurança, vamos apenas deletar a praia. O BD deve ser configurado para o CASCADE.

        // DELETE FROM praias_categorias WHERE id_praia = $1
        // DELETE FROM avaliacoes WHERE id_praia = $1

        const result = await pool.query("DELETE FROM praias WHERE id_praia = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Praia não encontrada." });
        }
        res.status(204).end(); // 204 No Content
    } catch (err) {
        // Se houver erro de Foreign Key (dependências), avisa o usuário.
        if (err.code === '23503') { 
            return res.status(409).json({ error: "Não é possível deletar. Existem avaliações ou categorias associadas a esta praia." });
        }
        console.error("Erro ao deletar praia:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};