// src/routes/usuarioRoutes.js
import { Router } from "express";
import {
    listarUsuarios,
    criarUsuario,
    atualizarUsuario,
    deletarUsuario
} from "../controllers/usuarioController.js";

const router = Router();

// Define as rotas para o recurso de usuários
router.get("/usuarios", listarUsuarios);
router.post("/usuarios", criarUsuario);
router.patch("/usuarios/:id", atualizarUsuario); // Usando PATCH para atualizações parciais
router.delete("/usuarios/:id", deletarUsuario);

export default router;
