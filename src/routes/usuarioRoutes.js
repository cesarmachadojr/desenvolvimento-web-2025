// src/routes/usuarioRoutes.js
import { Router } from "express";
import {
    listarUsuarios,
    criarUsuario,
    atualizarUsuario,
    deletarUsuario,
    login,   // 👈 NOVO: Importa a função de login
    logout   // 👈 NOVO: Importa a função de logout
} from "../controllers/usuarioController.js";

const router = Router();

// --- ROTAS DE AUTENTICAÇÃO ---
// É prática padrão usar POST para login e logout em aplicações web.
router.post("/login", login);      // Endpoint para iniciar a sessão
router.post("/logout", logout);    // Endpoint para encerrar a sessão

// --- ROTAS CRUD DE USUÁRIOS (Mantidas) ---
router.get("/usuarios", listarUsuarios);
router.post("/usuarios", criarUsuario);
router.patch("/usuarios/:id", atualizarUsuario); 
router.delete("/usuarios/:id", deletarUsuario);

export default router;