import { getDatabase } from "@netlify/database";
import { tokenValido, json } from "../lib/auth.mjs";

const texto = (v, max) => String(v ?? "").trim().slice(0, max);
const linhas = (r) => (Array.isArray(r) ? r : r.rows);

export default async (req) => {
  const db = getDatabase();

  if (req.method === "POST") {
    let c;
    try { c = await req.json(); } catch { return json({ erro: "JSON inválido" }, 400); }

    const perfil = ["Aluno", "Funcionário"].includes(c.perfil) ? c.perfil : "";
    const presenciou = ["Sim", "Não"].includes(c.presenciou) ? c.presenciou : "";
    const solucao = texto(c.solucao, 2000);
    if (!perfil || !presenciou || solucao.length < 10) {
      return json({ erro: "Preencha todas as perguntas." }, 400);
    }

    const respostas = JSON.stringify({ perfil, presenciou, solucao });
    await db.sql`INSERT INTO pesquisas (respostas) VALUES (${respostas}::jsonb)`;
    return json({ ok: true }, 201);
  }

  if (!tokenValido(req)) return json({ erro: "Não autorizado" }, 401);

  if (req.method === "GET") {
    const r = await db.sql`SELECT respostas, criado_em FROM pesquisas ORDER BY criado_em DESC LIMIT 1000`;
    return json(linhas(r));
  }

  if (req.method === "DELETE") {
    await db.sql`DELETE FROM pesquisas`;
    return json({ ok: true });
  }

  return json({ erro: "Método não permitido" }, 405);
};

export const config = { path: "/api/pesquisa" };
