// Auditoria automatizada de RLS - 9 casos com 2 usuários
// Uso:
//   bun tests/rls/run-rls-audit.mjs
// Requer .env com VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.
// Cria 2 usuários descartáveis (email+password) via signUp.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    })
);

const URL = env.VITE_SUPABASE_URL;
const KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!URL || !KEY) throw new Error("Faltam VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY no .env");

const stamp = Date.now();
const mkEmail = (tag) => `rls-${tag}-${stamp}@inspect-auto.test`;
const PASS = "Teste!Rls#" + stamp;

const results = [];
const pass = (n, desc, extra = "") => {
  results.push({ n, status: "PASS", desc, extra });
  console.log(`✅ [${n}] ${desc} ${extra}`);
};
const fail = (n, desc, extra = "") => {
  results.push({ n, status: "FAIL", desc, extra });
  console.log(`❌ [${n}] ${desc} ${extra}`);
};

const newClient = () => createClient(URL, KEY, { auth: { persistSession: false } });

async function signUp(client, email) {
  const { data, error } = await client.auth.signUp({ email, password: PASS });
  if (error) throw new Error(`signUp ${email}: ${error.message}`);
  if (!data.session) {
    // Se confirm email estiver on, cai para signIn (deve falhar).
    const s = await client.auth.signInWithPassword({ email, password: PASS });
    if (s.error) throw new Error(`Sem sessão após signUp ${email} — confirmação de email provavelmente ativada.`);
  }
  return data.user.id;
}

const A = newClient();
const B = newClient();

console.log("→ Criando usuários de teste…");
const emailA = mkEmail("a");
const emailB = mkEmail("b");
const idA = await signUp(A, emailA);
const idB = await signUp(B, emailB);
console.log("  A:", emailA, idA);
console.log("  B:", emailB, idB);

// Aguarda trigger handle_new_user criar profile+role
await new Promise((r) => setTimeout(r, 1500));

// Cria uma conversa para A (usada em vários testes)
const { data: convA, error: errConvA } = await A.from("conversations")
  .insert({ user_id: idA, title: "Conversa A" })
  .select()
  .single();
if (errConvA) throw new Error("Setup: A não conseguiu criar própria conversa: " + errConvA.message);

// Insere uma mensagem de A na conversa de A
await A.from("messages").insert({
  conversation_id: convA.id,
  user_id: idA,
  role: "user",
  content: "olá",
});

// ---------------- CASOS ----------------

// 1. B lista conversations e NÃO vê a de A
{
  const { data } = await B.from("conversations").select("id").eq("id", convA.id);
  data && data.length === 0
    ? pass(1, "B não enxerga conversation de A via SELECT")
    : fail(1, "B enxerga conversation de A", JSON.stringify(data));
}

// 2. B tenta UPDATE na conversation de A
{
  const { data, error } = await B.from("conversations")
    .update({ title: "hack" })
    .eq("id", convA.id)
    .select();
  (!data || data.length === 0) && !error
    ? pass(2, "UPDATE de B em conversation de A é bloqueado (0 linhas)")
    : fail(2, "UPDATE indevido permitido", JSON.stringify({ data, error }));
}

// 3. B tenta DELETE na conversation de A
{
  const { data, error } = await B.from("conversations").delete().eq("id", convA.id).select();
  (!data || data.length === 0) && !error
    ? pass(3, "DELETE de B em conversation de A é bloqueado")
    : fail(3, "DELETE indevido permitido", JSON.stringify({ data, error }));
}

// 4. B tenta INSERT conversation com user_id de A (spoof)
{
  const { data, error } = await B.from("conversations")
    .insert({ user_id: idA, title: "spoof" })
    .select();
  error && !data
    ? pass(4, "INSERT spoof em conversations bloqueado", `(${error.code})`)
    : fail(4, "B conseguiu inserir conversation como A", JSON.stringify(data));
}

// 5. B tenta ler messages da conversa de A
{
  const { data } = await B.from("messages").select("id").eq("conversation_id", convA.id);
  data && data.length === 0
    ? pass(5, "B não lê messages da conversa de A")
    : fail(5, "B leu messages alheias", JSON.stringify(data));
}

// 6. B tenta INSERT message na conversa de A
{
  const { error } = await B.from("messages").insert({
    conversation_id: convA.id,
    user_id: idB,
    role: "user",
    content: "invasão",
  });
  error
    ? pass(6, "INSERT de B em messages de conversa alheia bloqueado", `(${error.code})`)
    : fail(6, "B inseriu message em conversa de A");
}

// 7. B tenta se auto-promover a admin via user_roles
{
  const { error } = await B.from("user_roles").insert({ user_id: idB, role: "admin" });
  error
    ? pass(7, "Auto-promoção a admin bloqueada", `(${error.code})`)
    : fail(7, "B conseguiu virar admin!");
}

// 8. B tenta ler admin_logs
{
  const { data, error } = await B.from("admin_logs").select("id").limit(1);
  (!data || data.length === 0) && !error
    ? pass(8, "admin_logs invisível para não-admin")
    : fail(8, "admin_logs vazado", JSON.stringify({ data, error }));
}

// 9. B não vê usage_logs nem subscriptions de A
{
  const { data: u } = await B.from("usage_logs").select("id").eq("user_id", idA);
  const { data: s } = await B.from("subscriptions").select("id").eq("user_id", idA);
  (!u || u.length === 0) && (!s || s.length === 0)
    ? pass(9, "usage_logs/subscriptions de A invisíveis para B")
    : fail(9, "Dados de billing/uso vazaram", JSON.stringify({ u, s }));
}

// Bônus: B tenta UPDATE do próprio profile trocando user_id (deve falhar por WITH CHECK)
{
  const { data, error } = await B.from("profiles")
    .update({ user_id: idA })
    .eq("user_id", idB)
    .select();
  (error || !data || data.length === 0)
    ? pass("B", "UPDATE em profiles trocando user_id bloqueado (WITH CHECK)")
    : fail("B", "profile.user_id foi trocado!", JSON.stringify(data));
}

// Limpeza (A remove sua própria conversa; cascata apaga messages)
await A.from("conversations").delete().eq("id", convA.id);

// Resumo
const okCount = results.filter((r) => r.status === "PASS").length;
console.log("\n=== RESUMO ===");
console.log(`${okCount}/${results.length} casos PASS`);
if (okCount !== results.length) {
  console.log("Falhas:", results.filter((r) => r.status === "FAIL"));
  process.exit(1);
}
