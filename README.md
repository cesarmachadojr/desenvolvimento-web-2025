# Guia de Praias — Descubra e Avalie Praias

## 1) Problema

Turistas e moradores, em qualquer região litorânea, têm dificuldade em descobrir praias de forma confiável.
Isso causa perda de tempo e experiências ruins, já que as informações estão espalhadas ou são incompletas.
No início, o foco será **usuários que buscam praias para lazer**, com o objetivo de **organizar informações**.

## 2) Atores e Decisores

Usuários principais: Turistas, Moradores, Amantes de praia
Decisores/Apoiadores: Administradores do sistema, Coordenadores do projeto

## 3) Casos de uso

Todos: Logar/deslogar do sistema; Manter dados cadastrais
Usuário: Manter (inserir, mostrar, editar, remover) praias; 

## 4) Limites e suposições

Limites: Entrega final até o fim da disciplina; rodar no navegador; sem serviços pagos obrigatórios
Suposições: Internet disponível; navegador atualizado; acesso ao GitHub; 10 min para teste rápido
Plano B: Sem internet → rodar local e salvar em LocalStorage; sem tempo do professor → testar com 3 colegas

## 5) Hipóteses + validação

H-Valor: Se os usuários visualizarem praias com mais detalhes, então escolhem melhores praias de forma mais rápida e confiável
Validação (valor): Teste com 5 usuários; sucesso se ≥4 encontrarem praias relevantes sem ajuda

H-Viabilidade: Com HTML/CSS/JS + backend simples (Node.js/Express ou similar), criar e listar praias e avaliações leva até 1 segundo
Validação (viabilidade): Medição no protótipo; meta: 1s ou menos na maioria das vezes (≥9/10)

## 6) Fluxo principal e primeira fatia (atualizado)

**Fluxo principal (curto):**

1. Usuário faz login
2. Seleciona **localização desejada**
3. Lista de praias filtradas
4. Usuário pode **visualizar detalhes** 


**Primeira fatia vertical (escopo mínimo):**
Inclui: Tela de login, lista de praias com filtro por localização

Critérios de aceite:

* Usuário consegue se autenticar e sair da sessão
* Lista de praias aparece apenas para a localização selecionada

**Fluxo principal (curto):**  

![Fluxo Principal](imgs/fluxoPrincipal.png)

**Fluxo secundário (longo):**  

![Fluxo Secundário](imgs/fluxoSecundario.png)


## 7) Esboços de algumas telas (wireframes) (atualizado)


* Login
* Lista de praias (com filtro de **localização**, categorias e ranking)

  * Cada praia pode ser clicada/expandida para mostrar detalhes e avaliação na mesma tela
* Perfil do usuário (avaliações feitas, praias cadastradas)
  \[Links ou imagens dos seus rascunhos de telas aqui]
![Esboço de Algumas Telas](imgs/modeloTelas.png)

## 8) Tecnologias

### 8.1 Navegador

**Navegador:** HTML/CSS/JS (+ Bootstrap ou Tailwind)
**Armazenamento local:** LocalStorage (opcional)
**Hospedagem:** GitHub Pages (frontend)

### 8.2 Front-end (servidor de aplicação)

**Front-end (servidor):** React ou Next.js
**Hospedagem:** Render

### 8.3 Back-end (API/servidor)

**Back-end (API):** Node.js + Express
**Banco de dados:** PostgreSQL 
**Deploy do back-end:** Render 

**Integração das Tecnologias:**  

![Integração das Tecnologias](imgs/integraçãoTecnlogias.png)

## 9) Plano de Dados (Dia 0) — somente itens 1–3

### 9.1 Entidades

* Usuario — pessoa que usa o sistema
* Praia — praia cadastrada no guia


### 9.2 Campos por entidade

### Usuario

| Campo           | Tipo        | Obrigatório | Exemplo                                     |
| --------------- | ----------- | ----------- | ------------------------------------------- |
| id              | número      | sim         | 1                                           |
| nome            | texto       | sim         | "Ana Souza"                                 |
| email           | texto       | sim (único) | "[ana@exemplo.com](mailto:ana@exemplo.com)" |
| senha\_hash     | texto       | sim         | "\$2a\$10\$..."                             |

### Praia

| Campo       | Tipo   | Obrigatório | Exemplo                    |
| ----------- | ------ | ----------- | -------------------------- |
| id          | número | sim         | 1                          |
| nome        | texto  | sim         | "Praia do Rosa"            |
| localizacao | texto  | sim         | "SC, Brasil"               |
| descricao   | texto  | não         | "Ótima para surf e trilha" |
| foto\_url   | texto  | não         | "rosa.jpg"                 |





### 9.3 Relações entre entidades

* Um Usuario pode cadastrar muitas Praias (1→N)
* Uma Praia tem um usuario (1→1)

![Relação das Entidades](imgs/relaçãoEntidades.png)

### 9.4 Modelagem no PostgreSQL
     CREATE TABLE usuarios (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    senha_hash VARCHAR(255) NOT NULL,
    foto_perfil TEXT,
    data_criacao TIMESTAMP NOT NULL,
    data_atualizacao TIMESTAMP NOT NULL
    );

    CREATE TABLE praias (
    id_praia SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cidade VARCHAR(255) NOT NULL,
    estado VARCHAR(255) NOT NULL,
    descricao TEXT,
    foto_url TEXT,
    );

   

  



     SELECT p.nome, p.media_avaliacao
    FROM praias p;

    SELECT u.nome AS nome_usuario, p.nome AS nome_praia, a.nota, a.comentario
    FROM avaliacoes a
    JOIN usuarios u ON a.id_usuario = u.id_usuario
    JOIN praias p ON a.id_praia = p.id_praia
     WHERE u.email = 'ana.paula@exemplo.com';

    SELECT p.nome
    FROM praias p
    JOIN praias_categorias pc ON p.id_praia = pc.id_praia
    JOIN categorias c ON pc.id_categoria = c.id_categoria
    WHERE c.nome = 'Surf';

     SELECT p.nome, COUNT(a.id_avaliacao) AS total_avaliacoes
     FROM praias p
    LEFT JOIN avaliacoes a ON p.id_praia = a.id_praia
    GROUP BY p.nome
    ORDER BY total_avaliacoes DESC;

    SELECT u.nome, p.nome AS praia_avaliada, a.nota
    FROM avaliacoes a
    JOIN usuarios u ON a.id_usuario = u.id_usuario
     JOIN praias p ON a.id_praia = p.id_praia
    WHERE a.nota = 5;


     -- DADOS DE EXEMPLO (POPULAÇÃO)



      -- 2. Inserir Praias
     INSERT INTO praias (nome, cidade, estado, descricao, foto_url) VALUES
    ('Praia do Rosa', 'Imbituba', 'SC', 'Famosa por suas ondas perfeitas para o surf e beleza natural intocada.', 'rosa.jpg'),
    ('Praia de Iracema', 'Fortaleza', 'CE', 'Praia urbana com vida noturna agitada e ótimos restaurantes na orla.', 'iracema.jpg'),
    ('Praia de Pipa', 'Tibau do Sul', 'RN', 'Conhecida por suas falésias impressionantes e pela presença de golfinhos.', 'pipa.jpg');

   
    



    -- FIM DA POPULAÇÃO


    ALTER TABLE praias
    ADD COLUMN id_usuario INT;

     ALTER TABLE praias
    ADD CONSTRAINT fk_usuario
    FOREIGN KEY (id_usuario)
    REFERENCES usuarios (id_usuario);


    ALTER TABLE praias
    ADD COLUMN data_criacao TIMESTAMP DEFAULT NOW(),

    ADD COLUMN data_atualizacao TIMESTAMP DEFAULT NOW();

   

    FOREIGN KEY (id_praia) REFERENCES praias (id_praia) ON DELETE CASCADE,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario) ON DELETE CASCADE
);





















