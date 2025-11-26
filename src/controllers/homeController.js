import { Praia } from "../models/Praia.js";

export const renderHome = async (req, res) => {
    try {
        // Busca todas as praias do banco de dados para exibir na página inicial
        const praias = await Praia.findAll(); 

        // Renderiza a view 'home.ejs'
        res.render("home", {
            title: "Página Inicial",
            praias: praias,
            showNavbar: true  // Exibe a barra de navegação na Home
        });

    } catch (err) {
        console.error("Erro ao listar praias:", err);
        res.status(500).send("Erro ao carregar página inicial");
    }
};