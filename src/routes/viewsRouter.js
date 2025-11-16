// src/routes/viewsRouter.js
import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt"; // ✅ Import bcrypt para hashing de senha

// Controllers
import {
    listarPraias,
    detalharPraia,
    atualizarPraia
} from "../controllers/praiaController.js";

const viewsRouter = Router();

/* ============================================================
   ➤ MIDDLEWARE DE AUTENTICAÇÃO
============================================================ */
function authMiddleware(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/");
    }
    next();
}

/* ============================================================
   ➤ LOGIN (Página inicial)
============================================================ */
viewsRouter.get("/", (req, res) => {
    res.render("login", {
        title: "Login",
        showNavbar: false,
        errorMessage: null,
        successMessage: null
    });
});

/* ============================================================
   ➤ PROCESSAR LOGIN
============================================================ */
viewsRouter.post("/login", async (req, res) => {
    const { email, senha } = req.body;

    try {
        const { rows } = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        if (rows.length === 0) {
            return res.render("login", {
                title: "Login",
                errorMessage: "Usuário não encontrado",
                showNavbar: false,
                successMessage: null
            });
        }

        const usuario = rows[0];
        const senhaOk = await bcrypt.compare(senha, usuario.senha_hash);

        if (!senhaOk) {
            return res.render("login", {
                title: "Login",
                errorMessage: "Senha incorreta",
                showNavbar: false,
                successMessage: null
            });
        }

        req.session.userId = usuario.id_usuario;

        return res.redirect("/praias");

    } catch (err) {
        console.error("❌ ERRO LOGIN:", err);
        return res.render("login", {
            title: "Login",
            errorMessage: "Erro interno ao fazer login",
            showNavbar: false,
            successMessage: null
        });
    }
});

/* ============================================================
   ➤ LISTAR PRAIAS — PROTEGIDA
============================================================ */
viewsRouter.get("/praias", authMiddleware, async (req, res) => {
    try {
        const praiasResult = await listarPraias(req, null, true);
        const praias = praiasResult?.rows || [];

        res.render("home", {
            title: "Praias Brasil",
            praias,
            query: req.query,
            successMessage: req.session.successMessage,
            errorMessage: req.session.errorMessage
        });

        req.session.successMessage = null;
        req.session.errorMessage = null;

    } catch (err) {
        console.error("❌ ERRO LISTAR PRAIAS:", err);
        return res.render("home", {
            title: "Praias Brasil",
            praias: [],
            query: req.query,
            errorMessage: "Erro ao carregar praias"
        });
    }
});

/* ============================================================
   ➤ LOGOUT
============================================================ */
viewsRouter.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

/* ============================================================
   ➤ FORM DE REGISTRO DE USUÁRIO
============================================================ */
viewsRouter.get("/registrar", (req, res) => {
    res.render("registrar", {
        title: "Registrar Conta",
        showNavbar: false,
        errorMessage: null
    });
});

/* ============================================================
   ➤ PROCESSAR REGISTRO DO USUÁRIO
============================================================ */
viewsRouter.post("/registrar", async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        const existe = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        if (existe.rows.length > 0) {
            return res.render("registrar", {
                title: "Registrar Conta",
                errorMessage: "Este e-mail já está cadastrado!",
                showNavbar: false
            });
        }

        const senha_hash = await bcrypt.hash(senha, 10);

        const result = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash, data_criacao, data_atualizacao)
             VALUES ($1, $2, $3, NOW(), NOW())
             RETURNING id_usuario`,
            [nome, email, senha_hash]
        );

        const novoId = result.rows[0].id_usuario;
        req.session.userId = novoId;

        return res.redirect("/praias");

    } catch (err) {
        console.error("❌ ERRO REGISTRO:", err);
        return res.render("registrar", {
            title: "Registrar Conta",
            errorMessage: "Erro ao criar usuário",
            showNavbar: false
        });
    }
});

/* ============================================================
   ➤ FORM PARA NOVA PRAIA (Carrega categorias)
============================================================ */
viewsRouter.get("/praias/nova", authMiddleware, async (req, res) => {
    try {
        const { rows: categorias } = await pool.query("SELECT * FROM categorias ORDER BY nome ASC");

        res.render("praia_cadastro", {
            title: "Cadastrar Nova Praia",
            praia: null,
            categorias
        });

    } catch (err) {
        console.error("❌ ERRO AO CARREGAR CATEGORIAS:", err);
        req.session.errorMessage = "Erro ao carregar categorias";
        return res.redirect("/praias");
    }
});

/* ============================================================
   ➤ SALVAR NOVA PRAIA
   (Funcionando com formulário e categorias)
============================================================ */
viewsRouter.post("/praias/nova", authMiddleware, async (req, res) => {
    const { nome, cidade, estado, descricao, foto_url } = req.body;
    const categorias = Array.isArray(req.body.categorias)
        ? req.body.categorias
        : req.body.categorias ? [req.body.categorias] : [];
    const id_usuario = req.session.userId;

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // Inserir praia
        const result = await client.query(
            `INSERT INTO praias (nome, cidade, estado, descricao, foto_url, id_usuario, data_criacao, data_atualizacao)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id_praia, nome`,
            [nome, cidade, estado, descricao, foto_url, id_usuario]
        );

        const novaPraia = result.rows[0];

        // Inserir categorias
        for (const idCategoria of categorias) {
            await client.query(
                `INSERT INTO praias_categorias (id_praia, id_categoria) VALUES ($1, $2)`,
                [novaPraia.id_praia, idCategoria]
            );
        }

        await client.query("COMMIT");

        req.session.successMessage = `Praia "${novaPraia.nome}" cadastrada com sucesso!`;
        return res.redirect("/praias");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ ERRO NOVA PRAIA:", err);
        req.session.errorMessage = "Erro interno ao cadastrar praia";
        return res.redirect("/praias/nova");

    } finally {
        client.release();
    }
});

/* ============================================================
   ➤ DETALHES DA PRAIA
============================================================ */
viewsRouter.get("/praias/:id", authMiddleware, async (req, res) => {
    try {
        let praia = null;
        const mockRes = { json: (data) => { praia = data; } };

        await detalharPraia(req, mockRes);

        if (!praia) {
            return res.status(404).render("404", { title: "Praia não encontrada" });
        }

        res.render("praia_detalhes", {
            title: praia.nome,
            praia
        });

    } catch (err) {
        console.error("❌ ERRO DETALHES:", err);
        return res.status(500).render("500", { title: "Erro interno" });
    }
});

/* ============================================================
   ➤ FORM PARA EDITAR PRAIA
============================================================ */
viewsRouter.get("/praias/:id/editar", authMiddleware, async (req, res) => {
    try {
        let praia = null;
        const mockRes = { json: (data) => { praia = data; } };

        await detalharPraia(req, mockRes);

        if (!praia) {
            return res.status(404).render("404", { title: "Praia não encontrada" });
        }

        res.render("praia_editar", {
            title: "Editar Praia",
            praia
        });

    } catch (err) {
        console.error("❌ ERRO EDITAR:", err);
        return res.status(500).render("500", { title: "Erro interno" });
    }
});

/* ============================================================
   ➤ SALVAR EDIÇÃO
============================================================ */
viewsRouter.post("/praias/:id/editar", authMiddleware, async (req, res) => {
    try {
        const mockRes = { json: () => {} };
        await atualizarPraia(req, mockRes);

        req.session.successMessage = "Praia atualizada com sucesso!";
        return res.redirect(`/praias/${req.params.id}`);

    } catch (err) {
        console.error("❌ ERRO UPDATE:", err);
        req.session.errorMessage = "Erro ao atualizar praia";
        return res.redirect(`/praias/${req.params.id}/editar`);
    }
});

export default viewsRouter;
