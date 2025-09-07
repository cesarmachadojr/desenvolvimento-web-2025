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
    const { nome, email, senha_hash, foto_perfil, biografia } = req.body;
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
            "INSERT INTO usuarios (nome, email, senha_hash, foto_perfil, biografia, data_criacao, atualizacao_dados) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING *",
            [nome, email, senha_hash, foto_perfil, biografia]
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
    const { nome, email, senha_hash, foto_perfil, biografia } = req.body;

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
    if (typeof biografia === "string") {
        updates.push(`biografia = $${idx++}`);
        values.push(biografia);
    }

    if (!updates.length) {
        return res.status(400).json({ error: "Nada válido para atualizar" });
    }

    updates.push(`atualizacao_dados = NOW()`);
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API rodando em http://localhost:${PORT}`);
});
