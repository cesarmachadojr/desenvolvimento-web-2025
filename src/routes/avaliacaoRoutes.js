// src/routes/avaliacaoRoutes.js
import { Router } from "express";
import {
    listarAvaliacoesDaPraia,
    criarAvaliacao
} from "../controllers/avaliacaoController.js";

const router = Router();

// Rota para listar todas as avaliações de uma praia específica
router.get("/praias/:id_praia/avaliacoes", listarAvaliacoesDaPraia);

// Rota para criar uma nova avaliação (não precisa ser aninhada)
router.post("/avaliacoes", criarAvaliacao);

export default router;
