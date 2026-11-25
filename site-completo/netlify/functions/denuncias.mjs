import { randomBytes } from "node:crypto";
import { getDatabase } from "@netlify/database";
import { tokenValido, json } from "../lib/auth.mjs";

const VINCULOS = ["Aluno", "Pai, mãe ou responsável", "Funcionário", "Outra pessoa", "Não sei"];
const texto = (v, max) => String(v ?? "").trim().slice(0, max);
const linhas = (r) => (Array.isArray(r) ? r : r.rows);

export default async (req) => {
  const db = getDatabase();

  if (req.method === "POST") {
    let c;
    try { c = await req.json(); } catch { return json({ erro: "JSON inválido" }, 400); }

    const anonimo = c.anonima !== false; // na dúvida, trata como anônima
    // Se for anônima, nome e contato NUNCA são gravados. Nenhum IP é lido ou guardado.
    const nome = anonimo ? null : texto(c.nome, 120) || null;
    const contato = anonimo ? null : texto(c.contato, 160) || null;
    const data = texto(c.data, 10);
    const hora = texto(c.hora, 10);
    const local = texto(c.local, 200);
    const acusado = texto(c.acusado, 200);
    const vinculo = VINCULOS.includes(c.vinculo) ? c.vinculo : "Não sei";
    const descricao = texto(c.descricao, 3000);

    if (!/^\d{4}-\d{2}-\d{2}$/.test(data) || !hora || !local || !acusado || descricao.length < 20) {
      return json({ erro: "Preencha todos os campos obrigatórios." }, 400);
    }
    if (!anonimo && !nome) return json({ erro: "Informe o nome ou denuncie anonimamente." }, 400);

    const protocolo = "DEN-" + randomBytes(4).toString("hex").toUpperCase();
    await db.sql`
      INSERT INTO denuncias
        (protocolo, anonimo, nome, contato, data_fato, horario, local_fato, pessoa_denunciada, vinculo, descricao)
      VALUES
        (${protocolo}, ${anonimo}, ${nome}, ${contato}, ${data}, ${hora}, ${local}, ${acusado}, ${vinculo}, ${descricao})`;
    return json({ ok: true, protocolo }, 201);
  }

  if (!tokenValido(req)) return json({ erro: "Não autorizado" }, 401);

  if (req.method === "GET") {
    const r = await db.sql`
      SELECT protocolo, anonimo AS anonima, nome, contato,
             to_char(data_fato, 'YYYY-MM-DD') AS data,
             horario AS hora, local_fato AS "local", pessoa_denunciada AS acusado,
             vinculo, descricao, criado_em
      FROM denuncias ORDER BY criado_em DESC LIMIT 500`;
    return json(linhas(r));
  }

  if (req.method === "DELETE") {
    await db.sql`DELETE FROM denuncias`;
    return json({ ok: true });
  }

  return json({ erro: "Método não permitido" }, 405);
};

export const config = { path: "/api/denuncias" };
