# MOC +1 Bar Controle

**Controle operacional de contagem — +1 Bar**

Sistema de contagem de estoque e insumos desenvolvido para o restaurante +1 Bar.
Base inicial do módulo operacional de contagem (MOC).

---

## Escopo atual

Esta é a **base inicial** do projeto. Contém:

- Estrutura de rotas e navegação
- Layout mobile-first com header e bottom navigation
- Tela de login (autenticação mockada)
- Dashboard operacional com cards de status
- Placeholder do módulo de contagem
- Painel administrativo com tipos de item
- Mock data organizado para desenvolvimento local
- Tipos centrais (`ItemType`, `AreaStatus`, `CountStatus`, `UserRole`)
- Documentação de plano e schema futuro

**Não contém ainda:** formulário real de contagem, banco de dados, autenticação Supabase,
histórico de sessões, cadastro de itens ou integração com qualquer API externa.

---

## Como rodar localmente

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em desenvolvimento
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

O app redireciona automaticamente para `/login`.

### Login mockado

| Campo | Valor |
|-------|-------|
| E-mail | `demo@maisumbar.com` |
| Senha | `demo` |

> Este login é uma simulação local. Será substituído por Supabase Auth na próxima fase.

---

## Rotas disponíveis

| Rota | Descrição |
|------|-----------|
| `/login` | Tela de acesso |
| `/dashboard` | Home operacional com cards de status |
| `/dashboard/counts` | Módulo de contagem (placeholder) |
| `/dashboard/admin` | Painel de configurações (placeholder) |

---

## Estrutura do projeto

```
app/
  login/              → Tela de login
  dashboard/
    layout.tsx        → Header + bottom navigation + guarda de rota
    page.tsx          → Dashboard com cards operacionais
    counts/           → Módulo de contagem
    admin/            → Painel administrativo

components/ui/
  StatusBadge.tsx     → Badge de status (Pendente / Em andamento / Concluída)
  ProgressBar.tsx     → Barra de progresso

lib/
  types.ts            → Tipos e enums centrais do domínio

mocks/
  maisUmBar.ts        → Dados mock para desenvolvimento local

docs/
  plano-moc-mais-um-bar.md          → Plano de fases e decisões arquiteturais
  schema-futuro-moc-mais-um-bar.md  → Schema conceitual do banco de dados
```

---

## Tipos de item (`ItemType`)

| Tipo | Label | Descrição |
|------|-------|-----------|
| `raw_material` | Insumo Bruto | Produto como chegou do fornecedor |
| `prepared_portioned` | Preparados / Porcionados | Após manipulação interna (iscas, blends, cortes) |
| `finished_product` | Produto Pronto | Pronto para venda ou uso imediato |
| `beverage` | Bebida | Alcoólicas, não alcoólicas, sucos |
| `packaging` | Descartáveis | Embalagens, copos, caixas |
| `cleaning_operational` | Limpeza / Operacional | Produtos de limpeza e higiene |

---

## Próximos passos

1. **Supabase dedicado** — Criar projeto Supabase exclusivo para o +1 Bar (separado de qualquer outro projeto)
2. **Autenticação real** — Substituir login mock por `supabase.auth.signInWithPassword`
3. **Schema inicial** — Criar tabelas conforme `docs/schema-futuro-moc-mais-um-bar.md`
4. **Cadastro de áreas** — CRUD das 6 áreas da loja
5. **Cadastro de itens** — Import CSV ou cadastro manual com `item_type`
6. **Fluxo de contagem** — Sessão por área, entrada de quantidade, finalização

---

## Variáveis de ambiente

Nenhuma variável necessária nesta fase (dados são mock).

Para a próxima fase, criar `.env.local` com:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<projeto-mais-um-bar>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<chave-anon-do-projeto-mais-um-bar>
```

> ⚠️ Nunca usar credenciais de outros projetos. Criar um projeto Supabase dedicado.

---

## Stack

- **Next.js 16** — App Router
- **TypeScript**
- **Tailwind CSS v4**
- **Lucide React** — ícones
- **React Hot Toast** — notificações
