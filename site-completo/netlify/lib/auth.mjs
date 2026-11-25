import { createHmac, timingSafeEqual } from "node:crypto";

const DURACAO_MS = 2 * 60 * 60 * 1000; // 2 horas

function assinar(texto) {
  return createHmac("sha256", process.env.ADMIN_SECRET).update(texto).digest("hex");
}

function iguais(a, b) {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
}

export function loginCorreto(usuario, senha) {
  if (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_SECRET) return false;
  const usuarioOk = iguais(usuario ?? "", process.env.ADMIN_USER || "admin");
  const senhaOk = iguais(senha ?? "", process.env.ADMIN_PASSWORD);
  return usuarioOk && senhaOk;
}

export function criarToken() {
  const expira = String(Date.now() + DURACAO_MS);
  return `${expira}.${assinar(expira)}`;
}

export function tokenValido(req) {
  if (!process.env.ADMIN_SECRET) return false;
  const cab = req.headers.get("authorization") || "";
  const token = cab.startsWith("Bearer ") ? cab.slice(7) : "";
  const [expira, assinatura] = token.split(".");
  if (!expira || !assinatura) return false;
  if (Number(expira) < Date.now()) return false;
  return iguais(assinatura, assinar(expira));
}

export function json(dados, status = 200) {
  return new Response(JSON.stringify(dados), {
    status,
    headers: { "content-type": "application/json" },
  });
}
