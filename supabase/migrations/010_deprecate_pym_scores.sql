-- Impulsa — Deprecar pym_scores tras migrar a salud_financiera.
-- Copia historial existente antes de eliminar la tabla legacy.

insert into salud_financiera (
  negocio_id, semana, indice, ventas_semana, gastos_semana, margen, explicacion, componentes, creado_en
)
select
  negocio_id, semana, score, ventas_semana, gastos_semana, margen, explicacion, componentes, creado_en
from pym_scores
on conflict (negocio_id, semana) do nothing;

drop table if exists pym_scores;
