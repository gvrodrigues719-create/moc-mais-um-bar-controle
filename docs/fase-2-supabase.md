# Fase 2 — Supabase: Estrutura de Banco e Autenticação

**Status:** Estrutura criada localmente — aguardando projeto Supabase dedicado  
**Data:** 2026-05-23

---

## Objetivo

Criar a base de dados e autenticação real para o MOC +1 Bar Controle.  
Esta fase não cadastra itens reais — apenas prepara a infraestrutura.

---

## O que foi implementado nesta fase

### Autenticação
- `lib/supabase/client.ts` — Cliente browser (`@supabase/ssr`)
- `lib/supabase/server.ts` — Cliente server-side (Server Components, Server Actions)
- `lib/supabase/middleware.ts` — Refresh de sessão e helper de redirecionamento
- `middleware.ts` — Middleware Next.js: protege rotas `/dashboard/*`, redireciona para `/login`
- `app/actions/auth.ts` — Server Actions: `logoutAction`, `getSessionAction`
- `app/login/page.tsx` — Login real com `supabase.auth.signInWithPassword` (com fallback local)
- `app/dashboard/layout.tsx` — Verificação de sessão real; logout com `signOut`

### Banco de dados
- `supabase/migrations/202605230001_initial_moc_mais_um_bar.sql` — Migration completa
- `supabase/seed.sql` — Seed com loja e 6 áreas (sem itens reais)

### Frontend
- `hooks/useStoreData.ts` — Hook que busca profile, store, áreas e sessões do Supabase
- Dashboard, counts e admin atualizados para usar dados reais quando disponíveis
- Estados vazios e de erro tratados em todas as páginas

---

## Tabelas criadas

| Tabela | Descrição |
|--------|-----------|
| `stores` | Loja registrada (+1 Bar) |
| `profiles` | Perfis operacionais vinculados ao `auth.users` |
| `count_areas` | Áreas físicas da loja |
| `count_items` | Itens de contagem (**nasce vazio**) |
| `count_sessions` | Sessões de contagem |
| `count_session_items` | Itens lançados por sessão |
| `operational_events` | Log de auditoria de eventos |

---

## O que ainda não foi implementado

- Formulário de cadastro de itens (Fase 3)
- Importação CSV de itens (Fase 3)
- Fluxo completo de contagem item a item (Fase 3)
- Histórico detalhado de sessões (Fase 3)
- Relatórios e exportações (Fase futura)
- Multi-loja (Fase futura)

---

## Como criar o projeto Supabase dedicado

> ⚠️ Criar um projeto NOVO e separado. Nunca reutilizar o Supabase de outro projeto.

1. Acesse [supabase.com](https://supabase.com) e faça login
2. Clique em **New Project**
3. Preencha:
   - **Name:** `moc-mais-um-bar`
   - **Database Password:** senha forte (guardar em local seguro)
   - **Region:** South America (São Paulo) — `sa-east-1`
4. Aguarde a criação (~2 min)
5. Acesse **Project Settings → API**
6. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

---

## Como aplicar a migration manualmente

No painel do Supabase:

1. Acesse **SQL Editor**
2. Clique em **New query**
3. Cole o conteúdo de `supabase/migrations/202605230001_initial_moc_mais_um_bar.sql`
4. Clique em **Run**

Verificar se todas as tabelas apareceram em **Table Editor**.

---

## Como rodar o seed

Após aplicar a migration:

1. No **SQL Editor**, abra nova query
2. Cole o conteúdo de `supabase/seed.sql`
3. Clique em **Run**

Verificar em **Table Editor → stores** se a loja `+1 Bar` foi criada.  
Verificar em **Table Editor → count_areas** se as 6 áreas foram criadas.

---

## Como criar o primeiro usuário admin

1. No painel do Supabase, vá em **Authentication → Users**
2. Clique em **Add user → Create new user**
3. Preencha email e senha
4. Após criar, copie o `User UID`
5. No **SQL Editor**, execute:

```sql
INSERT INTO profiles (id, store_id, name, email, role)
VALUES (
    '<USER_UID>',
    '00000000-0000-0000-0000-000000000001',
    'Seu Nome',
    'seu@email.com',
    'admin'
);
```

Substitua `<USER_UID>` pelo UUID do usuário criado.

---

## Variáveis de ambiente a configurar

Criar `.env.local` na raiz do projeto (nunca commitar):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<seu-projeto>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
NEXT_PUBLIC_APP_NAME="MOC +1 Bar Controle"
NEXT_PUBLIC_STORE_NAME="+1 Bar"
```

---

## Comportamento sem Supabase configurado

Quando as variáveis de ambiente não estão configuradas:

- Login aceita qualquer credencial (modo local de desenvolvimento)
- Dashboard exibe banner amarelo "Supabase não configurado"
- Dados de demonstração do mock são exibidos
- Rotas não são protegidas pelo middleware

---

## Próximos passos — Fase 3

1. Criar tela de cadastro de itens no admin
2. Implementar importação via CSV (PapaParse)
3. Vincular itens às áreas corretas
4. Implementar formulário de entrada de quantidades
5. Criar lógica de sessão: iniciar, contar por área, finalizar
6. Salvar `count_session_items` no banco em tempo real

---

## Aviso de segurança

> ⚠️ **NUNCA usar o Supabase do NaBrasa Controle ou de qualquer outro projeto.**  
> Este sistema exige um projeto Supabase próprio do +1 Bar.  
> As credenciais de projetos diferentes NUNCA devem ser misturadas.  
> O arquivo `.env.local` está no `.gitignore` e NUNCA deve ser commitado.
