import express from "express";
import dotenv from "dotenv";
import path from "path";
import expressLayouts from "express-ejs-layouts";
import session from "express-session";
import cookieParser from "cookie-parser";
import csrf from "csurf";
import { testConnection } from "./db.js";
import cors from "cors"; // 1. Importação do CORS

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
// Usamos path.resolve() para obter o caminho base do projeto no Render.
const __dirname = path.resolve(); 

// CORREÇÃO APLICADA AQUI:
// Se sua estrutura de pastas é:
// - project-root/
//   - src/
//     - views/ (Onde estão os arquivos ejs)
// Você deve remover o __dirname, pois ele pode já apontar para 'project-root/src'
// Ou usar path.join(__dirname, 'views') se 'project-root' for o root do git
// Vamos usar a forma mais robusta com require.main.path ou usar o caminho corrigido:

// Se a pasta 'views' está DENTRO de 'src', e 'src' é a raiz no Render:
app.set("views", path.join(__dirname, "views")); // Corrigido para funcionar no Render
app.set("view engine", "ejs");

// Layout principal
app.use(expressLayouts);
app.set("layout", "layouts/main");

// Pasta pública
app.use(express.static(path.join(__dirname, "public")));

// ============================================================
// CONFIGURAÇÃO DO CORS
// ============================================================

// Lista de origens (domínios) que têm permissão para acessar o backend
const allowedOrigins = [
    'http://localhost:3000', // Para testes locais (se estiver usando o frontend E backend locais)
    'http://localhost:5500', // Comum para Live Server ou testes locais do frontend
    // *****************************************************************
    // ⚠️ SUBSTITUA ESTA LINHA PELA SUA URL REAL DO GITHUB PAGES:
    // Exemplo: 'https://joaosilva.github.io/praias-brasil-frontend'
    // *****************************************************************
    'https://SUA_URL_GITHUB_PAGES', 
];

app.use(cors({
    origin: function (origin, callback) {
        // Se a origem não estiver presente (ex: requisições diretas de servidor ou Postman), permite.
        if (!origin) return callback(null, true);
        
        // Verifica se a origem da requisição está na lista de origens permitidas.
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'A política CORS não permite o acesso desta origem: ' + origin;
            console.error('CORS BLOCK:', msg);
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true // Crucial para permitir o envio de cookies de sessão/auth
}));

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