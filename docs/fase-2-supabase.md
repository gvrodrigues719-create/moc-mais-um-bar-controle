# Fase 2 — Supabase: Estrutura de Banco e Autenticação

**Status:** Estrutura conectada ao projeto Supabase dedicado `maisumbar_controle`  
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
- `lib/supabase/proxy.ts` — Refresh de sessão e helper de redirecionamento
- `proxy.ts` — Proxy Next.js 16: protege rotas `/dashboard/*`, redireciona para `/login`
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

## Projeto Supabase dedicado

**Projeto:** `maisumbar_controle`  
**Project Ref:** `ehuodergymmzikxvzmbw`  
**URL:** `https://ehuodergymmzikxvzmbw.supabase.co`  
**Region:** South America (São Paulo)

> ⚠️ Este projeto Supabase é exclusivo do +1 Bar. Nunca reutilizar credenciais de outro projeto.

---

## Como aplicar o schema e o seed

Os arquivos em `supabase/sql-editor/` são formatados para execução manual no painel do Supabase.  
Execute-os **em ordem**, cada um numa query separada:

### 1. Schema completo

1. Acesse **SQL Editor → New query**
2. Cole o conteúdo de `supabase/sql-editor/01_initial_schema.sql`
3. Clique em **Run**
4. Verifique que todas as tabelas aparecem em **Table Editor**

### 2. Seed (loja e áreas)

1. No **SQL Editor**, abra nova query
2. Cole o conteúdo de `supabase/sql-editor/02_seed_basic_store_and_areas.sql`
3. Clique em **Run**
4. O script exibe os registros criados ao final

Verificar em **Table Editor → stores**: loja `+1 Bar` com `slug = 'mais-um-bar'`.  
Verificar em **Table Editor → count_areas**: 6 áreas (Bar, Cozinha, Estoque Seco, Bebidas, Freezer/Câmara, Descartáveis).

### 3. Primeiro usuário admin

1. Vá em **Authentication → Users → Add user → Create new user**
2. Preencha email e senha; clique em **Create user**
3. Copie o `UID` da coluna da tabela
4. Abra `supabase/sql-editor/03_create_first_admin_profile_template.sql`
5. Substitua os 3 placeholders:
   - `COLE_AQUI_AUTH_USER_ID` → UID copiado
   - `COLE_AQUI_NOME` → nome do administrador
   - `COLE_AQUI_EMAIL` → e-mail do administrador
6. Cole no **SQL Editor** e clique em **Run**

> ⚠️ Não salvar o arquivo com dados reais. Preencher apenas na hora de executar.

---

## Variáveis de ambiente a configurar

Criar `.env.local` na raiz do projeto a partir do `.env.example` (nunca commitar):

```bash
NEXT_PUBLIC_SUPABASE_URL=https://ehuodergymmzikxvzmbw.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anon-do-projeto>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key-nunca-expor>
NEXT_PUBLIC_APP_NAME="MOC +1 Bar Controle"
NEXT_PUBLIC_STORE_NAME="+1 Bar"
```

- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — chave publicável (`sb_publishable_*`), segura para o client
- `SUPABASE_SERVICE_ROLE_KEY` — chave secreta (`sb_secret_*`), **somente server-side, nunca no client**

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
