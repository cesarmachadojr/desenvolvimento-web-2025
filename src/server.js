import express from "express";
import dotenv from "dotenv";
import path from "path";              
import session from 'express-session'; 
import cookieParser from 'cookie-parser'; // Necessário para 'csurf' funcionar
import csrf from 'csurf';             
import expressLayouts from 'express-ejs-layouts'; 

// 1. Importe os arquivos de rotas e os controllers necessários
import usuarioRoutes from "./routes/usuarioRoutes.js";
import praiaRoutes from "./routes/praiaRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import avaliacaoRoutes from "./routes/avaliacaoRoutes.js";

// Importamos listarPraias e criarPraia para as rotas SSR
import { listarPraias, criarPraia } from "./controllers/praiaController.js"; 
import { loginUsuario, registrarUsuario } from "./controllers/usuarioController.js"; 
// Lembre-se que o arquivo do controller de usuário está como 'ususarioController.js' no seu projeto.
// Garanta que você renomeie para 'usuarioController.js' ou ajuste o import:
// import { loginUsuario, registrarUsuario } from "./controllers/ususarioController.js";


// Configuração inicial
dotenv.config();
const app = express();
const __dirname = path.resolve(); 

// --- CONFIGURAÇÕES DE SSR E SEGURANÇA ---

// 2. Configurar EJS (Template Engine)
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src', 'views')); 

// Adicionar suporte a layouts EJS
app.use(expressLayouts);
app.set('layout', 'layout'); // Define layout.ejs como o template padrão

// 3. Servir arquivos estáticos (CSS, JS, Imagens)
app.use(express.static(path.join(__dirname, 'public'))); 

// 4. Processamento de dados de formulário
app.use(express.urlencoded({ extended: true })); 
app.use(express.json()); 

// 5. Configurar Cookie Parser e Sessão
app.use(cookieParser()); // Necessário para CSRF

app.use(session({
    secret: process.env.SESSION_SECRET || 'CHAVE_INSEGURA_PADRAO', 
    resave: false,
    saveUninitialized: false,
    cookie: { 
        httpOnly: true,     
        secure: process.env.NODE_ENV === 'production', 
        sameSite: 'Lax',    
        maxAge: 1000 * 60 * 60 * 24 // 24 horas
    }
}));

// 6. Configurar CSRF Protection
// O middleware CSRF deve ser usado *após* o cookieParser e express-session
const csrfProtection = csrf({ cookie: true }); 

// 7. Middleware para Views (Disponibiliza o status de Login e mensagens)
app.use((req, res, next) => {
    // Verifica se há ID de usuário na sessão para saber se está logado
    res.locals.usuarioLogado = req.session.userId || null;
    // Passa mensagens da sessão para o escopo das views
    res.locals.successMessage = req.session.successMessage;
    res.locals.errorMessage = req.session.errorMessage;
    next();
});

// Middleware para limpar mensagens da sessão após serem usadas (Flash Messages)
app.use((req, res, next) => {
    if (res.locals.successMessage) delete req.session.successMessage;
    if (res.locals.errorMessage) delete req.session.errorMessage;
    next();
});

// --- DEFINIÇÃO DE ROTAS SSR (VIEWS) ---

// Rota para o Home/Index (Lista de Praias)
app.get("/", csrfProtection, async (req, res) => {
    let praias = [];
    let loadError = null;

    try {
        // Mock da resposta para reuso do controller, que espera um objeto 'res'
        const mockRes = { json: (data) => data, status: () => mockRes, send: () => {} };
        
        // Chamada direta ao controller listarPraias
        const result = await listarPraias(req, mockRes); 
        praias = result || [];
    } catch (error) {
        console.error("Erro ao carregar Home:", error.message);
        loadError = "Não foi possível carregar a lista de praias. Tente novamente mais tarde.";
    }
    
    res.render("home", { 
        title: "Guia de Praias - Home",
        csrfToken: req.csrfToken(),
        praias: praias,
        // Combina o erro de carregamento com a mensagem de erro da sessão (se houver)
        errorMessage: loadError || res.locals.errorMessage 
    });
});


// --- Rotas de Usuário (SSR) ---

// Rota para exibir o formulário de Login
app.get("/login", csrfProtection, (req, res) => {
    res.render("login", {
        title: "Login de Usuário",
        csrfToken: req.csrfToken()
    });
});

// Rota para processar o Login (Reuso do Controller 'loginUsuario')
app.post("/api/login", csrfProtection, async (req, res) => {
    // Usamos o controller, mas o redirecionamento fica aqui
    try {
        await loginUsuario(req, res); // O controller pode setar a sessão e dar um res.json
        
        // Se o controller não deu erro, assume-se que o login foi bem-sucedido
        // O res.json no controller (que é API) precisa ser suprimido ou modificado
        // No momento, se o controller for de API, ele vai dar 'res.json', então precisamos de um wrapper
        
        // **Ajuste:** Para SSR, vamos checar a sessão após a chamada do controller.
        // Se o controller for estritamente API (devolve JSON), vamos precisar de uma lógica mais complexa.
        // POR ENQUANTO, como o `loginUsuario` não está disponível para inspeção,
        // vamos assumir que ele configura `req.session.userId` e redirecionar:

        if (req.session.userId) {
            req.session.successMessage = "Login realizado com sucesso!";
            return res.redirect("/");
        } else {
            // Se o controller falhar, ele deve ter configurado o res.status(401) ou similar.
            // Aqui fazemos uma suposição de erro genérico se não houve sucesso de login.
            req.session.errorMessage = "Email ou senha inválidos.";
            return res.redirect("/login");
        }

    } catch (error) {
        // Isso pega erros internos de servidor (DB, etc.)
        console.error("Erro no Login (SSR):", error.message);
        req.session.errorMessage = "Erro interno no servidor durante o login.";
        return res.redirect("/login");
    }
});


// Rota para exibir o formulário de Registro
app.get("/registrar", csrfProtection, (req, res) => {
    res.render("registrar", {
        title: "Novo Usuário",
        csrfToken: req.csrfToken()
    });
});

// Rota para processar o Registro (Reuso do Controller 'registrarUsuario')
app.post("/api/usuarios", csrfProtection, async (req, res) => {
    try {
        // Mock de resposta para o controller
        const mockRes = { json: () => {}, status: () => mockRes, send: () => {} };
        await registrarUsuario(req, mockRes);

        // Se o registro for bem-sucedido, redireciona para o login com mensagem.
        req.session.successMessage = "Usuário registrado com sucesso! Faça login para continuar.";
        return res.redirect("/login");
    } catch (error) {
        // Pega erros de validação (ex: email já existe) ou erros de servidor
        console.error("Erro no Registro (SSR):", error.message);
        
        // Tentativa de obter mensagem de erro do controller, se existir
        const errorMessage = error.message.includes("já existe") 
            ? "O email fornecido já está em uso."
            : "Erro ao registrar o usuário. Verifique os dados e tente novamente.";
            
        req.session.errorMessage = errorMessage;
        return res.redirect("/registrar");
    }
});

// Rota de Logout
app.post("/api/logout", (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error("Erro ao destruir a sessão:", err);
            req.session.errorMessage = "Erro ao fazer logout.";
            return res.redirect("/");
        }
        res.clearCookie('connect.sid'); // Limpa o cookie da sessão
        req.session.successMessage = "Logout realizado com sucesso.";
        res.redirect("/login");
    });
});


// --- Rotas de Praia (SSR) ---

// Rota para o Formulário de Cadastro de Nova Praia (GET /praias/nova)
app.get("/praias/nova", csrfProtection, (req, res) => {
    // Renderiza o formulário de cadastro, passando o token CSRF
    res.render("praia_cadastro", {
        title: "Cadastrar Nova Praia",
        csrfToken: req.csrfToken(),
        // Mensagens já estão em res.locals
    });
});

// Rota para RECEBER O CADASTRO (POST /api/praias) - Adaptada para SSR
// Esta rota consome o controller 'criarPraia' e gerencia o redirecionamento.
app.post("/api/praias", csrfProtection, async (req, res) => {
    const { nome, cidade, estado } = req.body;
    
    // Validação básica
    if (!nome || !cidade || !estado) {
        req.session.errorMessage = "Nome, cidade e estado são obrigatórios.";
        return res.redirect("/praias/nova");
    }

    try {
        // Mock de resposta para o controller criarPraia
        const mockRes = { json: () => {}, status: () => mockRes, send: () => {} };
        
        // Chamada direta ao controller 'criarPraia'. Ele fará o INSERT no DB.
        await criarPraia(req, mockRes);

        // Se deu certo, define mensagem de sucesso e redireciona para a Home
        req.session.successMessage = `Praia "${nome}" cadastrada com sucesso!`;
        res.redirect("/"); 
        
    } catch (error) {
        console.error("Erro no cadastro de praia (SSR):", error.message);
        let errorMessage = "Erro ao cadastrar a praia. Verifique os dados e tente novamente.";
        
        // Tenta capturar erro de duplicidade (código '23505' do PG)
        if (error.code === '23505') {
            errorMessage = "Esta praia já está cadastrada.";
        }

        req.session.errorMessage = errorMessage;
        // Redireciona de volta ao formulário com mensagem de erro
        res.redirect("/praias/nova"); 
    }
});


// --- ROTAS API EXISTENTES (MANTIDAS) ---

// Rota de "saúde" (mantida)
app.get("/health", (req, res) => res.json({ status: "API está funcionando!" }));

// Suas rotas API existentes 
app.use("/api", usuarioRoutes);
app.use("/api", praiaRoutes);
app.use("/api", categoriaRoutes);
app.use("/api", avaliacaoRoutes);

// --- Tratamento de Erros ---

// Middleware para tratar rotas não encontradas
app.use((req, res) => {
    res.status(404).render("404", { 
        title: "Página Não Encontrada"
    });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Aplicação rodando em http://localhost:${PORT}`);
    console.log(`Rotas SSR: /, /login, /registrar, /praias/nova`);
});