import { Router } from "express";
import { pool } from "../db.js";
import bcrypt from "bcrypt";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // 👈 Importar o middleware global

// Controllers (apenas para simular o detalhamento de praia)
import {
    listarPraias,
    detalharPraia,
    atualizarPraia
} from "../controllers/praiaController.js";

const viewsRouter = Router();

/* ============================================================
   ➤ MIDDLEWARE PARA INJEÇÃO DE VARIÁVEIS LOCAIS (CSRF, Mensagens)
============================================================ */
viewsRouter.use((req, res, next) => {
    // Injetar token CSRF para formulários
    res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    
    // Limpar mensagens da sessão e injetá-las em res.locals
    res.locals.successMessage = req.session.successMessage;
    res.locals.errorMessage = req.session.errorMessage;
    
    delete req.session.successMessage;
    delete req.session.errorMessage;

    next();
});

/* // ❌ REMOVIDO: O authMiddleware que criamos é importado e mais robusto.
function authMiddleware(req, res, next) {
    if (!req.session.userId) {
        return res.redirect("/");
    }
    next();
}
*/

/* ============================================================
   ➤ LOGIN (Página inicial)
============================================================ */
viewsRouter.get("/", (req, res) => {
    // Se o usuário já estiver logado, redireciona para a lista de praias
    if (req.session.userId) {
        return res.redirect("/praias");
    }
    res.render("login", {
        title: "Login",
        showNavbar: false
    });
});

/* ============================================================
   ➤ PROCESSAR LOGIN (AGORA VIA API/POST, USANDO CONTROLLER)
============================================================ */
// ❌ A rota POST /login deve ser tratada pelo controller em usuarioRoutes.js (API).
// Este bloco de código é movido para o usuarioController.js.

/* ============================================================
   ➤ LISTAR PRAIAS — PROTEGIDA
============================================================ */
// O middleware é chamado como função: authMiddleware()
viewsRouter.get("/praias", authMiddleware(), async (req, res) => {
    try {
        // O listarPraias original usa req/res, precisamos adaptar ou usar o método interno
        // Vamos assumir uma chamada direta ao DB para as views, já que o listarPraias é um controller API
        const { rows: praias } = await pool.query(
            `SELECT 
              p.*, 
              u.nome as nome_usuario
              FROM praias p
              JOIN usuarios u ON p.id_usuario = u.id_usuario
              ORDER BY p.data_criacao DESC`
        );

        res.render("home", {
            title: "Praias Brasil",
            praias,
            query: req.query
        });

    } catch (err) {
        console.error("❌ ERRO LISTAR PRAIAS (VIEWS):", err);
        res.locals.errorMessage = "Erro ao carregar praias";
        return res.render("home", {
            title: "Praias Brasil",
            praias: [],
            query: req.query
        });
    }
});

/* ============================================================
   ➤ LOGOUT
============================================================ */
// ❌ Rota POST /logout deve ser tratada pelo controller em usuarioRoutes.js (API).
// Nas views, tratamos o clique de logout via formulário POST para a API.

viewsRouter.get("/logout", (req, res) => {
    req.session.destroy(() => res.redirect("/"));
});

/* ============================================================
   ➤ FORM DE REGISTRO DE USUÁRIO
============================================================ */
viewsRouter.get("/registrar", (req, res) => {
    res.render("registrar", {
        title: "Registrar Conta",
        showNavbar: false
    });
});

/* ============================================================
   ➤ PROCESSAR REGISTRO DO USUÁRIO (AGORA VIA API/POST, USANDO CONTROLLER)
============================================================ */
// ❌ A rota POST /registrar deve ser tratada pelo controller em usuarioRoutes.js (API).
// Este bloco de código é movido para o usuarioController.js.

/* ============================================================
   ➤ FORM PARA NOVA PRAIA
============================================================ */
viewsRouter.get("/praias/nova", authMiddleware(), async (req, res) => { // 👈 authMiddleware()
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
   ➤ SALVAR NOVA PRAIA (POST)
============================================================ */
// ❌ A rota POST /praias/nova deve ser tratada pelo controller em praiaRoutes.js (API).
// Este bloco de código é movido para o praiaController.js.

/* ============================================================
   ➤ DETALHES DA PRAIA
============================================================ */
viewsRouter.get("/praias/:id", authMiddleware(), async (req, res) => { // 👈 authMiddleware()
    try {
        let praia = null;
        // Como views não usam JSON, fazemos a busca direta.
        const { rows: praiaRows } = await pool.query(
            `SELECT 
              p.*, 
              u.nome as nome_usuario
              FROM praias p
              JOIN usuarios u ON p.id_usuario = u.id_usuario
              WHERE id_praia=$1`,
            [req.params.id]
        );

        if (praiaRows.length === 0) {
            return res.status(404).render("404", { title: "Praia não encontrada" });
        }
        praia = praiaRows[0];

        // Buscamos as categorias
        const { rows: categorias } = await pool.query(
            `SELECT c.nome 
             FROM categorias c
             JOIN praias_categorias pc ON c.id_categoria = pc.id_categoria
             WHERE pc.id_praia = $1`,
            [req.params.id]
        );
        praia.categorias = categorias.map(c => c.nome).join(', ');

        // Verifica se o usuário logado é o dono
        const isOwner = praia.id_usuario === req.session.userId;

        res.render("praia_detalhes", {
            title: praia.nome,
            praia,
            isOwner // Passa a informação se o usuário é o dono
        });

    } catch (err) {
        console.error("❌ ERRO DETALHES:", err);
        return res.status(500).render("500", { title: "Erro interno" });
    }
});

/* ============================================================
   ➤ FORM PARA EDITAR PRAIA
============================================================ */
// ⚠️ Usamos authMiddleware({ ownerOf: "praia" }) para verificar se é o dono
viewsRouter.get("/praias/:id/editar", authMiddleware({ ownerOf: "praia" }), async (req, res) => {
    const id_praia = req.params.id;

    try {
        // A verificação de permissão já foi feita pelo middleware ownerOf: "praia"
        const { rows: praiaRows } = await pool.query(
            "SELECT * FROM praias WHERE id_praia=$1",
            [id_praia]
        );

        const praia = praiaRows[0];

        const { rows: categorias } = await pool.query("SELECT * FROM categorias ORDER BY nome ASC");
        const { rows: categoriasPraia } = await pool.query(
            "SELECT id_categoria FROM praias_categorias WHERE id_praia=$1",
            [id_praia]
        );
        const categoriasSelecionadas = categoriasPraia.map(c => c.id_categoria);

        res.render("praia_cadastro", { // Reutilizando a view de cadastro/edição
            title: `Editar Praia - ${praia.nome}`,
            praia,
            categorias,
            categoriasSelecionadas
        });

    } catch (err) {
        console.error("❌ ERRO EDITAR PRAIA:", err);
        req.session.errorMessage = "Erro ao carregar praia para edição";
        return res.redirect("/perfil");
    }
});

/* ============================================================
   ➤ SALVAR EDIÇÃO DA PRAIA (POST)
============================================================ */
// ❌ A rota POST /praias/:id/editar deve ser tratada pelo controller em praiaRoutes.js (API).
// Este bloco de código é movido para o praiaController.js.

/* ============================================================
   ➤ PÁGINA DE PERFIL DO USUÁRIO
============================================================ */
viewsRouter.get("/perfil", authMiddleware(), async (req, res) => { // 👈 authMiddleware()
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
            praias
        });

    } catch (err) {
        console.error("❌ ERRO PERFIL:", err);
        req.session.errorMessage = "Erro ao carregar perfil";
        res.redirect("/praias");
    }
});

/* ============================================================
   ➤ EDITAR CONTA
============================================================ */
// ❌ A rota POST /perfil/editar deve ser tratada pelo controller em usuarioRoutes.js (API).
// Este bloco de código é movido para o usuarioController.js.

/* ============================================================
   ➤ EXCLUIR CONTA (com confirmação de senha)
============================================================ */
// ⚠️ Usamos authMiddleware({ mustConfirmPassword: true }) para garantir a confirmação de senha
viewsRouter.post("/perfil/excluir", authMiddleware({ mustConfirmPassword: true }), async (req, res) => {
    try {
        // Este código de exclusão deve ser movido para o controller e acessado via rota DELETE /api/usuarios/:id
        // Mas vamos mantê-lo aqui temporariamente como POST para o fluxo de views/formulário.

        // Excluir praias e depois o usuário
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