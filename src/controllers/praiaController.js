// src/controllers/praiaController.js
import { pool } from "../db.js";

/* ============================================================
   LISTAR PRAIAS (API + SSR)
   ============================================================ */
export const listarPraias = async (req, res, isSSR = false) => {
    const { cidade, estado } = req.query;

    let query = `
        SELECT 
            p.*, 
            COALESCE(AVG(a.nota), 0)::numeric(10,2) AS media_calc,
            COUNT(a.id_avaliacao) AS total_avaliacoes
        FROM praias p
        LEFT JOIN avaliacoes a ON p.id_praia = a.id_praia
    `;

    const conditions = [];
    const values = [];
    let idx = 1;

    if (cidade) {
        conditions.push(`p.cidade ILIKE $${idx++}`);
        values.push(`%${cidade}%`);
    }
    if (estado) {
        conditions.push(`p.estado ILIKE $${idx++}`);
        values.push(`%${estado}%`);
    }

    if (conditions.length > 0) {
        query += " WHERE " + conditions.join(" AND ");
    }

    query += `
        GROUP BY p.id_praia
        ORDER BY media_calc DESC, p.nome ASC
    `;

    try {
        const result = await pool.query(query, values);

        const praias = result.rows.map(p => ({
            ...p,
            media_avaliacao: Number(p.media_calc),
            total_avaliacoes: Number(p.total_avaliacoes)
        }));

        // 👉 Modo SSR (views)
        if (isSSR) {
            return { rows: praias };
        }

        // 👉 Modo API
        return res.json(praias);

    } catch (err) {
        console.error("❌ ERRO LISTAR PRAIAS:", err.message);

        if (isSSR) return { rows: [] };

        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

/* ============================================================
   DETALHAR PRAIA
   ============================================================ */
export const detalharPraia = async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            `
            SELECT p.*, 
                   COALESCE(AVG(a.nota),0)::numeric(10,2) AS media_avaliacao,
                   COUNT(a.id_avaliacao) AS total_avaliacoes
            FROM praias p
            LEFT JOIN avaliacoes a ON p.id_praia = a.id_praia
            WHERE p.id_praia = $1
            GROUP BY p.id_praia
            `,
            [id]
        );

        if (result.rowCount === 0)
            return res.status(404).json({ error: "Praia não encontrada." });

        return res.json(result.rows[0]);

    } catch (err) {
        console.error("Erro ao detalhar praia:", err.message);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

/* ============================================================
   CRIAR PRAIA
   ============================================================ */
export const criarPraia = async (req, res) => {
    const { nome, cidade, estado, descricao, foto_url, categorias } = req.body;

    if (!nome || !cidade || !estado) {
        if (!req.session)
            return res.status(400).json({ error: "Nome, cidade e estado são obrigatórios." });

        req.session.errorMessage = "Nome, cidade e estado são obrigatórios.";
        return res.redirect("/praias/nova");
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const praiaResult = await client.query(
            `INSERT INTO praias
                (nome, cidade, estado, descricao, foto_url, data_criacao, data_atualizacao)
             VALUES ($1,$2,$3,$4,$5,NOW(),NOW())
             RETURNING id_praia, nome`,
            [nome, cidade, estado, descricao, foto_url]
        );

        const novaPraia = praiaResult.rows[0];

        if (categorias && Array.isArray(categorias)) {
            await Promise.all(
                categorias.map(idCategoria =>
                    client.query(
                        "INSERT INTO praias_categorias (id_praia, id_categoria) VALUES ($1,$2)",
                        [novaPraia.id_praia, idCategoria]
                    )
                )
            );
        }

        await client.query("COMMIT");

        if (!req.session) return res.status(201).json(novaPraia);

        req.session.successMessage = `Praia "${novaPraia.nome}" criada com sucesso!`;
        return res.redirect("/");

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Erro ao criar praia:", err.message);

        if (!req.session)
            return res.status(500).json({ error: "Erro interno ao cadastrar a praia." });

        req.session.errorMessage = "Erro ao criar praia. Tente novamente.";
        return res.redirect("/praias/nova");

    } finally {
        client.release();
    }
};

/* ============================================================
   ATUALIZAR PRAIA
   ============================================================ */
export const atualizarPraia = async (req, res) => {
    const { id } = req.params;
    const { nome, cidade, estado, descricao, foto_url } = req.body;

    let fields = [];
    let values = [];
    let idx = 1;

    if (nome) { fields.push(`nome = $${idx++}`); values.push(nome); }
    if (cidade) { fields.push(`cidade = $${idx++}`); values.push(cidade); }
    if (estado) { fields.push(`estado = $${idx++}`); values.push(estado); }
    if (descricao !== undefined) { fields.push(`descricao = $${idx++}`); values.push(descricao); }
    if (foto_url !== undefined) { fields.push(`foto_url = $${idx++}`); values.push(foto_url); }

    fields.push(`data_atualizacao = NOW()`);
    values.push(id);

    try {
        const result = await pool.query(
            `UPDATE praias SET ${fields.join(", ")} WHERE id_praia = $${idx} RETURNING *`,
            values
        );

        if (result.rowCount === 0)
            return res.status(404).json({ error: "Praia não encontrada." });

        return res.json(result.rows[0]);

    } catch (err) {
        console.error("Erro ao atualizar praia:", err.message);
        return res.status(500).json({ error: "Erro interno do servidor." });
    }
};

/* ============================================================
   DELETAR PRAIA
   ============================================================ */
export const deletarPraia = async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        await client.query("DELETE FROM avaliacoes WHERE id_praia = $1", [id]);
        await client.query("DELETE FROM praias_categorias WHERE id_praia = $1", [id]);

        const result = await client.query(
            "DELETE FROM praias WHERE id_praia = $1 RETURNING *",
            [id]
        );

        await client.query("COMMIT");

        if (result.rowCount === 0)
            return res.status(404).json({ error: "Praia não encontrada." });

        return res.status(204).send();

    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Erro ao deletar praia:", err.message);
        return res.status(500).json({ error: "Erro interno ao deletar praia." });

    } finally {
        client.release();
    }
};
