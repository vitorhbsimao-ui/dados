CREATE TABLE denuncias (
  id SERIAL PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  anonimo BOOLEAN NOT NULL,
  nome TEXT,
  data_fato DATE NOT NULL,
  horario TEXT NOT NULL,
  local_fato TEXT NOT NULL,
  pessoa_denunciada TEXT NOT NULL,
  descricao TEXT
);

CREATE TABLE pesquisas (
  id SERIAL PRIMARY KEY,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  respostas JSONB NOT NULL
);
