import { Router } from "express";
import {
    listarAvaliacoesDaPraia,
    criarAvaliacao
} from "../controllers/avaliacaoController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // 👈 Importar o middleware

const router = Router();

// Rota para listar todas as avaliações de uma praia específica (Aberto para todos)
router.get("/praias/:id_praia/avaliacoes", listarAvaliacoesDaPraia);

// Rota para criar uma nova avaliação (Requer autenticação)
router.post("/avaliacoes", authMiddleware(), criarAvaliacao); // 👈 Aplicar o middleware

export default router;