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
// MIDDLEWARES DE PARSE (IMPORTANTE PARA O FORMULÁRIO)
// ============================================================
app.use(express.json());
// "extended: true" permite receber objetos aninhados e o token CSRF via body
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
        secure: false, // Mude para true se estiver usando HTTPS em produção
        httpOnly: true,
        maxAge: 1000 * 60 * 60 // 1 hora
    }
}));

// ============================================================
// CSRF — PROTEÇÃO PARA FORMULÁRIOS
// ============================================================
// Habilita proteção CSRF usando cookies
const csrfProtection = csrf({ cookie: true });

app.use((req, res, next) => {
    // Aplicar CSRF somente nas rotas de Views (navegador), ignorar API JSON
    if (!req.originalUrl.startsWith("/api")) {
        return csrfProtection(req, res, next);
    }
    next();
});

// ============================================================
// VARIÁVEIS GLOBAIS PARA VIEWS
// ============================================================
app.use((req, res, next) => {
    // Variável para verificar nos EJS se há usuário logado
    res.locals.usuarioLogado = !!req.session.userId;

    // Disponibiliza o Token CSRF para todos os formulários EJS
    try {
        res.locals.csrfToken = req.csrfToken ? req.csrfToken() : "";
    } catch (err) {
        res.locals.csrfToken = "";
    }

    // Flash messages (Mensagens de Sucesso/Erro)
    res.locals.successMessage = req.session.successMessage || null;
    res.locals.errorMessage = req.session.errorMessage || null;

    // Limpa as mensagens da sessão após passá-las para a view
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
app.use("/api/categorias", categoriaRoutes);
app.use("/api/avaliacoes", avaliacaoRoutes);

// ============================================================
// ROTAS SSR (PÁGINAS EJS)
// ============================================================
// Aqui é onde nossa rota POST de deletar será chamada
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