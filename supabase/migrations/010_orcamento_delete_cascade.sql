-- O trigger de imutabilidade bloqueava DELETE em cascata ao excluir Orcamento.
-- Mantém proteção contra UPDATE; permite DELETE (cascata ou limpeza ao excluir orçamento).
DROP TRIGGER IF EXISTS "trgHistoricoImutavelDelete" ON public."HistoricoStatusOrcamento";
