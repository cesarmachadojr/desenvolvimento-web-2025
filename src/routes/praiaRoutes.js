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

router.get("/praias", listarPraias);
router.get("/praias/:id", detalharPraia);
router.post("/praias", criarPraia);
router.patch("/praias/:id", atualizarPraia);
router.delete("/praias/:id", deletarPraia);

export default router;
