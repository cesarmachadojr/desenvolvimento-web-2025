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
    media_avaliacao NUMERIC(3, 2) DEFAULT 0.00
);

CREATE TABLE categorias (
    id_categoria SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL UNIQUE
);

CREATE TABLE avaliacoes (
    id_avaliacao SERIAL PRIMARY KEY,
    nota INT NOT NULL CHECK (nota >= 1 AND nota <= 5),
    comentario TEXT,
    data_avaliacao TIMESTAMP NOT NULL DEFAULT NOW(),
    id_usuario INT NOT NULL,
    id_praia INT NOT NULL,
    FOREIGN KEY (id_usuario) REFERENCES usuarios (id_usuario),
    FOREIGN KEY (id_praia) REFERENCES praias (id_praia)
);

CREATE TABLE praias_categorias (
    id_praia INT NOT NULL,
    id_categoria INT NOT NULL,
    PRIMARY KEY (id_praia, id_categoria),
    FOREIGN KEY (id_praia) REFERENCES praias (id_praia),
    FOREIGN KEY (id_categoria) REFERENCES categorias (id_categoria)
); 

INSERT INTO usuarios (nome, email, senha_hash) VALUES
('Ana Paula', 'ana.paula@exemplo.com', 'hash_ana123'),
('Bruno Fernandes', 'bruno.f@exemplo.com', 'hash_bruno456'),
('Carla Souza', 'carla.s@exemplo.com', 'hash_carla789');

INSERT INTO praias (nome, cidade, estado, descricao) VALUES
('Praia do Rosa', 'Imbituba', 'SC', 'Famosa por suas ondas e vida marinha.'),
('Praia de Iracema', 'Fortaleza', 'CE', 'Conhecida por sua vida noturna e estatua de Iracema.'),
('Praia de Pipa', 'Tibau do Sul', 'RN', 'Um paraíso de falésias, golfinhos e águas claras.');

INSERT INTO categorias (nome) VALUES
('Surf'),
('Família'),
('Vida Noturna'),
('Beleza Natural');

INSERT INTO avaliacoes (nota, comentario, id_usuario, id_praia) VALUES
(5, 'Ondas perfeitas e visual de tirar o fôlego!', 1, 1), -- Ana avalia Praia do Rosa
(4, 'Ótimo lugar para caminhar no fim da tarde.', 2, 2), -- Bruno avalia Praia de Iracema
(5, 'Nunca vi tantos golfinhos, uma experiência mágica.', 3, 3), -- Carla avalia Praia de Pipa
(3, 'A praia é bonita, mas achei a infraestrutura fraca.', 2, 1); -- Bruno avalia Praia do Rosa

INSERT INTO praias_categorias (id_praia, id_categoria) VALUES
(1, 1), -- Praia do Rosa é para Surf
(1, 4), -- Praia do Rosa tem Beleza Natural
(2, 2), -- Praia de Iracema é para Família
(2, 3), -- Praia de Iracema tem Vida Noturna
(3, 4); -- Praia de Pipa tem Beleza Natural

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

-- 1. Inserir Usuários (senha_hash é um placeholder para esta fase)
INSERT INTO usuarios (nome, email, senha_hash, foto_perfil, data_criacao, data_atualizacao) VALUES
('Ana Paula', 'ana.paula@exemplo.com', 'hash_ana_123', NULL, NOW(), NOW()),
('Bruno Silva', 'bruno.silva@exemplo.com', 'hash_bruno_456', NULL, NOW(), NOW()),
('Carla Souza', 'carla.souza@exemplo.com', 'hash_carla_789', NULL, NOW(), NOW());

-- 2. Inserir Praias
INSERT INTO praias (nome, cidade, estado, descricao, foto_url, media_avaliacao) VALUES
('Praia do Rosa', 'Imbituba', 'SC', 'Famosa por suas ondas perfeitas para o surf e beleza natural intocada.', 'rosa.jpg', 0.00),
('Praia de Iracema', 'Fortaleza', 'CE', 'Praia urbana com vida noturna agitada e ótimos restaurantes na orla.', 'iracema.jpg', 0.00),
('Praia de Pipa', 'Tibau do Sul', 'RN', 'Conhecida por suas falésias impressionantes e pela presença de golfinhos.', 'pipa.jpg', 0.00);

-- 3. Inserir Categorias
INSERT INTO categorias (nome) VALUES
('Surf'),
('Família'),
('Vida Noturna'),
('Beleza Natural');

-- 4. Inserir Avaliações (Foreign Keys referenciam Usuários e Praias acima)
-- Ana (id 1) avalia Rosa (id 1)
-- Bruno (id 2) avalia Iracema (id 2)
-- Carla (id 3) avalia Pipa (id 3)
-- Bruno (id 2) avalia Rosa (id 1)
INSERT INTO avaliacoes (nota, comentario, id_usuario, id_praia) VALUES
(5, 'Ondas perfeitas e visual de tirar o fôlego!', 1, 1),
(4, 'Ótimo lugar para caminhar no fim da tarde.', 2, 2),
(5, 'Nunca vi tantos golfinhos, uma experiência mágica.', 3, 3),
(3, 'A praia é bonita, mas achei a infraestrutura fraca.', 2, 1);

-- 5. Ligar Praias a Categorias (Praias_Categorias)
INSERT INTO praias_categorias (id_praia, id_categoria) VALUES
(1, 1), -- Praia do Rosa é para Surf
(1, 4), -- Praia do Rosa tem Beleza Natural
(2, 2), -- Praia de Iracema é para Família
(2, 3), -- Praia de Iracema tem Vida Noturna
(3, 4); -- Praia de Pipa tem Beleza Natural

-- 6. ATUALIZAR MÉDIA DE AVALIAÇÃO (IMPORTANTE)
-- Nota: Esta parte deve ser feita pelo seu Controller (criarAvaliacao), mas é bom rodar manualmente para os dados iniciais.
UPDATE praias p SET media_avaliacao = (
    SELECT AVG(a.nota) FROM avaliacoes a WHERE a.id_praia = p.id_praia
);

-- FIM DA POPULAÇÃO


INSERT INTO usuarios (nome, email, senha_hash, foto_perfil, data_criacao, data_atualizacao)
VALUES (
    'Teste Login', 
    'teste@exemplo.com', 
    '123456',  -- senha em texto simples para teste
    NULL, 
    NOW(), 
    NOW()
);


ALTER TABLE praias
ADD COLUMN id_usuario INT;

ALTER TABLE praias
ADD CONSTRAINT fk_usuario
FOREIGN KEY (id_usuario)
REFERENCES usuarios (id_usuario);


cesar@email.com
123456

enilda@email.com
123


ALTER TABLE praias
ADD COLUMN data_criacao TIMESTAMP DEFAULT NOW(),
ADD COLUMN data_atualizacao TIMESTAMP DEFAULT NOW();