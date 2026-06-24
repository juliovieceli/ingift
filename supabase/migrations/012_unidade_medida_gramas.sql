-- Padronizar unidade de medida de filamentos para gramas (gr)
UPDATE public."Material"
SET "unidadeMedida" = 'gr'
WHERE "categoria" = 'filamento'
  AND "unidadeMedida" IN ('g', 'kg');
