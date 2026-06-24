-- Remove tabelas sem uso no código: FilamentoCompra, Produto, LogAuditoria

DROP TRIGGER IF EXISTS "trgCompraFilamento" ON public."FilamentoCompra";
DROP FUNCTION IF EXISTS public."processarCompraFilamento"();
DROP TRIGGER IF EXISTS "trgProdutoAtualizado" ON public."Produto";

ALTER TABLE public."EstoqueMovimentacao" DROP COLUMN IF EXISTS "compraFilamentoId";
ALTER TABLE public."OrcamentoItem" DROP COLUMN IF EXISTS "produtoId";

DROP POLICY IF EXISTS "admin_CompraFilamento" ON public."FilamentoCompra";
DROP POLICY IF EXISTS "admin_Produto" ON public."Produto";
DROP POLICY IF EXISTS "Produto_publico" ON public."Produto";
DROP POLICY IF EXISTS "admin_LogAuditoria" ON public."LogAuditoria";

REVOKE ALL ON public."FilamentoCompra" FROM authenticated;
REVOKE ALL ON public."Produto" FROM anon, authenticated;
REVOKE ALL ON public."LogAuditoria" FROM anon, authenticated;

DROP TABLE IF EXISTS public."FilamentoCompra";
DROP TABLE IF EXISTS public."Produto";
DROP TABLE IF EXISTS public."LogAuditoria";
