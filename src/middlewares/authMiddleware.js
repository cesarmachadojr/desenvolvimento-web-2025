import { pool } from "../db.js";
import bcrypt from 'bcrypt'; // 👈 NOVO: Importar bcrypt para comparação de senha

/**
 * Middleware de Autenticação e Autorização (isAuth, isOwner, mustConfirmPassword).
 * * @param {object} options - Opções para o middleware.
 * @param {string} [options.ownerOf] - Verifica se o usuário logado é dono do recurso ('praia').
 * @param {boolean} [options.mustConfirmPassword] - Requer a confirmação da senha via req.body.senha_confirmar.
 * @returns {function} Middleware Express.
 */
export const authMiddleware = (options = {}) => {

    return async (req, res, next) => {

        // Identifica se a requisição é para a API (JSON) ou para uma View (EJS/HTML)
        const isApi = req.headers.accept?.includes("application/json") ||
                      req.originalUrl.startsWith("/api");

        // -------------------------------------------------
        // 1. Verificar LOGIN (Usuário logado?)
        // -------------------------------------------------
        if (!req.session || !req.session.userId) {
            if (isApi) {
                return res.status(403).json({ error: "Acesso negado. Faça login." });
            }
            // Redireciona para a home (onde tipicamente fica o login)
            return res.redirect("/");
        }

        // Usuário está logado → torna o ID acessível em req e nas views
        req.id_usuario_logado = req.session.userId;
        res.locals.usuarioId = req.session.userId; // para as views EJS

        // -------------------------------------------------
        // 2. Verificar PERMISSÃO DE DONO DO RECURSO (isOwner)
        // -------------------------------------------------
        if (options.ownerOf === "praia") {
            const idPraia = req.params.id;

            // Busca o dono da praia no banco de dados
            const { rows } = await pool.query(
                "SELECT id_usuario FROM praias WHERE id_praia = $1",
                [idPraia]
            );

            if (rows.length === 0) {
                // Recurso não existe (Praia não encontrada)
                return isApi 
                    ? res.status(404).json({ error: "Praia não encontrada." })
                    : res.status(404).render("404"); // Renderiza uma página de erro
            }

            const dono = rows[0].id_usuario;

            if (dono !== req.session.userId) {
                // Usuário não é o dono
                return isApi
                    ? res.status(403).json({ error: "Você não tem permissão para modificar esta praia." })
                    : res.redirect("/perfil"); // Redireciona para o perfil (pode ser /praias)
            }
        }

        // -------------------------------------------------
        // 3. Verificar senha para ação sensível (mustConfirmPassword)
        // -------------------------------------------------
        if (options.mustConfirmPassword) {
            const { senha_confirmar } = req.body;

            if (!senha_confirmar) {
                req.session.errorMessage = "Confirme sua senha para continuar.";
                return res.redirect("/perfil");
            }

            // Busca o hash da senha do usuário logado
            const { rows } = await pool.query(
                "SELECT senha_hash FROM usuarios WHERE id_usuario=$1",
                [req.session.userId]
            );

            // Compara a senha fornecida com o hash
            const senhaOk = await bcrypt.compare(senha_confirmar, rows[0].senha_hash);

            if (!senhaOk) {
                req.session.errorMessage = "Senha incorreta.";
                return res.redirect("/perfil");
            }
            
            // Limpa a mensagem de erro da sessão
            delete req.session.errorMessage;
        }

        // -------------------------------------------------
        // Tudo certo → seguir para o próximo middleware/controller
        // -------------------------------------------------
        next();
    };
};