// src/routes/viewsRouter.js
import { Router } from "express";
import { pool } from "../db.js";

// Controllers
import {
    listarPraias,
    detalharPraia,
    criarPraia,
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
        error: null
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
                error: "Usuário não encontrado",
                showNavbar: false
            });
        }

        const usuario = rows[0];

        if (senha !== usuario.senha_hash) {
            return res.render("login", {
                title: "Login",
                error: "Senha incorreta",
                showNavbar: false
            });
        }

        req.session.userId = usuario.id_usuario;

        return res.redirect("/praias");

    } catch (err) {
        console.error("❌ ERRO LOGIN:", err);
        return res.render("login", {
            title: "Login",
            error: "Erro interno ao fazer login",
            showNavbar: false
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
    res.render("registrar", { title: "Registrar Conta", showNavbar: false });
});

/* ============================================================
   ➤ PROCESSAR REGISTRO DO USUÁRIO
   ============================================================ */
viewsRouter.post("/registrar", async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        // Verifica se já existe email
        const existe = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email]
        );

        if (existe.rows.length > 0) {
            return res.render("registrar", {
                title: "Registrar Conta",
                error: "Este e-mail já está cadastrado!",
                showNavbar: false
            });
        }

        // Cria usuário
        const result = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             RETURNING id_usuario`,
            [nome, email, senha]
        );

        const novoId = result.rows[0].id_usuario;

        // Login automático
        req.session.userId = novoId;

        return res.redirect("/praias");

    } catch (err) {
        console.error("❌ ERRO REGISTRO:", err);
        return res.render("registrar", {
            title: "Registrar Conta",
            error: "Erro ao criar usuário",
            showNavbar: false
        });
    }
});

/* ============================================================
   ➤ FORM PARA NOVA PRAIA
   ============================================================ */
viewsRouter.get("/praias/nova", authMiddleware, (req, res) => {
    res.render("praia_cadastro", { title: "Cadastrar Nova Praia", praia: null });
});

/* ============================================================
   ➤ SALVAR NOVA PRAIA
   ============================================================ */
viewsRouter.post("/praias/nova", authMiddleware, async (req, res) => {
    try {
        const mockRes = {
            json: (data) => {
                if (data?.error) {
                    req.session.errorMessage = data.error;
                    return res.redirect("/praias/nova");
                }

                req.session.successMessage = `Praia "${data.nome}" cadastrada com sucesso!`;
                return res.redirect("/praias");
            }
        };

        await criarPraia(req, mockRes);

    } catch (err) {
        console.error("❌ ERRO NOVA PRAIA:", err);
        req.session.errorMessage = "Erro interno ao cadastrar praia";
        return res.redirect("/praias/nova");
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
