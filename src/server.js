// src/server.js
import express from "express";
import dotenv from "dotenv";

// 1. Importe os arquivos de rotas
import usuarioRoutes from "./routes/usuarioRoutes.js";
import praiaRoutes from "./routes/praiaRoutes.js";
import categoriaRoutes from "./routes/categoriaRoutes.js";
import avaliacaoRoutes from "./routes/avaliacaoRoutes.js";

// Configuração inicial
dotenv.config();
const app = express();
app.use(express.json());

// Rota de "saúde" para verificar se a API está no ar
app.get("/health", (req, res) => res.json({ status: "API está funcionando!" }));

// 2. Use as rotas importadas com um prefixo /api
app.use("/api", usuarioRoutes);
app.use("/api", praiaRoutes);
app.use("/api", categoriaRoutes);
app.use("/api", avaliacaoRoutes);

// Middleware para tratar rotas não encontradas
app.use((req, res) => {
    res.status(404).json({ error: "Rota não encontrada." });
});

// Inicialização do servidor
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
    console.log(`API rodando em http://localhost:${PORT}`);
    console.log(`Acesse a rota de saúde em http://localhost:${PORT}/health`);
});
