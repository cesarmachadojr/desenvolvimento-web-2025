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