import { pool } from "../db.js";

// --- Listar avaliações de uma praia ---
export const listarAvaliacoesDaPraia = async (req, res) => {
    const { id_praia } = req.params;
    try {
        const result = await pool.query(
            "SELECT av.*, us.nome as nome_usuario FROM avaliacoes av JOIN usuarios us ON av.id_usuario = us.id_usuario WHERE av.id_praia = $1 ORDER BY data_avaliacao DESC",
            [id_praia]
        );
        res.json(result.rows);
    } catch (err) {
        console.error("Erro ao buscar avaliações:", err.message);
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};

// --- Criar uma nova avaliação ---
export const criarAvaliacao = async (req, res) => {
    // ⚠️ MUDANÇA: 'id_usuario' não é mais desestruturado de req.body
    const { nota, comentario, id_praia } = req.body;
    
    // 🔑 CORREÇÃO: Pega o ID do usuário logado do middleware (sessão)
    const id_usuario = req.id_usuario_logado; 
    
    // Validações
    // id_usuario agora é garantido pelo authMiddleware
    if (!nota || !id_praia) { 
        return res.status(400).json({ error: "Nota e id_praia são obrigatórios." });
    }
    if (typeof nota !== 'number' || nota < 1 || nota > 5) {
        return res.status(400).json({ error: "A nota deve ser um número entre 1 e 5." });
    }

    try {
        // 1. Inserir a nova avaliação
        const result = await pool.query(
            "INSERT INTO avaliacoes (nota, comentario, id_usuario, id_praia, data_avaliacao) VALUES ($1, $2, $3, $4, NOW()) RETURNING *",
            [nota, comentario, id_usuario, id_praia] // Usa o id_usuario da sessão
        );

        // 2. Atualizar a média na tabela de praias
        await pool.query(
          `UPDATE praias SET media_avaliacao = (
               SELECT AVG(nota) FROM avaliacoes WHERE id_praia = $1
           ) WHERE id_praia = $1`,
          [id_praia]
        );

        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error("Erro ao criar avaliação:", err.message);
        // Tratar erro de chave estrangeira (usuário ou praia não existem)
        if (err.code === '23503') {
            return res.status(404).json({ error: "Usuário ou Praia não encontrado. Verifique se o ID está correto."});
        }
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};