// src/controllers/usuarioController.js
import { pool } from "../db.js";
import bcrypt from "bcrypt";

/* ============================================================
   ➤ LISTAR USUÁRIOS
   ============================================================ */
export const listarUsuarios = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT id_usuario, nome, email, foto_perfil, bio, data_criacao, data_atualizacao
             FROM usuarios
             ORDER BY id_usuario DESC`
        );

        res.json(result.rows);

    } catch (err) {
        console.error("Erro ao buscar usuários:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

/* ============================================================
   ➤ CRIAR USUÁRIO (REGISTRO) — COM HASH DE SENHA
   ============================================================ */
export const criarUsuario = async (req, res) => {
    const { nome, email, senha, foto_perfil, bio } = req.body;

    if (!nome || !email || !senha) {
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
    }

    try {
        const saltRounds = 10;
        const senha_hash = await bcrypt.hash(senha, saltRounds);

        const result = await pool.query(
            `INSERT INTO usuarios 
             (nome, email, senha_hash, foto_perfil, bio, data_criacao, data_atualizacao)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id_usuario, nome, email`,
            [nome, email, senha_hash, foto_perfil, bio]
        );

        return res.status(201).json({
            message: "Usuário criado com sucesso!",
            usuario: result.rows[0]
        });

    } catch (err) {
        console.error("Erro ao criar usuário:", err.message);

        if (err.code === "23505") {
            return res.status(409).json({ error: "Este email já está cadastrado." });
        }

        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

/* ============================================================
   ➤ LOGIN (AUTENTICAÇÃO)
   ============================================================ */
export const login = async (req, res) => {
    const { email, senha } = req.body;

    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    try {
        const result = await pool.query(
            "SELECT id_usuario, nome, senha_hash FROM usuarios WHERE email = $1",
            [email]
        );

        const usuario = result.rows[0];

        if (!usuario) {
            return res.status(401).json({ error: "Credenciais inválidas (email não encontrado)." });
        }

        const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaOk) {
            return res.status(401).json({ error: "Credenciais inválidas (senha incorreta)." });
        }

        // Criar a sessão
        req.session.userId = usuario.id_usuario;

        return res.status(200).json({
            message: `Bem-vindo(a), ${usuario.nome}!`,
            userId: usuario.id_usuario
        });

    } catch (err) {
        console.error("Erro no login:", err.message);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

/* ============================================================
   ➤ LOGOUT
   ============================================================ */
export const logout = (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: "Não foi possível deslogar." });
        }

        return res.status(200).json({ message: "Logout realizado com sucesso!" });
    });
};

/* ============================================================
   ➤ ATUALIZAR USUÁRIO (EDITAR PERFIL)
   ============================================================ */
export const atualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, foto_perfil, bio } = req.body;

    const updates = [];
    const values = [];
    let idx = 1;

    if (nome) { updates.push(`nome = $${idx++}`); values.push(nome); }
    if (email) { updates.push(`email = $${idx++}`); values.push(email); }

    if (senha) {
        const saltRounds = 10;
        const senha_hash = await bcrypt.hash(senha, saltRounds);
        updates.push(`senha_hash = $${idx++}`);
        values.push(senha_hash);
    }

    if (foto_perfil) { updates.push(`foto_perfil = $${idx++}`); values.push(foto_perfil); }
    if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }

    if (updates.length === 0) {
        return res.status(400).json({ error: "Nenhum campo fornecido para atualização." });
    }

    updates.push("data_atualizacao = NOW()");
    values.push(id);

    try {
        const result = await pool.query(
            `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = $${idx}
             RETURNING id_usuario, nome, email`,
            values
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        return res.json(result.rows[0]);

    } catch (err) {
        console.error("Erro ao atualizar usuário:", err.message);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};

/* ============================================================
   ➤ DELETAR USUÁRIO
   ============================================================ */
export const deletarUsuario = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            "DELETE FROM usuarios WHERE id_usuario = $1",
            [id]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }

        return res.status(204).send();

    } catch (err) {
        console.error("Erro ao deletar usuário:", err.message);
        return res.status(500).json({ error: "Erro interno do servidor" });
    }
};
