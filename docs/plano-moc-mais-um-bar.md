# Plano: MOC +1 Bar Controle

**Gerado a partir de auditoria read-only do NaBrasa Controle**  
**Data:** 2026-05-23  
**Status:** Base inicial criada

---

## 1. O que pode ser reaproveitado como referência

| Conceito | Origem | Aplicação no +1 Bar |
|----------|--------|---------------------|
| Stack Next.js App Router + TypeScript | NaBrasa | Idêntica — sem alteração |
| Tailwind CSS v4 | NaBrasa | Idêntico — mesma versão |
| Lucide React | NaBrasa | Mesmo pacote de ícones |
| React Hot Toast | NaBrasa | Mesmo sistema de feedback |
| Pattern de layout com bottom nav | NaBrasa | Reescrito do zero para +1 Bar |
| Padrão de guarda de rota client-side | NaBrasa | Adaptado — useEffect + redirect |
| Tipos de item (item_type enum) | NaBrasa Controle (análise) | Expandido com prepared_portioned |
| Estrutura de sessão de contagem | NaBrasa (count_sessions) | Schema futuro mapeado |
| Mobile-first max-w-md | NaBrasa | Mantido como padrão |
| CSS custom properties para tema | NaBrasa | Reescrito com paleta própria do +1 Bar |

---

## 2. O que NÃO deve ser levado para o novo projeto

- **Módulo de vendas / Takeat** — Integração de PDV não é escopo
- **CMV / Custo de Mercadoria Vendida** — Fora do escopo inicial
- **Gamificação** — Rankings, pontos, selos, missões (complexidade desnecessária agora)
- **Copilot / IA** — Chat, análise inteligente
- **Módulo de Checklists** — Abertura/fechamento operacional
- **Módulo de Compras** — Pedidos, recebimento, NF-e
- **Módulo de Produção** — Planejamento de cozinha
- **Módulo de Comunicação** — Murais, avisos
- **Histórico de execuções com CMV** — Precisa de compras para funcionar
- **Audit reports / divergências financeiras** — Requer estoque teórico populado
- **Auth via PIN** — O NaBrasa usa AES-256 cookie PIN por tablet. Para +1 Bar, usar Supabase Auth padrão
- **Relatórios de auditoria em PDF** — Fase futura
- **XLSX export** — Fase futura
- **Gamification events, leaderboard** — Fora do escopo

---

## 3. Componentes/conceitos que servem como base

- **`StatusBadge`** — Indicador visual de status (pending/in_progress/completed)
- **`ProgressBar`** — Barra de progresso simples para acompanhamento da contagem
- **Layout com Header + BottomNav** — Padrão mobile-first com navegação inferior
- **Card pattern** — Cards com `rounded-2xl + border + shadow-sm` no estilo NaBrasa
- **Tipos centrais** — `ItemType`, `AreaStatus`, `CountStatus`, `UserRole` já mapeados
- **Mock data organizado** — `mocks/maisUmBar.ts` para desenvolvimento desconectado
- **CSS custom properties** — `--brand`, `--background`, `--border`, `--muted` como tokens

---

## 4. Módulos que devem ser ignorados nesta fase

- Compras e estoque de entrada
- Relatórios de auditoria
- CMV e financeiro
- Gamificação e recompensas
- Copilot / IA operacional
- Integração com PDV (Takeat ou outro)
- Checklists operacionais (abertura/fechamento)
- Módulo de produção (cozinha)
- Notificações push
- Multi-loja (por ora, apenas +1 Bar)

---

## 5. Como montar a base inicial do MOC +1 Bar Controle

### Fase 1 — Base (concluída)
- [x] Projeto Next.js separado criado
- [x] Autenticação simples (mock + estrutura para Supabase Auth)
- [x] Layout com Header + BottomNav
- [x] Dashboard com cards operacionais
- [x] Página de contagem (placeholder)
- [x] Página admin (placeholder)
- [x] Mock data organizado (`mocks/maisUmBar.ts`)
- [x] Tipos centrais (`lib/types.ts`)
- [x] Documentação de plano
- [x] Documentação de schema futuro

### Fase 2 — Autenticação Real
- [ ] Criar projeto Supabase para +1 Bar (SEPARADO do NaBrasa)
- [ ] Configurar `.env.local` com variáveis do +1 Bar
- [ ] Substituir mock login por `supabase.auth.signInWithPassword`
- [ ] Implementar guard de rota com `supabase.auth.getSession()`
- [ ] Criar tabela `profiles` com role (operator/manager/admin)

### Fase 3 — CRUD Básico
- [ ] Criar tabelas no Supabase: `count_areas`, `count_items`
- [ ] Página de cadastro de áreas
- [ ] Página de cadastro de itens com item_type
- [ ] Página de usuários

### Fase 4 — Fluxo de Contagem
- [ ] Criar tabelas: `count_sessions`, `count_session_items`
- [ ] Formulário de entrada de quantidade por item/área
- [ ] Lógica de sessão (iniciar/continuar/concluir)
- [ ] Persistência offline com localStorage como fallback
- [ ] Sincronização com Supabase

### Fase 5 — Histórico e Relatórios
- [ ] Página de histórico de contagens
- [ ] Visualização de sessão por área
- [ ] Exportação básica (CSV ou XLSX)

---

## 6. Riscos de copiar código demais

1. **Dados sensíveis do NaBrasa** — O projeto original tem `.env` com credenciais reais. Copiar arquivos `.env` ou migrations pode expor o banco de produção do NaBrasa.
2. **Dependências acopladas** — Actions como `gamificationAction`, `cmvActions`, `criticalActions` têm dependências cruzadas entre si. Copiar uma puxa a outra.
3. **Schema incompatível** — O banco do NaBrasa tem RLS configurada e triggers. Tentar rodar as mesmas migrations em outro Supabase pode falhar ou criar inconsistências.
4. **Over-engineering** — O NaBrasa tem ~200+ arquivos. O +1 Bar precisa começar com 20. Copiar demais cria um sistema impossível de manter para uma consultoria.
5. **Branding cruzado** — Textos, nomes, logos e dados de exemplo do NaBrasa não devem aparecer no +1 Bar.

---

## 7. Cuidados com dados sensíveis

- **Nunca copiar `.env.local` do NaBrasa** para o +1 Bar
- **Nunca compartilhar** `SUPABASE_SERVICE_ROLE_KEY` do NaBrasa com outro projeto
- **Criar projeto Supabase novo** e dedicado para o +1 Bar
- **Não rodar migrations do NaBrasa** no banco do +1 Bar (schemas incompatíveis)
- **Mock data** usa apenas nomes fictícios, sem dados reais de clientes ou estoque
- **Arquivo `.gitignore`** já exclui `.env*` — verificar antes de qualquer commit

---

## 8. Próximos passos recomendados

1. Criar projeto Supabase dedicado para +1 Bar (free tier suficiente para fase inicial)
2. Substituir autenticação mock por Supabase Auth
3. Criar schema mínimo de tabelas conforme `docs/schema-futuro-moc-mais-um-bar.md`
4. Cadastrar as 6 áreas da loja no banco
5. Importar lista real de itens via CSV (usar PapaParse — já disponível no NaBrasa como referência)
6. Implementar fluxo de contagem por área
7. Validar com o time do +1 Bar em produção antes de expandir
