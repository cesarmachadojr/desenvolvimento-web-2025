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

// ============================================================
// EJS CONFIGURAÇÃO
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
app.use(session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // true somente em HTTPS
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hora
    }
}));

// ============================================================
// CSRF — SOMENTE PARA ROTAS DE VIEWS
// ============================================================
const csrfProtection = csrf({ cookie: true });

app.use((req, res, next) => {
    // Escapa a API do CSRF
    if (!req.originalUrl.startsWith("/api")) {
        return csrfProtection(req, res, next);
    }
    next();
});

// ============================================================
// VARIÁVEIS GLOBAIS (VIEWS)
// ============================================================
app.use((req, res, next) => {
    // Se o usuário está logado
    res.locals.usuarioLogado = !!req.session.userId;

    // csrfToken (evita crash nas rotas sem csrf)
    try {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    } catch {
        res.locals.csrfToken = "";
    }

    // Flash messages
    res.locals.successMessage = req.session.successMessage;
    res.locals.errorMessage = req.session.errorMessage;

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
app.use("/api", usuarioRoutes);
app.use("/api", praiaRoutes);
app.use("/api", categoriaRoutes);
app.use("/api", avaliacaoRoutes);

// ============================================================
// ROTAS SSR (PÁGINAS)
// ============================================================
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
// START SERVER
// ============================================================
const PORT = process.env.PORT || 3000;

const start = async () => {
    await testConnection();
    app.listen(PORT, "0.0.0.0", () =>
        console.log(`Servidor rodando: http://localhost:${PORT}`)
    );
};

start();
