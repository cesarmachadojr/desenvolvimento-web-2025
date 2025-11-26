import { Router } from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js"; // 👈 NOVO: Importar middleware

import {
    listarPraias,
    detalharPraia,
    criarPraia,
    atualizarPraia,
    deletarPraia
} from "../controllers/praiaController.js";

const router = Router();

// =======================================================
// ROTAS DE CONSULTA (Abertas a todos)
// =======================================================

router.get("/", listarPraias);                // Listar todas as praias
router.get("/:id", detalharPraia);           // Detalhar uma praia específica


// =======================================================
// ROTAS PROTEGIDAS (Requerem autenticação/autorização)
// =======================================================

// Criar Praia (Requer apenas login)
router.post("/", authMiddleware(), criarPraia);             

// Atualizar Praia (Requer login E ser o dono do recurso)
router.put("/:id", authMiddleware({ ownerOf: "praia" }), atualizarPraia);      

// Deletar Praia (Requer login E ser o dono do recurso)
router.delete("/:id", authMiddleware({ ownerOf: "praia" }), deletarPraia);     

export default router;