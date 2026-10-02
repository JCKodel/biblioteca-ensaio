CREATE TABLE emprestimo (
	id INTEGER PRIMARY KEY,
	exemplar_id INTEGER NOT NULL REFERENCES exemplar (id),
	membro_id INTEGER NOT NULL REFERENCES membro (id),
	emprestado_em TEXT NOT NULL,
	devolver_em TEXT NOT NULL,
	devolvido_em TEXT
);
CREATE UNIQUE INDEX emprestimo_aberto_por_exemplar ON emprestimo (exemplar_id) WHERE devolvido_em IS NULL;
CREATE INDEX emprestimo_membro_id ON emprestimo (membro_id);
