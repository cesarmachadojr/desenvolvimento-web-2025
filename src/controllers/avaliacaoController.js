// src/controllers/avaliacaoController.js
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
    const { nota, comentario, id_usuario, id_praia } = req.body;
    
    // Validações
    if (!nota || !id_usuario || !id_praia) {
        return res.status(400).json({ error: "Nota, id_usuario e id_praia são obrigatórios." });
    }
    if (typeof nota !== 'number' || nota < 1 || nota > 5) {
        return res.status(400).json({ error: "A nota deve ser um número entre 1 e 5." });
    }

    try {
        // 1. Inserir a nova avaliação
        const result = await pool.query(
            "INSERT INTO avaliacoes (nota, comentario, id_usuario, id_praia) VALUES ($1, $2, $3, $4) RETURNING *",
            [nota, comentario, id_usuario, id_praia]
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
            return res.status(404).json({ error: "Usuário ou Praia não encontrado."});
        }
        res.status(500).json({ error: "Erro interno do servidor" });
    }
};
