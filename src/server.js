// src/server.js
import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
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
// CORREÇÃO DO __dirname PARA ES MODULES
// ============================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// CONFIGURAÇÃO DO EJS
// ============================================================
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

// Layout principal
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Pasta pública
app.use(express.static(path.join(__dirname, "..", "public")));

// ============================================================
// MIDDLEWARES
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================================
// SESSÃO
// ============================================================
app.use(
    session({
        secret: process.env.SESSION_SECRET || "supersecretkey",
        resave: false,
        saveUninitialized: false,
        cookie: {
            secure: false, // Render Free não usa HTTPS nativo
            httpOnly: true,
            maxAge: 1000 * 60 * 60 // 1 hora
        }
    })
);

// ============================================================
// CSRF — APLICAR SOMENTE PARA PÁGINAS (Views)
// ============================================================
const csrfProtection = csrf({ cookie: true });

app.use((req, res, next) => {
    if (!req.originalUrl.startsWith("/api")) {
        return csrfProtection(req, res, next);
    }
    next();
});

// ============================================================
// VARIÁVEIS GLOBAIS PARA VIEWS
// ============================================================
app.use((req, res, next) => {
    res.locals.usuarioLogado = !!req.session.userId;

    try {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    } catch {
        res.locals.csrfToken = "";
    }

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
// ============================================================
app.use("/", viewsRouter);

// ============================================================
// 404
// ============================================================
app.use((req, res) => {
    if (req.originalUrl.startsWith("/api")) {
        return res.status(404).json({
            error: "Rota da API não encontrada."
        });
    }

    res.status(404).render("404", {
        title: "Página não encontrada",
        showNavbar: false
    });
});

// ============================================================
// INICIAR SERVIDOR (Render usa process.env.PORT)
// ============================================================
const PORT = process.env.PORT || 3000;

const start = async () => {
    try {
        await testConnection();

        app.listen(PORT, "0.0.0.0", () => {
            console.log(`🚀 Servidor online → Porta ${PORT}`);
        });
    } catch (err) {
        console.error("❌ Falha ao iniciar o servidor:", err.message);
        process.exit(1);
    }
};

start();
