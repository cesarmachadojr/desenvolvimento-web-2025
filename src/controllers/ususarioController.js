// src/controllers/usuarioController.js
import { pool } from "../db.js";

// --- Listar todos os usuários ---
export const listarUsuarios = async (req, res) => {
    try {
        const result = await pool.query("SELECT id_usuario, nome, email, foto_perfil, bio, data_criacao, data_atualizacao FROM usuarios ORDER BY id_usuario DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar usuários:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Criar um novo usuário ---
export const criarUsuario = async (req, res) => {
    const { nome, email, senha_hash, foto_perfil, bio } = req.body;

    // Validação de entrada
    if (!nome || !email || !senha_hash) {
        return res.status(400).json({ error: "Nome, email e senha_hash são obrigatórios." });
    }

    try {
        const result = await pool.query(
            "INSERT INTO usuarios (nome, email, senha_hash, foto_perfil, bio, data_criacao, data_atualizacao) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *",
            [nome, email, senha_hash, foto_perfil, bio]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar usuário:", err.message);
        if (err.code === '23505') { // Violação de constraint UNIQUE (email duplicado)
            return res.status(409).json({ error: 'Este email já está cadastrado.' });
        }
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Atualizar um usuário ---
export const atualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha_hash, foto_perfil, bio } = req.body;

    // Lógica para construir a query de UPDATE dinamicamente
    const updates = [];
    const values = [];
    let idx = 1;

    if (nome) { updates.push(`nome = $${idx++}`); values.push(nome); }
    if (email) { updates.push(`email = $${idx++}`); values.push(email); }
    if (senha_hash) { updates.push(`senha_hash = $${idx++}`); values.push(senha_hash); }
    if (foto_perfil) { updates.push(`foto_perfil = $${idx++}`); values.push(foto_perfil); }
    if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }

    if (updates.length === 0) {
        return res.status(400).json({ error: "Nenhum campo fornecido para atualização." });
    }

    updates.push(`data_atualizacao = NOW()`);
    values.push(id);

    const query = `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = $${idx} RETURNING *`;

    try {
        const result = await pool.query(query, values);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar usuário:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Deletar um usuário ---
export const deletarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM usuarios WHERE id_usuario = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }
        // Retorna 204 No Content, que é o padrão para DELETE bem-sucedido.
        res.status(204).send();
    } catch (err) {
        console.error("Erro ao deletar usuário:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};
