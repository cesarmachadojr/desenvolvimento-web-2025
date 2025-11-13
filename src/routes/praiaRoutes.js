// src/routes/praiaRoutes.js
import { Router } from "express";
import {
    listarPraias,
    detalharPraia,
    criarPraia,
    atualizarPraia,
    deletarPraia
} from "../controllers/praiaController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // 👈 NOVO: Importar Middleware

const router = Router();

router.get("/praias", listarPraias);
router.get("/praias/:id", detalharPraia);

// Rotas de manipulação (CRUD) protegidas pelo authMiddleware
// Apenas usuários logados podem criar, atualizar ou deletar praias
router.post("/praias", authMiddleware, criarPraia);       // 👈 PROTEGIDA
router.patch("/praias/:id", authMiddleware, atualizarPraia); // 👈 PROTEGIDA
router.delete("/praias/:id", authMiddleware, deletarPraia); // 👈 PROTEGIDA

export default router;