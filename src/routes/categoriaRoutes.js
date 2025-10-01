// src/routes/categoriaRoutes.js
import { Router } from "express";
import { listarCategorias, criarCategoria } from "../controllers/categoriaController.js";

const router = Router();

router.get("/categorias", listarCategorias);
router.post("/categorias", criarCategoria);

export default router;
