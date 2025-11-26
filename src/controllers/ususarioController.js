// src/controllers/usuarioController.js (VERSÃO REVISADA COM AUTENTICAÇÃO)
import { pool } from "../db.js";
import bcrypt from 'bcrypt'; // 👈 NOVO: Importar o bcrypt para hash de senhas

// --- Listar todos os usuários (Mantido) ---
export const listarUsuarios = async (req, res) => {
    try {
        const result = await pool.query("SELECT id_usuario, nome, email, foto_perfil, bio, data_criacao, data_atualizacao FROM usuarios ORDER BY id_usuario DESC");
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar usuários:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Criar um novo usuário (COM HASH DE SENHA) ---
export const criarUsuario = async (req, res) => {
    // ⚠️ Mude 'senha_hash' para 'senha' (recebe a senha em texto do formulário/cliente)
    const { nome, email, senha, foto_perfil, bio } = req.body; 

    // Validação de entrada
    if (!nome || !email || !senha) { // Verifique 'senha', não 'senha_hash'
        return res.status(400).json({ error: "Nome, email e senha são obrigatórios." });
    }

    try {
        // 1. Gerar o hash da senha (SALT é o padrão 10)
        const saltRounds = 10;
        const senha_hash = await bcrypt.hash(senha, saltRounds); // 👈 HASH DA SENHA

        // 2. Inserir no banco, usando o hash gerado
        const result = await pool.query(
            "INSERT INTO usuarios (nome, email, senha_hash, foto_perfil, bio, data_criacao, data_atualizacao) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) RETURNING id_usuario, nome, email",
            [nome, email, senha_hash, foto_perfil, bio] // Usa o hash
        );
        
        // Em um projeto SSR, após o registro, você poderia redirecionar para a página de login.
        res.status(201).json({ 
            message: "Usuário criado com sucesso! Faça login.", 
            usuario: result.rows[0]
        }); 

    } catch (err) {
        console.error("Erro ao criar usuário:", err.message);
        if (err.code === '23505') { // Violação de constraint UNIQUE (email duplicado)
            return res.status(409).json({ error: 'Este email já está cadastrado.' });
        }
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- LOGAR NO SISTEMA (NOVO) ---
export const login = async (req, res) => {
    const { email, senha } = req.body;
    
    if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios." });
    }

    try {
        // 1. Buscar usuário pelo email
        const result = await pool.query("SELECT id_usuario, nome, senha_hash FROM usuarios WHERE email = $1", [email]);
        const user = result.rows[0];

        if (!user) {
            return res.status(401).json({ error: "Credenciais inválidas (Email não encontrado)." });
        }

        // 2. Comparar a senha fornecida com o hash do banco
        const match = await bcrypt.compare(senha, user.senha_hash);

        if (match) {
            // 3. Criar a sessão: Salva o ID do usuário na sessão (req.session é fornecido pelo express-session)
            req.session.userId = user.id_usuario;
            // Em SSR: res.redirect('/home'); ou res.redirect('/praias');
            res.status(200).json({ 
                message: `Bem-vindo(a), ${user.nome}! Login realizado com sucesso!`, 
                userId: user.id_usuario 
            }); 
        } else {
            res.status(401).json({ error: "Credenciais inválidas (Senha incorreta)." });
        }

    } catch (err) {
        console.error("Erro no login:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- DESLOGAR DO SISTEMA (NOVO) ---
export const logout = (req, res) => {
    // Destrói a sessão, removendo o userId e forçando o logout
    req.session.destroy(err => {
        if (err) {
            return res.status(500).json({ error: "Não foi possível deslogar." });
        }
        // Em SSR: res.redirect('/');
        res.status(200).json({ message: "Logout realizado com sucesso!" }); 
    });
};

// --- Atualizar um usuário (Mantenha as modificações, mas atenção ao hash se for trocar a senha) ---
export const atualizarUsuario = async (req, res) => {
    const { id } = req.params;
    const { nome, email, senha, foto_perfil, bio } = req.body; // ⚠️ Pegue 'senha' em vez de 'senha_hash'

    // Lógica para construir a query de UPDATE dinamicamente
    const updates = [];
    const values = [];
    let idx = 1;

    if (nome) { updates.push(`nome = $${idx++}`); values.push(nome); }
    if (email) { updates.push(`email = $${idx++}`); values.push(email); }
    
    // ⚠️ Se a senha for fornecida, faça o hash antes de atualizar!
    if (senha) { 
        try {
            const saltRounds = 10;
            const senha_hash = await bcrypt.hash(senha, saltRounds);
            updates.push(`senha_hash = $${idx++}`); 
            values.push(senha_hash); 
        } catch (error) {
            console.error("Erro ao gerar hash para atualização:", error);
            return res.status(500).json({ error: "Erro ao processar a nova senha." });
        }
    }

    if (foto_perfil) { updates.push(`foto_perfil = $${idx++}`); values.push(foto_perfil); }
    if (bio !== undefined) { updates.push(`bio = $${idx++}`); values.push(bio); }

    if (updates.length === 0) {
        return res.status(400).json({ error: "Nenhum campo fornecido para atualização." });
    }

    updates.push(`data_atualizacao = NOW()`);
    values.push(id);

    const query = `UPDATE usuarios SET ${updates.join(", ")} WHERE id_usuario = $${idx} RETURNING id_usuario, nome, email`;

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

// --- Deletar um usuário (Mantido) ---
export const deletarUsuario = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query("DELETE FROM usuarios WHERE id_usuario = $1", [id]);
        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Usuário não encontrado." });
        }
        res.status(204).send();
    } catch (err) {
        console.error("Erro ao deletar usuário:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};