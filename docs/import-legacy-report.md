# Relatório de import — calculadora antiga

Gerado por `scripts/import-legacy-orcamentos.mjs`.

## Contagens

| Item | Quantidade |
|------|-----------|
| Orçamentos | 58 |
| Itens | 61 |
| Linhas de composição (filamento) | 73 |
| Clientes únicos (deduplicados) | 8 |
| Materiais novos criados | 7 |

## Clientes deduplicados

- **Ingift** → `45f242bb-3a58-4c65-a054-1bd314ab7e8d`
- **Gabriel** → `ef8d37de-e473-4ce4-88ff-e375c4fee3f4`
- **nome do cabra** → `28b9d3a1-4160-46a8-90b6-5be801949309`
- **Kill** → `0805f40e-3b26-41d6-aa6d-e064fe4902a3`
- **Camila Singular** → `8f78d52e-6132-4e91-9e8a-83b343d66c44`
- **Personal Breno** → `41e67b04-df81-4ac6-8af9-0f0d8ce12640`
- **Tassia** → `a064d401-7aa5-4777-a967-cb8da6915b36`
- **Ney** → `e307b59c-0006-4097-9a29-3dc5eac0eba8`

## Materiais novos criados (incluídos em docs/materiaisexistentes.json)

- **PLA (legado)** (PLA / sem cor) → `f58e63a3-91f1-41c8-a3fe-09da52784351`
- **PLA BRANCO** (PLA / branco) → `4cc56271-544d-444f-b9e0-f2e2b688032d`
- **PLA LARANJA** (PLA / laranja) → `c2aef494-82f0-4b3b-b69e-580f84a5112a`
- **PLA BEGE** (PLA / bege) → `4d9de601-c188-4f2f-abc5-b39f6eaa5bda`
- **PLA BRONZE** (PLA / bronze) → `3649e64a-c309-4f1e-bc92-70e3e06b471f`
- **PETG CINZA** (PETG / cinza) → `bae17759-90e6-4337-a00c-09d3d45398e0`
- **PETG (legado)** (PETG / sem cor) → `71cab7d8-f107-4a92-bdd9-5e9895efcf76`

## Mapeamento tipo/cor → material

- PLA / azul → **PLA AZUL - SUNLU**
- PLA / marrom → **PLA MARROM - SUNLU**
- PLA / amarelo → **PLA AMARELO - SUNLU**
- PLA / preto → **PLA PRETO**
- PLA / tricolor → **PLA TRICOLOR - VERDE, DOURADO E PINK**
- PLA / verde → **PLA TRICOLOR - VERDE, DOURADO E PINK** ⚠️ aproximado
- PLA / (sem cor) → **PLA (legado)**
- PLA / branco → **PLA BRANCO**
- PLA / laranja → **PLA LARANJA**
- PLA / bege → **PLA BEGE**
- PLA / bronze → **PLA BRONZE**
- PETG / cinza → **PETG CINZA**
- PETG / (sem cor) → **PETG (legado)**

## Atenção: mapeamentos aproximados

- PLA / verde: Não existe "PLA verde" isolado na base atual; associado ao tricolor (verde/dourado/pink) por conter verde na composição.


## Como executar

1. Revisar `docs/import-legacy-1-materiais.sql` e rodar no editor do Supabase (ou via `psql`) com um usuário com permissão de bypass de RLS (service role / owner).
2. Conferir na tela de Materiais do app se os 7 materiais novos foram criados corretamente (nome, tipo, cor).
3. Revisar `docs/import-legacy-2-orcamentos.sql` e rodar em seguida — ele referencia os materiais criados no passo 1 (por isso a ordem importa).
4. Confirmar que a migration `006_seed.sql` já rodou (necessária para os códigos de status `em_digitacao` / `aguardando_aprovacao`).
5. Rodar `docs/import-legacy-3-recalcular-precos.sql` — recalcula `precoFinal`/`precoVenda`/`lucroEfetivo` de cada item (que o PASSO 2 deixou zerado, já que a calculadora antiga não guardava preço por item) e os totais do orçamento. Sem esse passo, os itens aparecem com R$ 0,00 até serem salvos manualmente na UI.
6. Validar: contagem de linhas em `Orcamento`, `OrcamentoItem`, `OrcamentoItemComposicao`, `Material`.
7. Conferir 2–3 orçamentos na UI, comparando `precoTotal` com o `suggested_price` do JSON original (podem diferir um pouco: o legado calculava o total do orçamento incluindo falha/logística uma única vez, já o novo cálculo é por item — ver observação no PASSO 2 sobre "adicional").
