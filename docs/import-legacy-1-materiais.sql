-- =============================================================================
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
  ('f58e63a3-91f1-41c8-a3fe-09da52784351', 'PLA (legado)', 'Filamento PLA sem cor registrada nos lançamentos antigos da calculadora', 'filamento', 'gr', 0, 0, 0, 0, 'PLA', NULL, NULL, true, now(), now(), NULL, NULL),
  ('4cc56271-544d-444f-b9e0-f2e2b688032d', 'PLA BRANCO', NULL, 'filamento', 'gr', 0, 0, 0, 0, 'PLA', 'branco', NULL, true, now(), now(), NULL, NULL),
  ('c2aef494-82f0-4b3b-b69e-580f84a5112a', 'PLA LARANJA', NULL, 'filamento', 'gr', 0, 0, 0, 0, 'PLA', 'laranja', NULL, true, now(), now(), NULL, NULL),
  ('4d9de601-c188-4f2f-abc5-b39f6eaa5bda', 'PLA BEGE', NULL, 'filamento', 'gr', 0, 0, 0, 0, 'PLA', 'bege', NULL, true, now(), now(), NULL, NULL),
  ('3649e64a-c309-4f1e-bc92-70e3e06b471f', 'PLA BRONZE', NULL, 'filamento', 'gr', 0, 0, 0, 0, 'PLA', 'bronze', NULL, true, now(), now(), NULL, NULL),
  ('bae17759-90e6-4337-a00c-09d3d45398e0', 'PETG CINZA', NULL, 'filamento', 'gr', 0, 0, 0, 0, 'PETG', 'cinza', NULL, true, now(), now(), NULL, NULL),
  ('71cab7d8-f107-4a92-bdd9-5e9895efcf76', 'PETG (legado)', 'Filamento PETG sem cor registrada nos lançamentos antigos da calculadora', 'filamento', 'gr', 0, 0, 0, 0, 'PETG', NULL, NULL, true, now(), now(), NULL, NULL)
ON CONFLICT ("id") DO NOTHING;

COMMIT;
