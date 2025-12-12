// src/routes/usuarioRoutes.js
import { Router } from "express";
import {
    listarUsuarios,
    criarUsuario,
    atualizarUsuario,
    deletarUsuario,
    login,
    logout
} from "../controllers/usuarioController.js";

const router = Router();

/* ===========================================
   AUTENTICAÇÃO
=========================================== */
router.post("/login", login);

// CORREÇÃO AQUI: Mudado de .post para .get para funcionar com o link <a> do HTML
router.get("/logout", logout); 

/* ===========================================
   CRUD DE USUÁRIOS (API)
=========================================== */
router.get("/usuarios", listarUsuarios);

// Recebe dados do formulário de cadastro
router.post("/usuarios/cadastrar", criarUsuario); // ✅ Cadastro de usuário via POST

router.patch("/usuarios/:id", atualizarUsuario);
router.delete("/usuarios/:id", deletarUsuario);

export default router;