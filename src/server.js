// src/server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import expressLayouts from "express-ejs-layouts";
import session from "express-session";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import { testConnection } from "./db.js";

// Rotas de API
import usuarioRoutes from "./routes/usuarioRoutes.js";
import praiaRoutes from "./routes/praiaRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import avaliacaoRoutes from "./routes/avaliacaoRoutes.js";

// Rotas de Views (SSR)
import viewsRouter from "./routes/viewsRouter.js";

dotenv.config();
const app = express();

// ** 1. VARIÁVEIS DE AMBIENTE E AMBIENTE **
// O Render define NODE_ENV como 'production'
const isProduction = process.env.NODE_ENV === "production";

// ============================================================
// CONFIGURAÇÃO DO EJS
// ============================================================
const __dirname = path.resolve();
app.set("views", path.join(__dirname, "src", "views"));
app.set("view engine", "ejs");

// Layout principal
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Pasta pública
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// MIDDLEWARES
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// SESSÃO
// ============================================================
// ** ALTERAÇÃO 1: Adicionar trust proxy para o Render (necessário para cookies seguros)**
if (isProduction) {
    app.set('trust proxy', 1);
}

app.use(session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        // ** ALTERAÇÃO 2: Usa secure: true em produção (HTTPS no Render)**
        secure: isProduction, 
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hora
    }
}));

// ============================================================
// CSRF — SOMENTE PARA ROTAS DE VIEWS
// ============================================================
const csrfProtection = csrf({ cookie: true });

app.use((req, res, next) => {
    // Aplicar CSRF somente nas rotas de Views (não API)
    if (!req.originalUrl.startsWith("/api")) {
        return csrfProtection(req, res, next);
    }
    next();
});

// ============================================================
// VARIÁVEIS GLOBAIS PARA VIEWS
// ============================================================
app.use((req, res, next) => {
    // Se o usuário está logado
    res.locals.usuarioLogado = !!req.session.userId;

    // csrfToken (evita crash nas rotas sem CSRF)
    try {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    } catch {
        res.locals.csrfToken = "";
    }

    // Flash messages
    res.locals.successMessage = req.session.successMessage || null;
    res.locals.errorMessage = req.session.errorMessage || null;

    delete req.session.successMessage;
    delete req.session.errorMessage;

    next();
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/health", (req, res) => {
    res.json({ status: "API ok" });
});

// ============================================================
// ROTAS DA API
// ============================================================
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/praias", praiaRoutes);
app.use("/api/categorias", categoriaRoutes);
app.use("/api/avaliacoes", avaliacaoRoutes);

// ============================================================
// ROTAS SSR (PÁGINAS)
app.use("/", viewsRouter);

// ============================================================
// 404
// ============================================================
app.use((req, res) => {
    if (req.originalUrl.startsWith("/api")) {
        return res.status(404).json({ error: "Rota da API não encontrada." });
    }

    res.status(404).render("404", {
        title: "Página não encontrada",
        showNavbar: false
    });
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await testConnection();
        // O Render usa 0.0.0.0 para rodar o servidor, mas a mensagem de log deve ser genérica
        app.listen(PORT, "0.0.0.0", () =>
            // ** ALTERAÇÃO 3: Remove localhost da mensagem, pois a URL é pública **
            console.log(`Servidor rodando na porta ${PORT} (${isProduction ? 'Produção' : 'Desenvolvimento'})`)
        );
    } catch (err) {
        console.error("Falha ao iniciar o servidor:", err.message);
        process.exit(1);
    }
};

start();