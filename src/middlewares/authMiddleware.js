// src/middlewares/authMiddleware.js
// Middleware para verificar se o usuário está autenticado
export const authMiddleware = (req, res, next) => {
    // Verifica se o ID do usuário foi salvo na sessão
    if (req.session.userId) {
        // ⚠️ ADIÇÃO CRUCIAL:
        // Anexa o ID do usuário logado ao objeto de requisição (req).
        // Isso permite que o Controller (ex: criarAvaliacao) acesse o ID.
        req.id_usuario_logado = req.session.userId; 

        // Se estiver logado, continua para a próxima função (o Controller)
        next();
    } else {
        // Se não estiver logado, retorna JSON de erro (ideal para rotas /api)
        console.log("Acesso não autorizado: Usuário não autenticado.");
        return res.status(403).json({ error: "Acesso negado. Por favor, faça login." });
    }
};