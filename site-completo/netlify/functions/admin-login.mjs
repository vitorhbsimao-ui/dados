import { loginCorreto, criarToken, json } from "../lib/auth.mjs";

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido" }, 405);
  let c;
  try { c = await req.json(); } catch { return json({ erro: "JSON inválido" }, 400); }
  if (!loginCorreto(c.usuario, c.senha)) return json({ erro: "Usuário ou senha incorretos." }, 401);
  return json({ token: criarToken() });
};

export const config = { path: "/api/admin-login" };
