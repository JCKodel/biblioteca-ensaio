CREATE TABLE livro (
	id INTEGER PRIMARY KEY,
	titulo TEXT NOT NULL,
	autor TEXT NOT NULL,
	ano INTEGER
);
CREATE TABLE exemplar (
	id INTEGER PRIMARY KEY,
	livro_id INTEGER NOT NULL REFERENCES livro (id)
);
CREATE INDEX exemplar_livro_id ON exemplar (livro_id);
