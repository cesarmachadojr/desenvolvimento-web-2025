// src/routes/categoriaRoutes.js (Com Proteção)
import { Router } from "express";
import { listarCategorias, criarCategoria } from "../controllers/categoriaController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // 👈 IMPORTAR

const router = Router();

// Rota para listar categorias (Aberto para todos)
router.get("/", listarCategorias); // Ajustei o path para /

// Rota de criação de categoria é restrita (Requer autenticação)
// O middleware precisa ser chamado como função: authMiddleware()
router.post("/", authMiddleware(), criarCategoria); // 👈 PROTEGER

export default router;