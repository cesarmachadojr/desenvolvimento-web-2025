import { Praia } from "../models/Praia.js";

export const renderHome = async (req, res) => {
    try {
        const praias = await Praia.findAll(); // busca TODAS as praias do banco

        res.render("home", {
            title: "Página Inicial",
            praias: praias,
            showNavbar: true  // navbar aparece na Home
        });

    } catch (err) {
        console.error("Erro ao listar praias:", err);
        res.status(500).send("Erro ao carregar página inicial");
    }
};
