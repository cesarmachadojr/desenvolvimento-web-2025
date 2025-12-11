// src/routes/praiaRoutes.js
import { Router } from "express";

import {
    listarPraias,
    detalharPraia,
    criarPraia,
    atualizarPraia,
    deletarPraia
} from "../controllers/praiaController.js";

const router = Router();

// Rotas API (JSON)
router.get("/praias", listarPraias);            // Listar
router.get("/praias/:id", detalharPraia);       // Detalhar
router.post("/praias", criarPraia);             // Criar
router.put("/praias/:id", atualizarPraia);      // Atualizar (via API/AJAX)
router.delete("/praias/:id", deletarPraia);     // Deletar (via API/AJAX)

// Rotas para Formulários HTML (SSR)
// Adicionada para funcionar com o form action="/praias/:id/deletar" method="POST"
router.post("/praias/:id/deletar", deletarPraia);

export default router;