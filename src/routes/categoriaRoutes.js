// src/routes/categoriaRoutes.js (Com Proteção)
import { Router } from "express";
import { listarCategorias, criarCategoria } from "../controllers/categoriaController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // 👈 IMPORTAR

const router = Router();

router.get("/categorias", listarCategorias);

// Rota de criação de categoria é restrita
router.post("/categorias", authMiddleware, criarCategoria); // 👈 PROTEGER

export default router;