# MVP Chat com IA — Plano técnico

## Ponto a confirmar antes de codar
Este workspace é o **Inspect Auto** (app de vistoria veicular). Preciso saber se o chat é:
- **(A)** Um **novo módulo dentro do Inspect Auto** (rota `/chat`, mesma auth, mesmo Supabase, mesmo sidebar), ou
- **(B)** Um **projeto novo, separado**, do zero.

O plano abaixo assume **(A)** — é o cenário compatível com o app atual (TanStack Start + Supabase já configurados, auth pronta, sidebar existente). Se for (B), a arquitetura é a mesma, muda só o boilerplate inicial.

Também assumo, pelo enunciado:
- Conversas **threaded** + persistência **em banco (Supabase)**.
- Provedor de IA = **Lovable AI Gateway** (`google/gemini-3-flash-preview` por padrão), sem pedir chave ao usuário.
- Idioma da UI: **PT-BR**.

---

## 1. Arquitetura

Stack já disponível no projeto:
- Frontend: React 19 + TypeScript + Tailwind v4 + shadcn/ui.
- Router/SSR: TanStack Start (rotas em `src/routes/`).
- Backend app-internal: `createServerFn` (RPC tipado).
- Streaming HTTP: **TanStack server route** em `src/routes/api/chat.ts` (padrão AI SDK — `Edge Function` do Supabase não é usada para lógica interna neste stack; o requisito "Edge Function" é atendido por um server route serverless com a mesma superfície de segurança).
- Auth: Supabase Auth (email/senha + Google já ativos).
- DB: Supabase Postgres + RLS.
- IA: Lovable AI Gateway via AI SDK (`ai`, `@ai-sdk/react`, `@ai-sdk/openai-compatible`).
- UI de chat: **AI Elements** (`conversation`, `message`, `prompt-input`, `shimmer`, `tool`).

Camadas:
```text
[Browser] ──useChat──► /api/chat (server route, streaming)
     │                    │
     │                    ├─ valida JWT (requireSupabaseAuth pattern)
     │                    ├─ valida conversation_id (RLS + checagem explícita)
     │                    ├─ valida plano/limite (usage_logs)
     │                    ├─ carrega últimas N mensagens
     │                    ├─ streamText(Lovable AI)
     │                    └─ onFinish → persiste msg assistente
     │
     └─ createServerFn: CRUD de conversas, rename, delete,
                        settings, admin (métricas, block/unblock)
```

---

## 2. Estrutura de pastas (novos arquivos)

```text
src/
  routes/
    chat.tsx                        # layout do chat (sidebar de threads + <Outlet/>)
    chat.index.tsx                  # redireciona para thread nova ou última
    chat.$threadId.tsx              # página da conversa
    admin.tsx                       # gate + layout admin
    admin.index.tsx                 # dashboard métricas
    admin.users.tsx                 # busca/lista/bloqueio
    admin.logs.tsx                  # admin_logs + app_errors
    configuracoes.tsx               # (já existe) + aba "Conta / Plano / Aparência"
    api/
      chat.ts                       # server route streaming
  components/
    chat/
      ChatSidebar.tsx               # lista de threads (desktop) / Drawer (mobile)
      ThreadItem.tsx                # renomear/excluir com confirmação
      ChatWindow.tsx                # AI Elements: Conversation/Message/PromptInput
      MessageBubble.tsx             # markdown seguro + code blocks + copiar/regenerar
      NewThreadButton.tsx
      PlanBadge.tsx
      UsageMeter.tsx
    admin/
      MetricsCards.tsx
      UsersTable.tsx
  lib/
    chat/
      chat.functions.ts             # createConversation, renameConversation,
                                    # deleteConversation, listConversations,
                                    # getConversationMessages, regenerateLastAssistant
      title.functions.ts            # generateThreadTitle (IA, curto)
    admin/
      admin.functions.ts            # requireAdmin + métricas + block/unblock
    plans.ts                        # FREE_LIMITS, isOverLimit, planFromProfile
    ai-gateway.server.ts            # provider Lovable AI (já pode existir)
    markdown.tsx                    # react-markdown + rehype-sanitize + shiki/prism
  hooks/
    useTheme.ts                     # dark/light (persistido)
```

---

## 3. Schema do banco (migration única, com GRANTs + RLS)

Tabelas novas (usuários ligados a `auth.users`; roles em tabela separada, conforme regra do projeto):

- **profiles** *(já existe)* — adicionar: `plan text not null default 'free' check (plan in ('free','premium'))`, `is_blocked boolean not null default false`, `blocked_reason text`.
- **user_roles** — `user_id`, `role app_role` (enum `admin | user`). Nunca colocar role no profile.
- **conversations** — `user_id`, `title text not null default 'Nova conversa'`, `last_message_at timestamptz`, `archived boolean default false`.
- **messages** — `conversation_id`, `user_id` (denormalizado para RLS barata), `role text check in ('user','assistant','system')`, `content text`, `parts jsonb` (UIMessage parts), `tokens_in int`, `tokens_out int`, `model text`, `error text`.
- **subscriptions** — `user_id`, `plan`, `status`, `current_period_end`, `provider`, `provider_ref`. Preparada para futuro (Stripe/Polar).
- **usage_logs** — `user_id`, `conversation_id`, `kind text` (`chat_message`, `regenerate`, `title`), `tokens_in`, `tokens_out`, `model`, `created_at`. Base para limite do plano free.
- **admin_logs** — `actor_id` (admin), `target_user_id`, `action` (`block_user`, `unblock_user`, `change_plan`, `view_conversation`), `metadata jsonb`.
- **app_errors** — `user_id null`, `scope text` (`chat_stream`, `edge`, `client`), `message text`, `stack text`, `context jsonb`.

Funções/triggers:
- `public.has_role(_uid uuid, _role app_role)` — SECURITY DEFINER, usada em RLS (evita recursão).
- `public.touch_conversation_last_message()` — trigger em `messages` que atualiza `conversations.last_message_at`.
- `public.update_updated_at_column()` — já existe.

RLS (resumo):
- `profiles`: dono lê/atualiza o próprio; admin lê todos via `has_role(auth.uid(),'admin')`.
- `conversations`: `user_id = auth.uid()` em SELECT/INSERT/UPDATE/DELETE; admin com SELECT extra via `has_role`.
- `messages`: `user_id = auth.uid()` em todas as ações; INSERT com `WITH CHECK (user_id = auth.uid() AND EXISTS(select 1 from conversations c where c.id = conversation_id and c.user_id = auth.uid()))`.
- `subscriptions`: dono SELECT; INSERT/UPDATE só `service_role`.
- `usage_logs`: dono SELECT; INSERT só via server (server usa `requireSupabaseAuth` = RLS como usuário → policy `WITH CHECK user_id = auth.uid()`).
- `admin_logs`: SELECT/INSERT só admin (`has_role`).
- `app_errors`: INSERT liberado para authenticated (com `user_id = auth.uid()` ou null via server); SELECT só admin.
- `user_roles`: SELECT só `authenticated` para a própria linha; INSERT/UPDATE/DELETE apenas `service_role`.

Todos os `CREATE TABLE` acompanham `GRANT SELECT,INSERT,UPDATE,DELETE ... TO authenticated` + `GRANT ALL ... TO service_role` na **mesma migration**.

---

## 4. Autenticação e rotas

Já existente no projeto: `_authenticated/route.tsx` (gate managed), `/login`, `/reset-password`, Google OAuth. Reaproveitar:
- `/chat/**` e `/admin/**` ficam **sob `_authenticated/`** (novo: `src/routes/_authenticated/chat.*`, `src/routes/_authenticated/admin.*`).
- `/admin` tem um `beforeLoad` client-side que chama uma `createServerFn` `requireAdmin()` (usa `context.supabase.rpc('has_role', {_user_id: userId, _role: 'admin'})`). Redireciona para `/` se não for admin.
- Sign-in redireciona para `/chat` (nova home logada) — landing pública em `/` permanece.

---

## 5. Fluxo do chat (com streaming e limite de plano)

1. Usuário abre `/chat` → server function `listConversations` (RLS como user) devolve threads.
2. `/chat/$threadId` monta `<ChatWindow id={threadId}>` com `useChat({ id, messages, transport: DefaultChatTransport({ api: '/api/chat' }) })`.
3. Ao enviar (`Enter` envia, `Shift+Enter` quebra linha, botão desabilita enquanto `status === 'submitted' | 'streaming'`, bloqueia string vazia):
   a. Cliente faz POST para `/api/chat` com `{ messages, conversationId }`.
   b. Server route:
      - Valida bearer JWT → `userId`.
      - Carrega `profiles` do user; bloqueia se `is_blocked`.
      - Verifica ownership da `conversationId`.
      - Verifica limite: `count(usage_logs where user_id=? and kind='chat_message' and created_at >= date_trunc('day', now()))` vs `FREE_LIMITS.messagesPerDay` (ex.: 30). Se estourou e plano = free → 402 com mensagem clara.
      - Persiste **mensagem do usuário** imediatamente (para não perder em falha de stream).
      - `streamText(gateway('google/gemini-3-flash-preview'), { messages: convertToModelMessages(...) })`.
      - `toUIMessageStreamResponse({ originalMessages, onFinish: async ({ messages }) => { salvar assistant message + usage_logs + touch conversation } })`.
      - Falhas → `app_errors` + resposta 500 com mensagem amigável (não quebra a conversa).
4. Após 1ª troca da thread, `generateThreadTitle` (server fn, chamada em background) resume as 2 primeiras mensagens em ≤6 palavras e faz `UPDATE conversations.title`.
5. **Regenerar**: server fn `regenerateLastAssistant(conversationId)` remove última assistant, re-stream a partir do histórico até a última user.
6. **Copiar**: puramente client (`navigator.clipboard`).
7. **Markdown seguro**: `react-markdown` + `rehype-sanitize` (whitelist), code blocks com `rehype-highlight` (ou shiki). Nunca `dangerouslySetInnerHTML` cru.

---

## 6. Server functions / routes necessários

Server route (streaming):
- `POST /api/chat` — chat com IA (acima).

`createServerFn` (todos com `.middleware([requireSupabaseAuth])`):
- `listConversations`
- `createConversation`
- `renameConversation({ id, title })`
- `deleteConversation({ id })`
- `getConversationMessages({ id })`
- `regenerateLastAssistant({ conversationId })`
- `generateThreadTitle({ conversationId })`
- `getMyUsage()` — retorna consumo do dia + limite
- `updateProfileSettings({ nome, tema })`
- Admin (todos passam por `requireAdmin`):
  - `adminMetrics()` — DAU, msgs/dia, erros/dia, top usuários
  - `adminSearchUsers({ q })`
  - `adminSetBlocked({ userId, blocked, reason })`
  - `adminListLogs({ kind, limit })`
  - `adminChangePlan({ userId, plan })`

---

## 7. UI/UX

- **Sidebar chat** (desktop) integrada ao `AppSidebar` existente; no mobile, `Sheet`/Drawer com o mesmo componente.
- **AI Elements** obrigatórios: `Conversation`, `Message`, `MessageResponse`, `PromptInput` (+ `PromptInputTextarea`, `PromptInputFooter`, `PromptInputSubmit`), `Shimmer` para "Pensando…".
- Assistente sem bubble colorido; usuário com `bg-primary text-primary-foreground`.
- Ações destrutivas (excluir conversa, bloquear usuário) via `AlertDialog`.
- Estados: loading (skeleton lista de threads), empty (thread nova com sugestões), error (toast + retry), disabled (composer bloqueado se sem plano).
- Dark/light: token-based (já existe base Tailwind v4); toggle em `configuracoes.tsx` persistido em `profiles.tema` + `localStorage`.
- Acessibilidade: focus ring, `aria-label` em botões-ícone, textarea sempre focado após enviar/trocar thread.

---

## 8. Segurança — checklist obrigatório

- RLS em todas as tabelas novas + GRANTs no mesmo migration.
- Nenhum uso de `service_role` no frontend; server route usa **client autenticado como o usuário** (RLS aplica); `supabaseAdmin` só para `adminSetBlocked` (após `requireAdmin`).
- JWT validado no server route via `supabase.auth.getUser()` com bearer do request.
- Ownership de `conversationId` checada **explicitamente** além da RLS.
- Zod valida body do `/api/chat` e inputs dos server fns.
- Sanitização de markdown (`rehype-sanitize`).
- `LOVABLE_API_KEY` só no server (`process.env`), nunca `VITE_*`.
- Erros gravam `app_errors` sem PII bruta.
- Ações de admin gravam `admin_logs` com `actor_id`/`target_user_id`/`action`.

---

## 9. Ordem de entrega (etapas — cada uma isolada, revisável)

1. **Migration + RLS + GRANTs + `has_role` + triggers** (uma migration, aprovação sua).
2. **Auth wiring** — mover home logada para `/chat`, criar layout `_authenticated/chat.*` e `_authenticated/admin.*`, `requireAdmin`.
3. **Chat persistente (sem IA ainda)** — CRUD de threads/mensagens, sidebar, roteamento por `$threadId`, AI Elements, envio dummy salvando no banco.
4. **Server route `/api/chat` com streaming** — Lovable AI + `onFinish` persistindo + `usage_logs` + limite free + `app_errors`.
5. **Título automático + regenerar + copiar + markdown seguro + dark/light + configurações**.
6. **Admin** — métricas, busca, bloqueio, logs, mudança de plano.
7. **Revisão final de segurança** — rodar `supabase--linter`, `security--get_scan_results`, testar como user A tentando acessar conversa do user B, testar limite free, testar rota admin como não-admin.

Cada etapa entrega código funcional e testável; nada é feito de uma vez.

---

## 10. Critérios de aceite

- Usuário faz signup, confirma sessão, cai em `/chat` com sidebar vazia + botão "Nova conversa".
- Envia mensagem → aparece imediatamente; resposta da IA chega em streaming; ambas persistem após F5.
- Renomear/excluir thread funciona com confirmação; navegação por URL (`/chat/<uuid>`) restaura a thread certa.
- User A **não consegue** ler thread do User B via UI nem via chamada direta ao `/api/chat` (retorna 403).
- Após atingir o limite diário do plano free, envio é bloqueado com mensagem clara; premium ignora o limite.
- Admin (`role=admin`) vê `/admin` com métricas reais; não-admin é redirecionado.
- Bloquear um usuário impede envio de novas mensagens e registra em `admin_logs`.
- Dark/light alterna sem flash e persiste.
- `supabase--linter` sem findings críticos; scan de segurança limpo.

---

**Confirme dois pontos e eu começo pela Etapa 1 (migration):**
1. Módulo dentro do Inspect Auto (A) ou projeto novo (B)?
2. Limite do plano free: **30 mensagens/dia** por usuário está OK? (se preferir por mês/tokens, me diga o número)
