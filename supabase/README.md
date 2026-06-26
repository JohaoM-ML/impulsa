# Migraciones Supabase

Ejecutar en orden en el **SQL Editor** de Supabase (o con `supabase db push` si usas CLI local).

| Archivo | Contenido |
|---------|-----------|
| `001_schema_inicial.sql` | Tablas core: negocios, productos, ventas, gastos, niveles, PymScore, RLS |
| `002_registrar_venta_rpc.sql` | RPC atómica para registrar venta y descontar stock |
| `003_rediseno.sql` | Categoría de productos, deuda proveedores, componentes PymScore, perfil IA |
| `004_examen.sql` | Banco de preguntas del examen + intentos + seed de preguntas |
| `005_conversaciones_wsp.sql` | Estado de conversaciones del chatbot WhatsApp (estado_flujo, contexto, historial) + RLS |
