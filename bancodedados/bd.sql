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