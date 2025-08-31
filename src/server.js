// src/server.js
import express from "express";
import { pool } from "./db.js";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(express.json());

// rota de saúde
app.get("/health", (req, res) => res.json({ status: "ok" }));

// listar todos os produtos
app.get("/produtos", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM produtos ORDER BY id DESC");
    res.json(result.rows);
  } catch (err) {
    console.error("Erro ao buscar produtos:", err.message);
    res.status(500).json({ error: "Erro ao buscar produtos" });
  }
});

// criar um produto
app.post("/produtos", async (req, res) => {
  const { nome, preco } = req.body;
  if (!nome || preco == null)
    return res.status(400).json({ error: "nome e preco são obrigatórios" });

  if (typeof nome !== "string" || nome.trim() === "")
    return res.status(400).json({ error: "nome inválido" });

  if (typeof preco !== "number" || preco < 0)
    return res.status(400).json({ error: "preco inválido" });

  try {
    const result = await pool.query(
      "INSERT INTO produtos (nome, preco) VALUES ($1, $2) RETURNING *",
      [nome, preco]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao criar produto:", err.message);
    res.status(500).json({ error: "Erro ao criar produto" });
  }
});

// atualizar um produto
app.patch("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  const { nome, preco } = req.body;

  const updates = [];
  const values = [];
  let idx = 1;

  if (typeof nome === "string" && nome.trim() !== "") {
    updates.push(`nome = $${idx++}`);
    values.push(nome);
  }
  if (typeof preco === "number" && preco >= 0) {
    updates.push(`preco = $${idx++}`);
    values.push(preco);
  }

  if (!updates.length) {
    return res.status(400).json({ error: "Nada válido para atualizar" });
  }

  values.push(id);
  const query = `UPDATE produtos SET ${updates.join(", ")} WHERE id = $${idx} RETURNING *`;

  try {
    const result = await pool.query(query, values);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Erro ao atualizar produto:", err.message);
    res.status(500).json({ error: "Erro ao atualizar produto" });
  }
});

// deletar um produto
app.delete("/produtos/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      "DELETE FROM produtos WHERE id = $1 RETURNING *",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Produto não encontrado" });
    }
    res.json({ message: "Produto deletado", produto: result.rows[0] });
  } catch (err) {
    console.error("Erro ao deletar produto:", err.message);
    res.status(500).json({ error: "Erro ao deletar produto" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`API rodando em http://localhost:${PORT}`);
});
