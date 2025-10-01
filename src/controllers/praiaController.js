// src/controllers/praiaController.js
import { pool } from "../db.js";

// --- Listar todas as praias (com filtro opcional por cidade/estado) ---
export const listarPraias = async (req, res) => {
    const { cidade, estado } = req.query;
    
    let query = "SELECT * FROM praias";
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
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar praias:", err.message);
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
        console.error("Erro ao buscar praia:", err.message);
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

// --- Atualizar uma praia ---
export const atualizarPraia = async (req, res) => {
    const { id } = req.params;
    const { nome, cidade, estado, descricao, foto_url } = req.body;
    
    // Lógica de update dinâmico (similar ao de usuário)
    const updates = [];
    const values = [];
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
        const result = await pool.query("DELETE FROM praias WHERE id_praia = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Praia não encontrada." });
        }
        res.status(204).send();
    } catch (err) {
        console.error("Erro ao deletar praia:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};
