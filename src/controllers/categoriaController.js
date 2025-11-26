// src/controllers/categoriaController.js
import { pool } from "../db.js";

export const listarCategorias = async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM categorias ORDER BY nome ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar categorias:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

export const criarCategoria = async (req, res) => {
    const { nome } = req.body;
    if (!nome) {
        return res.status(400).json({ error: "Nome da categoria é obrigatório." });
    }
    try {
        const result = await pool.query(
            "INSERT INTO categorias (nome) VALUES ($1) RETURNING *",
            [nome]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(409).json({ error: 'Esta categoria já existe.' });
        }
        console.error("Erro ao criar categoria:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};
