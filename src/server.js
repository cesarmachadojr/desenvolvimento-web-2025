// server.js
// API para o recurso de usuários do Guia de Praias.
// Responsável pelas rotas CRUD de usuários.

import express from "express";
import { pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// rota de saúde
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ------------------- ROTAS DE USUÁRIOS -------------------

// listar todos os usuários
app.get("/usuarios", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM usuarios ORDER BY id_usuario DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar usuários:", err.message);
        res.status(500).json({ error: "Erro ao buscar usuários" });
    }
});

// criar um usuário
app.post("/usuarios", async (req, res) => {
    // O campo 'bio' foi adicionado, conforme o schema atualizado.
    const { nome, email, senha_hash, foto_perfil, bio } = req.body;
    if (!nome || !email || !senha_hash) {
        return res.status(400).json({ error: "nome, email e senha_hash são obrigatórios" });
    }

    // validações
    if (typeof nome !== "string" || nome.trim() === "")
        return res.status(400).json({ error: "nome inválido" });
    
    if (typeof email !== "string" || email.trim() === "")
        return res.status(400).json({ error: "email inválido" });

    if (typeof senha_hash !== "string" || senha_hash.trim() === "")
        return res.status(400).json({ error: "senha_hash inválido" });

    try {
        const result = await pool.query(
            "INSERT INTO usuarios (nome, email, senha_hash, foto_perfil, bio, data_criacao, data_atualizacao) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *",
            [nome, email, senha_hash, foto_perfil, bio]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar usuário:", err.message);
        // Verifica se o erro é de email duplicado (violação da constraint UNIQUE)
        if (err.code === '23505') {
            return res.status(400).json({ error: 'Este email já está cadastrado.' });
        }
        res.status(500).json({ error: "Erro ao criar usuário" });
    }
});

// atualizar um usuário
app.patch("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    // O campo 'bio' foi adicionado para atualização.
    const { nome, email, senha_hash, foto_perfil, bio } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (typeof nome === "string" && nome.trim() !== "") {
        updates.push(`nome = $${idx++}`);
        values.push(nome);
    }
    if (typeof email === "string" && email.trim() !== "") {
        updates.push(`email = $${idx++}`);
        values.push(email);
    }
    if (typeof senha_hash === "string" && senha_hash.trim() !== "") {
        updates.push(`senha_hash = $${idx++}`);
        values.push(senha_hash);
    }
    if (typeof foto_perfil === "string") {
        updates.push(`foto_perfil = $${idx++}`);
        values.push(foto_perfil);
    }
    if (typeof bio === "string") { // Permite atualizar a bio, inclusive para uma string vazia
        updates.push(`bio = $${idx++}`);
        values.push(bio);
    }

    if (!updates.length) {
        return res.status(400).json({ error: "Nada válido para atualizar" });
    }

    updates.push(`data_atualizacao = NOW()`);
    values.push(id);

    const query = `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = $${idx} RETURNING *`;

    try {
        const result = await pool.query(query, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao atualizar usuário:", err.message);
        res.status(500).json({ error: "Erro ao atualizar usuário" });
    }
});

// deletar um usuário
app.delete("/usuarios/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "DELETE FROM usuarios WHERE id_usuario = $1 RETURNING *",
            [id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Usuário não encontrado" });
        }
        res.json({ message: "Usuário deletado", usuario: result.rows[0] });
    } catch (err) {
        console.error("Erro ao deletar usuário:", err.message);
        res.status(500).json({ error: "Erro ao deletar usuário" });
    }
});

// ------------------- ROTAS DE PRAIAS -------------------

// listar todas as praias
app.get("/praias", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM praias ORDER BY nome ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar praias:", err.message);
        res.status(500).json({ error: "Erro ao buscar praias" });
    }
});

// criar uma praia
app.post("/praias", async (req, res) => {
    const { nome, cidade, estado, descricao, foto_url, id_usuario_criador } = req.body;
    if (!nome || !cidade || !estado) {
        return res.status(400).json({ error: "Nome, cidade e estado são obrigatórios." });
    }
    try {
        const result = await pool.query(
            "INSERT INTO praias (nome, cidade, estado, descricao, foto_url, id_usuario_criador) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [nome, cidade, estado, descricao, foto_url, id_usuario_criador]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar praia:", err.message);
        res.status(500).json({ error: "Erro ao criar praia" });
    }
});

// ------------------- ROTAS DE CATEGORIAS -------------------

// listar todas as categorias
app.get("/categorias", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM categorias ORDER BY nome ASC");
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar categorias:", err.message);
        res.status(500).json({ error: "Erro ao buscar categorias" });
    }
});

// criar uma categoria
app.post("/categorias", async (req, res) => {
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
        if (err.code === '23505') { // Erro de violação de constraint UNIQUE
            return res.status(400).json({ error: 'Esta categoria já existe.' });
        }
        console.error("Erro ao criar categoria:", err.message);
        res.status(500).json({ error: "Erro ao criar categoria" });
    }
});

// ------------------- ROTAS DE AVALIAÇÕES -------------------

// listar avaliações de uma praia específica
app.get("/praias/:id/avaliacoes", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            "SELECT av.*, us.nome as nome_usuario FROM avaliacoes av JOIN usuarios us ON av.id_usuario = us.id_usuario WHERE av.id_praia = $1 ORDER BY data_avaliacao DESC",
            [id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar avaliações:", err.message);
        res.status(500).json({ error: "Erro ao buscar avaliações" });
    }
});

// criar uma avaliação
app.post("/avaliacoes", async (req, res) => {
    const { nota, comentario, id_usuario, id_praia } = req.body;
    if (!nota || !id_usuario || !id_praia) {
        return res.status(400).json({ error: "Nota, id_usuario e id_praia são obrigatórios." });
    }
    if (nota < 1 || nota > 5) {
        return res.status(400).json({ error: "A nota deve ser entre 1 e 5." });
    }
    try {
        const result = await pool.query(
            "INSERT INTO avaliacoes (nota, comentario, id_usuario, id_praia) VALUES ($1, $2, $3, $4) RETURNING *",
            [nota, comentario, id_usuario, id_praia]
        );
        // Idealmente, aqui você chamaria o trigger para recalcular a média da praia.
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar avaliação:", err.message);
        res.status(500).json({ error: "Erro ao criar avaliação" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API rodando em http://localhost:${PORT}`);
});

