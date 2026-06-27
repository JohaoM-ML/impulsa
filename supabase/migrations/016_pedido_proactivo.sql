-- Evita enviar varias veces el pedido inteligente proactivo el mismo dia.
alter table negocios
  add column if not exists ultimo_pedido_enviado date;
