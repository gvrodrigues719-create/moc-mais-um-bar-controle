# Schema Futuro — MOC +1 Bar Controle

**Status:** Conceitual — não implementado  
**Banco:** Supabase PostgreSQL (projeto dedicado, separado do NaBrasa)  
**Data:** 2026-05-23

---

## Visão geral

O schema é propositalmente enxuto para o escopo inicial.
Expansões (compras, CMV, checklists) serão adicionadas em migrations futuras.

---

## Tabelas

### `stores`
Loja registrada no sistema. Preparado para multi-loja futura.

```sql
CREATE TABLE stores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,            -- "+1 Bar"
  slug        text UNIQUE NOT NULL,     -- "mais-um-bar"
  timezone    text DEFAULT 'America/Sao_Paulo',
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
```

---

### `profiles`
Perfil operacional dos usuários (vinculado ao auth.users do Supabase).

```sql
CREATE TABLE profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  store_id    uuid REFERENCES stores(id),
  name        text NOT NULL,
  role        text NOT NULL CHECK (role IN ('operator', 'manager', 'admin')),
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);
```

**Roles:**
- `operator` — Executa contagem, visualiza dashboard
- `manager` — Visualiza histórico, aprova sessões, gerencia operadores
- `admin` — Acesso total, configurações

---

### `count_areas`
Áreas físicas da loja onde os itens são contados.

```sql
CREATE TABLE count_areas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid NOT NULL REFERENCES stores(id),
  name        text NOT NULL,            -- "Bar", "Cozinha", "Freezer / Câmara"
  icon        text,                     -- emoji ou código de ícone
  sort_order  integer DEFAULT 0,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);
```

**Áreas iniciais do +1 Bar:**
| name | icon |
|------|------|
| Bar | 🍹 |
| Cozinha | 🍳 |
| Estoque Seco | 📦 |
| Bebidas | 🥤 |
| Freezer / Câmara | 🧊 |
| Descartáveis | 🥡 |

---

### `count_items`
Itens que entram na contagem.

```sql
CREATE TABLE count_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id),
  area_id         uuid REFERENCES count_areas(id),
  name            text NOT NULL,
  item_type       text NOT NULL CHECK (item_type IN (
                    'raw_material',
                    'prepared_portioned',
                    'finished_product',
                    'beverage',
                    'packaging',
                    'cleaning_operational'
                  )),
  unit            text NOT NULL,        -- "kg", "un", "litro", "maço"
  unit_obs        text,                 -- observação sobre a unidade
  sort_order      integer DEFAULT 0,
  active          boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);
```

**Regra importante:**  
`item_type` descreve a natureza do produto, NÃO a área física.  
Exemplo: Iscas de Filé Mignon → `item_type = 'prepared_portioned'`, `area_id = area-freezer`

---

### `count_sessions`
Sessão de contagem geral (cobre todas as áreas da loja em um ciclo).

```sql
CREATE TABLE count_sessions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id        uuid NOT NULL REFERENCES stores(id),
  status          text NOT NULL DEFAULT 'in_progress'
                    CHECK (status IN ('in_progress', 'completed', 'cancelled')),
  started_by      uuid REFERENCES profiles(id),
  started_at      timestamptz DEFAULT now(),
  completed_at    timestamptz,
  notes           text,
  created_at      timestamptz DEFAULT now()
);
```

---

### `count_session_areas`
Estado de cada área dentro de uma sessão de contagem.

```sql
CREATE TABLE count_session_areas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES count_sessions(id) ON DELETE CASCADE,
  area_id         uuid NOT NULL REFERENCES count_areas(id),
  status          text NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'in_progress', 'completed')),
  counted_by      uuid REFERENCES profiles(id),
  started_at      timestamptz,
  completed_at    timestamptz,
  UNIQUE (session_id, area_id)
);
```

---

### `count_session_items`
Lançamentos de quantidade por item em uma sessão.

```sql
CREATE TABLE count_session_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id      uuid NOT NULL REFERENCES count_sessions(id) ON DELETE CASCADE,
  area_session_id uuid REFERENCES count_session_areas(id),
  item_id         uuid NOT NULL REFERENCES count_items(id),
  quantity        numeric,              -- null = não contado ainda
  is_zeroed       boolean DEFAULT false, -- true = confirmado como zero
  observation     text,
  counted_by      uuid REFERENCES profiles(id),
  counted_at      timestamptz,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (session_id, item_id)
);
```

---

### `operational_events`
Log de eventos operacionais para auditoria e rastreabilidade.

```sql
CREATE TABLE operational_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id    uuid REFERENCES stores(id),
  event_type  text NOT NULL,    -- 'session_started', 'session_completed', 'item_counted', etc.
  user_id     uuid REFERENCES profiles(id),
  entity_type text,             -- 'session', 'item', 'area'
  entity_id   uuid,
  metadata    jsonb,
  created_at  timestamptz DEFAULT now()
);
```

---

## Diagrama de relacionamentos (simplificado)

```
stores
  └── count_areas (store_id)
  └── count_items (store_id, area_id → count_areas)
  └── count_sessions (store_id, started_by → profiles)
        └── count_session_areas (session_id, area_id, counted_by → profiles)
        └── count_session_items (session_id, area_session_id, item_id, counted_by → profiles)
profiles (vinculado a auth.users)
```

---

## RLS (Row Level Security)

Habilitar RLS em todas as tabelas após criação:

```sql
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_session_areas ENABLE ROW LEVEL SECURITY;
ALTER TABLE count_session_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE operational_events ENABLE ROW LEVEL SECURITY;
```

**Política básica sugerida (ajustar conforme necessidade):**
```sql
-- Exemplo: operadores só veem dados da sua loja
CREATE POLICY "store_isolation" ON count_items
  FOR ALL USING (
    store_id = (SELECT store_id FROM profiles WHERE id = auth.uid())
  );
```

---

## Notas de implementação

1. **Não usar** as migrations do NaBrasa Controle — o schema é diferente e incompatível
2. **Criar projeto Supabase separado** — nunca compartilhar o mesmo projeto
3. **Habilitar RLS desde o início** — não adicionar depois com dados em produção
4. **Timestamps sempre em UTC** — converter para America/Sao_Paulo apenas no frontend
5. **`sort_order` em áreas e itens** — permite reordenação manual sem alterar IDs
