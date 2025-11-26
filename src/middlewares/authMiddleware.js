// src/middlewares/authMiddleware.js
import { pool } from "../db.js";

export const authMiddleware = (options = {}) => {

    return async (req, res, next) => {

        const isApi = req.headers.accept?.includes("application/json") ||
                      req.originalUrl.startsWith("/api");

        // -------------------------------------------------
        // 1. Verificar LOGIN
        // -------------------------------------------------
        if (!req.session.userId) {
            if (isApi) {
                return res.status(403).json({ error: "Acesso negado. Faça login." });
            }
            return res.redirect("/");
        }

        // Usuário está logado → tornar acessível
        req.id_usuario_logado = req.session.userId;
        res.locals.usuarioId = req.session.userId; // para as views EJS

        // -------------------------------------------------
        // 2. Verificar PERMISSÃO DE DONO DO RECURSO
        // -------------------------------------------------
        if (options.ownerOf === "praia") {
            const idPraia = req.params.id;

            const { rows } = await pool.query(
                "SELECT id_usuario FROM praias WHERE id_praia = $1",
                [idPraia]
            );

            if (rows.length === 0) {
                return isApi 
                    ? res.status(404).json({ error: "Praia não encontrada." })
                    : res.status(404).render("404");
            }

            const dono = rows[0].id_usuario;

            if (dono !== req.session.userId) {
                return isApi
                    ? res.status(403).json({ error: "Você não tem permissão." })
                    : res.redirect("/perfil");
            }
        }

        // -------------------------------------------------
        // 3. Verificar permissão para excluir conta
        // -------------------------------------------------
        if (options.mustConfirmPassword) {
            const { senha_confirmar } = req.body;

            if (!senha_confirmar) {
                req.session.errorMessage = "Confirme sua senha para continuar.";
                return res.redirect("/perfil");
            }

            const { rows } = await pool.query(
                "SELECT senha_hash FROM usuarios WHERE id_usuario=$1",
                [req.session.userId]
            );

            const senhaOk = await bcrypt.compare(senha_confirmar, rows[0].senha_hash);

            if (!senhaOk) {
                req.session.errorMessage = "Senha incorreta.";
                return res.redirect("/perfil");
            }
        }

        // -------------------------------------------------
        // Tudo certo → seguir
        // -------------------------------------------------
        next();
    };
};
