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

// Rotas de Views (SSR)
import viewsRouter from "./routes/viewsRouter.js";

dotenv.config();
const app = express();

// Definição do ambiente (para configurar 'secure' nos cookies)
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
// MIDDLEWARES DE PARSE
// ============================================================
app.use(express.json());
app.use(express.urlencoded({ extended: true })); 
app.use(cookieParser());

// ============================================================
// SESSÃO (ALTERADO: Segurança Reforçada)
// ============================================================
app.use(session({
    secret: process.env.SESSION_SECRET || "supersecretkey",
    resave: false,
    saveUninitialized: false,
    cookie: {
        // 'secure: true' exige HTTPS. Em localhost usamos false, no deploy true.
        secure: isProduction, 
        
        // 'httpOnly: true' impede que scripts JS no navegador leiam o cookie (Proteção XSS)
        httpOnly: true,
        
        // 'sameSite: strict' impede envio do cookie se a requisição vier de outro site (Proteção CSRF)
        sameSite: 'strict', 
        
        maxAge: 1000 * 60 * 60 // 1 hora
    }
}));

// ============================================================
// CSRF (ALTERADO: Cookie Seguro)
// ============================================================
// Configura o cookie que carrega o segredo do CSRF para ser seguro também
const csrfProtection = csrf({ 
    cookie: {
        httpOnly: true,
        sameSite: 'strict',
        secure: isProduction
    }
});

app.use((req, res, next) => {
    // Aplicar CSRF somente nas rotas de Views, ignorar API JSON
    if (!req.originalUrl.startsWith("/api")) {
        return csrfProtection(req, res, next);
    }
    next();
});

// ============================================================
// VARIÁVEIS GLOBAIS PARA VIEWS
// ============================================================
app.use((req, res, next) => {
    // Verifica se há usuário logado
    res.locals.usuarioLogado = !!req.session.userId;

    // Disponibiliza o Token CSRF para todos os formulários EJS
    try {
        // Se a proteção CSRF estiver ativa na rota, pega o token. Se não, string vazia.
        res.locals.csrfToken = (typeof req.csrfToken === 'function') ? req.csrfToken() : "";
    } catch (err) {
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
// ROTAS DA API (JSON)
// ============================================================
app.use("/api/usuarios", usuarioRoutes);
app.use("/api/praias", praiaRoutes);

// ============================================================
// ROTAS SSR (PÁGINAS EJS)
// ============================================================
app.use("/", viewsRouter);

// ============================================================
// TRATAMENTO DE ERRO 404
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
        app.listen(PORT, "0.0.0.0", () =>
            console.log(`Servidor rodando: http://localhost:${PORT}`)
        );
    } catch (err) {
        console.error("Falha ao iniciar o servidor:", err.message);
        process.exit(1);
    }
};

start();