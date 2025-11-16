// src/routes/viewsRouter.js
import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";

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
   ➤ ADICIONAR CSRF TOKEN EM TODAS AS VIEWS
============================================================ */
viewsRouter.use((req, res, next) => {
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    next();
});

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
   ➤ FORM PARA NOVA PRAIA
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
   ➤ SALVAR NOVA PRAIA (com validação)
============================================================ */
viewsRouter.post("/praias/nova", authMiddleware, async (req, res) => {
    let { nome, cidade, estado, descricao, foto_url } = req.body;
    const categorias = Array.isArray(req.body.categorias)
        ? req.body.categorias
        : req.body.categorias ? [req.body.categorias] : [];
    const id_usuario = req.session.userId;

    // Validação de campos obrigatórios
    if (!nome || !cidade || !estado) {
        req.session.errorMessage = "Nome, cidade e estado são obrigatórios!";
        return res.redirect("/praias/nova");
    }

    descricao = descricao || "";
    foto_url = foto_url || "";

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const result = await client.query(
            `INSERT INTO praias (nome, cidade, estado, descricao, foto_url, id_usuario, data_criacao, data_atualizacao)
             VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
             RETURNING id_praia, nome`,
            [nome, cidade, estado, descricao, foto_url, id_usuario]
        );

        const novaPraia = result.rows[0];

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
    const id_praia = req.params.id;

    try {
        const { rows: praiaRows } = await pool.query(
            "SELECT * FROM praias WHERE id_praia=$1 AND id_usuario=$2",
            [id_praia, req.session.userId]
        );

        if (praiaRows.length === 0) {
            req.session.errorMessage = "Praia não encontrada ou você não tem permissão.";
            return res.redirect("/perfil");
        }

        const praia = praiaRows[0];

        const { rows: categorias } = await pool.query("SELECT * FROM categorias ORDER BY nome ASC");
        const { rows: categoriasPraia } = await pool.query(
            "SELECT id_categoria FROM praias_categorias WHERE id_praia=$1",
            [id_praia]
        );
        const categoriasSelecionadas = categoriasPraia.map(c => c.id_categoria);

        res.render("praia_editar", {
            title: `Editar Praia - ${praia.nome}`,
            praia,
            categorias,
            categoriasSelecionadas,
            successMessage: req.session.successMessage,
            errorMessage: req.session.errorMessage
        });

        req.session.successMessage = null;
        req.session.errorMessage = null;

    } catch (err) {
        console.error("❌ ERRO EDITAR PRAIA:", err);
        req.session.errorMessage = "Erro ao carregar praia para edição";
        return res.redirect("/perfil");
    }
});

/* ============================================================
   ➤ SALVAR EDIÇÃO DA PRAIA (com validação)
============================================================ */
viewsRouter.post("/praias/:id/editar", authMiddleware, async (req, res) => {
    const id_praia = req.params.id;
    let { nome, cidade, estado, descricao, foto_url } = req.body;
    const categorias = Array.isArray(req.body.categorias)
        ? req.body.categorias
        : req.body.categorias ? [req.body.categorias] : [];

    // Validação de campos obrigatórios
    if (!nome || !cidade || !estado) {
        req.session.errorMessage = "Nome, cidade e estado são obrigatórios!";
        return res.redirect(`/praias/${id_praia}/editar`);
    }

    descricao = descricao || "";
    foto_url = foto_url || "";

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query(
            `UPDATE praias 
             SET nome=$1, cidade=$2, estado=$3, descricao=$4, foto_url=$5, data_atualizacao=NOW()
             WHERE id_praia=$6 AND id_usuario=$7`,
            [nome, cidade, estado, descricao, foto_url, id_praia, req.session.userId]
        );

        await client.query("DELETE FROM praias_categorias WHERE id_praia=$1", [id_praia]);

        for (const idCategoria of categorias) {
            await client.query(
                "INSERT INTO praias_categorias (id_praia, id_categoria) VALUES ($1,$2)",
                [id_praia, idCategoria]
            );
        }

        await client.query("COMMIT");

        req.session.successMessage = "Praia atualizada com sucesso!";
        res.redirect("/perfil");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("❌ ERRO AO ATUALIZAR PRAIA:", err);
        req.session.errorMessage = "Erro ao atualizar praia";
        res.redirect(`/praias/${id_praia}/editar`);
    } finally {
        client.release();
    }
});

/* ============================================================
   ➤ PÁGINA DE PERFIL DO USUÁRIO
============================================================ */
viewsRouter.get("/perfil", authMiddleware, async (req, res) => {
    try {
        const { rows: usuarioRows } = await pool.query(
            "SELECT id_usuario, nome, email FROM usuarios WHERE id_usuario=$1",
            [req.session.userId]
        );

        const usuario = usuarioRows[0];

        const { rows: praias } = await pool.query(
            "SELECT * FROM praias WHERE id_usuario=$1 ORDER BY nome ASC",
            [req.session.userId]
        );

        res.render("perfil", {
            title: "Meu Perfil",
            usuario,
            praias,
            successMessage: req.session.successMessage,
            errorMessage: req.session.errorMessage
        });

        req.session.successMessage = null;
        req.session.errorMessage = null;

    } catch (err) {
        console.error("❌ ERRO PERFIL:", err);
        req.session.errorMessage = "Erro ao carregar perfil";
        res.redirect("/praias");
    }
});

/* ============================================================
   ➤ EDITAR CONTA (CORRIGIDO)
============================================================ */
viewsRouter.post("/perfil/editar", authMiddleware, async (req, res) => {
    const { nome, email, senha } = req.body;

    try {
        if (senha) {
            const senha_hash = await bcrypt.hash(senha, 10);
            await pool.query(
                `UPDATE usuarios
                 SET nome=$1, email=$2, senha_hash=$3, data_atualizacao=NOW()
                 WHERE id_usuario=$4`,
                [nome, email, senha_hash, req.session.userId]
            );
        } else {
            await pool.query(
                `UPDATE usuarios
                 SET nome=$1, email=$2, data_atualizacao=NOW()
                 WHERE id_usuario=$3`,
                [nome, email, req.session.userId]
            );
        }

        req.session.successMessage = "Conta atualizada com sucesso!";
        res.redirect("/perfil");

    } catch (err) {
        console.error("❌ ERRO EDITAR CONTA:", err);
        req.session.errorMessage = "Erro ao atualizar conta";
        res.redirect("/perfil");
    }
});

/* ============================================================
   ➤ EXCLUIR CONTA
============================================================ */
viewsRouter.post("/perfil/excluir", authMiddleware, async (req, res) => {
    try {
        await pool.query("DELETE FROM praias WHERE id_usuario=$1", [req.session.userId]);
        await pool.query("DELETE FROM usuarios WHERE id_usuario=$1", [req.session.userId]);

        req.session.destroy(() => res.redirect("/"));
    } catch (err) {
        console.error("❌ ERRO EXCLUIR CONTA:", err);
        req.session.errorMessage = "Erro ao excluir conta";
        res.redirect("/perfil");
    }
});

export default viewsRouter;
