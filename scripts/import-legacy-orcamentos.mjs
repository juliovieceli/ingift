#!/usr/bin/env node
// Gera um script SQL para importar os dados da calculadora antiga (docs/*.json)
// para o banco atual (Orcamento / OrcamentoItem / OrcamentoItemComposicao / Material).
//
// Uso:
//   node scripts/import-legacy-orcamentos.mjs
//
// Saídas:
//   docs/import-legacy-1-materiais.sql   -> cria os materiais novos (rodar e conferir primeiro)
//   docs/import-legacy-2-orcamentos.sql  -> importa clientes/orçamentos/itens/composição
//                                           (referencia os materiais criados pelo script acima)
//   docs/import-legacy-report.md         -> relatório com contagens e mapeamentos
//   docs/materiaisexistentes.json        -> atualizado com os novos materiais criados
//
// Nada é executado contra o banco por este script — apenas gera os artefatos
// para revisão manual antes de rodar no Supabase.

import { readFileSync, writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { randomUUID } from 'node:crypto'
import { NEW_MATERIALS, MATERIAL_MAP, construirResolverDeMaterial } from './legacy-material-map.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const docsDir = join(__dirname, '..', 'docs')

const readJson = (name) => JSON.parse(readFileSync(join(docsDir, name), 'utf8'))

const orders = readJson('orders.json')
const items = readJson('orders-items.json')
const filaments = readJson('orders-item-filaments.json')
const materiaisExistentes = readJson('materiaisexistentes.json')

// ---------------------------------------------------------------------------
// Helpers SQL
// ---------------------------------------------------------------------------

function sqlStr(value) {
  if (value === null || value === undefined) return 'NULL'
  return `'${String(value).replace(/'/g, "''")}'`
}

function sqlNum(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function sqlBool(value) {
  return value ? 'true' : 'false'
}

function sqlTimestamp(value) {
  return value ? sqlStr(value) : 'now()'
}

function statusSubquery(codigo) {
  return `(SELECT "id" FROM public."OrcamentoStatus" WHERE "codigo" = ${sqlStr(codigo)} LIMIT 1)`
}

const STATUS_MAP = {
  draft: 'em_digitacao',
  sent: 'aguardando_aprovacao',
}

// ---------------------------------------------------------------------------
// 1. Validar mapeamento de materiais antes de gerar qualquer SQL
// ---------------------------------------------------------------------------

const resolverMaterial = construirResolverDeMaterial(materiaisExistentes)

const combosUsados = new Map()
for (const f of filaments) {
  const key = `${(f.filament_type ?? '').trim().toUpperCase()}|${(f.color ?? '').trim().toLowerCase()}`
  if (!combosUsados.has(key)) {
    combosUsados.set(key, { tipo: f.filament_type, cor: f.color || null, count: 0 })
  }
  combosUsados.get(key).count++
}

const naoResolvidos = []
for (const { tipo, cor } of combosUsados.values()) {
  const resolvido = resolverMaterial(tipo, cor)
  if (!resolvido) naoResolvidos.push({ tipo, cor })
}

if (naoResolvidos.length > 0) {
  console.error('Combinações tipo/cor sem material mapeado:')
  for (const c of naoResolvidos) console.error(`  - ${c.tipo} / ${c.cor ?? '(sem cor)'}`)
  console.error('\nAtualize scripts/legacy-material-map.mjs antes de gerar o import.')
  process.exit(1)
}

// ---------------------------------------------------------------------------
// 2. Deduplicar clientes
// ---------------------------------------------------------------------------

const clientesPorChave = new Map()
for (const o of orders) {
  const nome = (o.client_name ?? '').trim()
  const chave = nome.toLowerCase()
  if (!clientesPorChave.has(chave)) {
    clientesPorChave.set(chave, {
      id: randomUUID(),
      nome,
      telefone: o.client_phone || null,
      email: o.client_email || null,
      criadoEm: o.created_at,
    })
  }
}

// ---------------------------------------------------------------------------
// 3. Agrupar itens por orçamento e filamentos por item
// ---------------------------------------------------------------------------

const itensPorOrcamento = new Map()
for (const it of items) {
  if (!itensPorOrcamento.has(it.order_id)) itensPorOrcamento.set(it.order_id, [])
  itensPorOrcamento.get(it.order_id).push(it)
}
for (const lista of itensPorOrcamento.values()) {
  lista.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

const filamentosPorItem = new Map()
for (const f of filaments) {
  if (!filamentosPorItem.has(f.order_item_id)) filamentosPorItem.set(f.order_item_id, [])
  filamentosPorItem.get(f.order_item_id).push(f)
}
for (const lista of filamentosPorItem.values()) {
  lista.sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
}

function horasParaHorasEMinutos(horasDecimal) {
  const total = Number(horasDecimal) || 0
  let horas = Math.floor(total)
  let minutos = Math.round((total - horas) * 60)
  if (minutos === 60) {
    minutos = 0
    horas += 1
  }
  return { horas, minutos }
}

// ---------------------------------------------------------------------------
// 4. Montar linhas SQL
// ---------------------------------------------------------------------------

const clienteRows = []
const orcamentoRows = []
const itemRows = []
const composicaoRows = []
const materiaisUsadosNomes = new Set()

for (const cliente of clientesPorChave.values()) {
  clienteRows.push(
    `  (${sqlStr(cliente.id)}, ${sqlStr(cliente.nome)}, ${sqlStr(cliente.telefone)}, ${sqlStr(cliente.email)}, true, ${sqlTimestamp(cliente.criadoEm)}, ${sqlTimestamp(cliente.criadoEm)})`,
  )
}

for (const o of orders) {
  const chaveCliente = (o.client_name ?? '').trim().toLowerCase()
  const clienteId = clientesPorChave.get(chaveCliente).id
  const statusCodigo = STATUS_MAP[o.status] ?? 'em_digitacao'

  orcamentoRows.push(
    `  (${sqlStr(o.id)}, ${sqlStr(clienteId)}, ${statusSubquery(statusCodigo)}, NULL, false, false, NULL, NULL, 'manual', NULL, ${sqlStr(o.description)}, ${sqlNum(o.total_production_cost)}, ${sqlNum(o.suggested_price)}, ${sqlTimestamp(o.created_at)}, ${sqlTimestamp(o.updated_at)}, NULL, NULL)`,
  )

  const seusItens = itensPorOrcamento.get(o.id) ?? []
  const logisticaTotal =
    sqlNum(o.packaging_cost) + sqlNum(o.shipping_cost) + sqlNum(o.finishing_cost) + sqlNum(o.extra_fixed_cost)

  seusItens.forEach((item, ordem) => {
    const seusFilamentos = filamentosPorItem.get(item.id) ?? []
    const pesoTotalG = seusFilamentos.reduce((soma, f) => soma + sqlNum(f.weight_g), 0)
    const { horas, minutos } = horasParaHorasEMinutos(item.print_time_hours)
    const taxaFalha = sqlNum(o.failure_rate)
    const custoProducaoTotal = sqlNum(item.total_cost)
    const custoAposFalha = custoProducaoTotal * (1 + taxaFalha)
    const adicional = ordem === 0 ? logisticaTotal : 0

    itemRows.push(
      [
        '  (',
        [
          sqlStr(item.id),
          sqlStr(o.id),
          sqlStr('peca'),
          'true',
          sqlStr(item.name),
          horas,
          minutos,
          sqlNum(item.quantity, 1),
          pesoTotalG,
          sqlStr(item.notes),
          'NULL',
          0,
          sqlNum(o.machine_kwh),
          sqlNum(o.kwh_price),
          sqlNum(o.machine_price),
          sqlNum(o.machine_lifetime_hours),
          taxaFalha,
          sqlNum(o.profit_multiplier),
          sqlNum(o.marketplace_fee),
          adicional,
          0,
          sqlNum(item.material_cost),
          sqlNum(item.energy_cost),
          sqlNum(item.depreciation_cost),
          custoProducaoTotal,
          custoAposFalha,
          0,
          0,
          0,
          0,
          0,
          0,
          'NULL',
          ordem,
          sqlTimestamp(item.created_at),
        ].join(', '),
        ')',
      ].join(''),
    )

    seusFilamentos.forEach((f, ordemComposicao) => {
      const { material } = resolverMaterial(f.filament_type, f.color)
      materiaisUsadosNomes.add(material.nome)
      const custoUnitario = sqlNum(f.price_per_kg) / 1000
      const cor = f.color && f.color.trim() !== '' ? f.color.trim() : null

      composicaoRows.push(
        `  (${sqlStr(f.id)}, ${sqlStr(item.id)}, ${sqlStr(material.id)}, 'filamento', ${sqlStr(material.nome)}, ${sqlStr(f.filament_type)}, ${sqlStr(cor)}, ${sqlNum(f.weight_g)}, 'gr', ${custoUnitario}, ${sqlNum(f.material_cost)}, ${sqlNum(f.weight_g)}, ${ordemComposicao})`,
      )
    })
  })
}

// ---------------------------------------------------------------------------
// 5. Montar SQL de novos materiais
// ---------------------------------------------------------------------------

const materialRows = NEW_MATERIALS.map(
  (m) =>
    `  (${sqlStr(m.id)}, ${sqlStr(m.nome)}, ${sqlStr(m.descricao)}, ${sqlStr(m.categoria)}, ${sqlStr(m.unidadeMedida)}, 0, 0, 0, 0, ${sqlStr(m.tipoMaterial)}, ${sqlStr(m.cor)}, ${sqlStr(m.marca)}, true, now(), now(), NULL, NULL)`,
)

// ---------------------------------------------------------------------------
// 6. Escrever os dois scripts SQL (materiais primeiro, orçamentos depois)
// ---------------------------------------------------------------------------

const sqlMateriais = `-- =============================================================================
-- PASSO 1/2 — Cria os materiais que existem nos lançamentos antigos da
-- calculadora mas ainda não existem na base atual.
-- Gerado por scripts/import-legacy-orcamentos.mjs — revisar antes de executar.
--
-- Rode este script e confira os materiais criados (tela de Materiais) antes
-- de rodar docs/import-legacy-2-orcamentos.sql.
-- =============================================================================

BEGIN;

INSERT INTO public."Material" (
  "id", "nome", "descricao", "categoria", "unidadeMedida",
  "estoqueAtual", "estoqueReservado", "estoqueMinimo", "custoMedioUnitario",
  "tipoMaterial", "cor", "marca", "ativo", "criadoEm", "atualizadoEm", "criadoPor", "atualizadoPor"
) VALUES
${materialRows.join(',\n')}
ON CONFLICT ("id") DO NOTHING;

COMMIT;
`

const sqlOrcamentos = `-- =============================================================================
-- PASSO 2/2 — Import de orçamentos, itens e composição da calculadora antiga
-- (docs/orders*.json).
-- Gerado por scripts/import-legacy-orcamentos.mjs — revisar antes de executar.
--
-- Pré-requisito: rodar docs/import-legacy-1-materiais.sql antes deste script,
-- pois a composição dos itens referencia os materiais criados por ele.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Clientes (deduplicados por nome, ignorando maiúsculas/minúsculas)
-- -----------------------------------------------------------------------------
INSERT INTO public."Cliente" (
  "id", "nome", "telefone", "email", "ativo", "criadoEm", "atualizadoEm"
) VALUES
${clienteRows.join(',\n')}
ON CONFLICT ("id") DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Orçamentos
-- -----------------------------------------------------------------------------
INSERT INTO public."Orcamento" (
  "id", "clienteId", "statusOrcamentoId", "configuracaoImpressoraId", "travado", "faturado",
  "validoAte", "prazoEntrega", "origem", "idExterno", "observacoes",
  "custoSubtotal", "precoTotal", "criadoEm", "atualizadoEm", "criadoPor", "atualizadoPor"
) VALUES
${orcamentoRows.join(',\n')}
ON CONFLICT ("id") DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Itens do orçamento
--    Observação: "adicional" (embalagem+frete+acabamento+extra do orçamento
--    legado) é somado apenas no primeiro item de cada orçamento, para não
--    duplicar o custo quando o orçamento tinha mais de um item.
-- -----------------------------------------------------------------------------
INSERT INTO public."OrcamentoItem" (
  "id", "orcamentoId", "tipoItem", "aplicarMargem", "nomePeca", "tempoHoras", "tempoMinutos",
  "quantidade", "pesoTotalG", "observacoes", "materialId", "custoUnitario",
  "consumoKwh", "precoKwh", "valorMaquina", "vidaUtilHoras", "taxaFalha", "margemMultiplicador", "taxaMarketplace",
  "adicional", "desconto", "custoMaterial", "custoEnergia", "custoDepreciacao",
  "custoProducaoTotal", "custoAposFalha", "precoUnitario", "precoTotal", "precoVenda", "precoFinal",
  "lucroEfetivo", "margemEfetiva", "idExterno", "ordem", "criadoEm"
) VALUES
${itemRows.join(',\n')}
ON CONFLICT ("id") DO NOTHING;

-- -----------------------------------------------------------------------------
-- 4. Composição dos itens (filamentos) — referencia os materiais do PASSO 1
-- -----------------------------------------------------------------------------
INSERT INTO public."OrcamentoItemComposicao" (
  "id", "itemOrcamentoId", "materialId", "categoria", "descricao", "tipo", "cor",
  "quantidade", "unidadeMedida", "custoUnitario", "custoTotal", "pesoG", "ordem"
) VALUES
${composicaoRows.join(',\n')}
ON CONFLICT ("id") DO NOTHING;

COMMIT;
`

const sqlRecalcularPrecos = `-- =============================================================================
-- PASSO 3/3 — Recalcula o preço de venda dos itens importados e o total do
-- orçamento, reproduzindo em SQL a mesma fórmula de
-- src/lib/calculadora.ts (aplicarPrecificacaoItem).
--
-- Por quê: o PASSO 2 só importou os CUSTOS dos itens legados — a calculadora
-- antiga guardava apenas o preço sugerido do ORÇAMENTO, não um preço por
-- item. Por isso "OrcamentoItem.precoFinal" ficou 0 até o item ser reaberto
-- e salvo manualmente na tela (o que já recalcula certo). Este script faz
-- esse recálculo em massa, sem precisar abrir item por item.
--
-- Seguro para rodar mais de uma vez (idempotente) e seguro para rodar contra
-- toda a base: só afeta itens com "precoFinal" = 0 e custo de produção > 0,
-- que é sempre um estado "ainda não calculado" (nunca um preço legítimo).
-- =============================================================================

BEGIN;

WITH calc AS (
  SELECT
    io."id",
    io."custoProducaoTotal" AS custo_producao,
    GREATEST(1, io."quantidade") AS qtd,
    io."aplicarMargem" AS aplica_margem,
    io."margemMultiplicador" AS margem_multiplicador,
    io."adicional" AS adicional,
    io."desconto" AS desconto,
    LEAST(GREATEST(COALESCE(io."taxaMarketplace", 0), 0), 0.95) AS taxa,
    (CASE
       WHEN NOT io."aplicarMargem" THEN io."custoProducaoTotal"
       WHEN io."tipoItem" = 'peca' THEN io."custoProducaoTotal" * (1 + io."taxaFalha")
       ELSE io."custoProducaoTotal"
     END) AS custo_apos_falha
  FROM public."OrcamentoItem" io
  WHERE io."precoFinal" = 0 AND io."custoProducaoTotal" > 0
),
calc2 AS (
  SELECT
    id, custo_producao, qtd, aplica_margem, adicional, desconto, taxa, custo_apos_falha,
    (CASE WHEN aplica_margem THEN custo_apos_falha * margem_multiplicador ELSE custo_apos_falha END) AS preco_com_margem
  FROM calc
),
calc3 AS (
  SELECT
    id, custo_producao, qtd, aplica_margem, desconto, taxa, custo_apos_falha, preco_com_margem,
    (CASE WHEN aplica_margem THEN preco_com_margem + adicional ELSE preco_com_margem END) AS preco_antes_taxa
  FROM calc2
),
calc4 AS (
  SELECT
    id, custo_producao, qtd, aplica_margem, desconto, custo_apos_falha,
    (CASE WHEN aplica_margem AND taxa > 0 THEN preco_antes_taxa / (1 - taxa) ELSE preco_antes_taxa END) AS preco_venda
  FROM calc3
),
resultado AS (
  SELECT
    id, custo_producao, qtd, custo_apos_falha, preco_venda,
    (CASE WHEN aplica_margem THEN GREATEST(0, preco_venda - desconto) ELSE preco_venda END) AS preco_final
  FROM calc4
)
UPDATE public."OrcamentoItem" io
SET
  "custoAposFalha" = r.custo_apos_falha,
  "precoVenda"     = r.preco_venda,
  "precoFinal"     = r.preco_final,
  "precoTotal"     = r.preco_final,
  "precoUnitario"  = r.preco_final / r.qtd,
  "lucroEfetivo"   = r.preco_final - r.custo_producao,
  "margemEfetiva"  = CASE WHEN r.custo_producao > 0 THEN (r.preco_final - r.custo_producao) / r.custo_producao ELSE 0 END
FROM resultado r
WHERE io."id" = r.id;

-- Recalcula os totais do orçamento (mesma lógica de recalcularTotaisOrcamento
-- em src/lib/orcamento.ts) para todo orçamento que tenha itens.
WITH totais AS (
  SELECT
    io."orcamentoId" AS id,
    SUM(io."custoProducaoTotal") AS custo_subtotal,
    SUM(COALESCE(io."precoFinal", io."precoTotal")) AS preco_total
  FROM public."OrcamentoItem" io
  GROUP BY io."orcamentoId"
)
UPDATE public."Orcamento" o
SET
  "custoSubtotal" = t.custo_subtotal,
  "precoTotal"    = t.preco_total
FROM totais t
WHERE o."id" = t.id;

COMMIT;
`

writeFileSync(join(docsDir, 'import-legacy-1-materiais.sql'), sqlMateriais, 'utf8')
writeFileSync(join(docsDir, 'import-legacy-2-orcamentos.sql'), sqlOrcamentos, 'utf8')
writeFileSync(join(docsDir, 'import-legacy-3-recalcular-precos.sql'), sqlRecalcularPrecos, 'utf8')

// ---------------------------------------------------------------------------
// 7. Atualizar docs/materiaisexistentes.json com os novos materiais
// ---------------------------------------------------------------------------

const nomesExistentes = new Set(materiaisExistentes.map((m) => m.nome.trim().toLowerCase()))
const novosParaAdicionar = NEW_MATERIALS.filter((m) => !nomesExistentes.has(m.nome.trim().toLowerCase())).map((m) => ({
  id: m.id,
  nome: m.nome,
  descricao: m.descricao,
  categoria: m.categoria,
  unidadeMedida: m.unidadeMedida,
  estoqueAtual: '0.00',
  estoqueReservado: '0.00',
  estoqueMinimo: '0.00',
  custoMedioUnitario: '0.0000',
  tipoMaterial: m.tipoMaterial,
  cor: m.cor,
  marca: m.marca,
  ativo: true,
  criadoEm: new Date().toISOString(),
  atualizadoEm: new Date().toISOString(),
  criadoPor: null,
  atualizadoPor: null,
}))

if (novosParaAdicionar.length > 0) {
  const atualizado = [...materiaisExistentes, ...novosParaAdicionar]
  writeFileSync(join(docsDir, 'materiaisexistentes.json'), JSON.stringify(atualizado, null, 4) + '\n', 'utf8')
}

// ---------------------------------------------------------------------------
// 8. Relatório
// ---------------------------------------------------------------------------

const aproximados = MATERIAL_MAP.filter((r) => r.aproximado)

const report = `# Relatório de import — calculadora antiga

Gerado por \`scripts/import-legacy-orcamentos.mjs\`.

## Contagens

| Item | Quantidade |
|------|-----------|
| Orçamentos | ${orders.length} |
| Itens | ${items.length} |
| Linhas de composição (filamento) | ${filaments.length} |
| Clientes únicos (deduplicados) | ${clientesPorChave.size} |
| Materiais novos criados | ${NEW_MATERIALS.length} |

## Clientes deduplicados

${[...clientesPorChave.values()].map((c) => `- **${c.nome}** → \`${c.id}\``).join('\n')}

## Materiais novos criados (incluídos em docs/materiaisexistentes.json)

${NEW_MATERIALS.map((m) => `- **${m.nome}** (${m.tipoMaterial ?? '—'} / ${m.cor ?? 'sem cor'}) → \`${m.id}\``).join('\n')}

## Mapeamento tipo/cor → material

${MATERIAL_MAP.map((r) => `- ${r.tipo} / ${r.cor ?? '(sem cor)'} → **${r.materialNome}**${r.aproximado ? ' ⚠️ aproximado' : ''}`).join('\n')}

${
  aproximados.length > 0
    ? `## Atenção: mapeamentos aproximados\n\n${aproximados.map((r) => `- ${r.tipo} / ${r.cor}: ${r.nota}`).join('\n')}\n`
    : ''
}

## Como executar

1. Revisar \`docs/import-legacy-1-materiais.sql\` e rodar no editor do Supabase (ou via \`psql\`) com um usuário com permissão de bypass de RLS (service role / owner).
2. Conferir na tela de Materiais do app se os ${NEW_MATERIALS.length} materiais novos foram criados corretamente (nome, tipo, cor).
3. Revisar \`docs/import-legacy-2-orcamentos.sql\` e rodar em seguida — ele referencia os materiais criados no passo 1 (por isso a ordem importa).
4. Confirmar que a migration \`006_seed.sql\` já rodou (necessária para os códigos de status \`em_digitacao\` / \`aguardando_aprovacao\`).
5. Rodar \`docs/import-legacy-3-recalcular-precos.sql\` — recalcula \`precoFinal\`/\`precoVenda\`/\`lucroEfetivo\` de cada item (que o PASSO 2 deixou zerado, já que a calculadora antiga não guardava preço por item) e os totais do orçamento. Sem esse passo, os itens aparecem com R$ 0,00 até serem salvos manualmente na UI.
6. Validar: contagem de linhas em \`Orcamento\`, \`OrcamentoItem\`, \`OrcamentoItemComposicao\`, \`Material\`.
7. Conferir 2–3 orçamentos na UI, comparando \`precoTotal\` com o \`suggested_price\` do JSON original (podem diferir um pouco: o legado calculava o total do orçamento incluindo falha/logística uma única vez, já o novo cálculo é por item — ver observação no PASSO 2 sobre "adicional").
`

writeFileSync(join(docsDir, 'import-legacy-report.md'), report, 'utf8')

console.log('OK: docs/import-legacy-1-materiais.sql')
console.log('OK: docs/import-legacy-2-orcamentos.sql')
console.log('OK: docs/import-legacy-3-recalcular-precos.sql')
console.log('OK: docs/import-legacy-report.md')
if (novosParaAdicionar.length > 0) {
  console.log(`OK: docs/materiaisexistentes.json atualizado com ${novosParaAdicionar.length} novos materiais`)
} else {
  console.log('docs/materiaisexistentes.json já continha os materiais novos (nada a atualizar)')
}
console.log(`\nOrçamentos: ${orders.length} | Itens: ${items.length} | Composições: ${filaments.length} | Clientes: ${clientesPorChave.size}`)
console.log(`Materiais usados na composição: ${materiaisUsadosNomes.size}`)
