-- Impulsa — bucket privado para comprobantes de pago (Yape/Plin/tarjeta).

insert into storage.buckets (id, name, public)
values ('comprobantes', 'comprobantes', false)
on conflict (id) do nothing;

drop policy if exists "comprobantes_insert_own_folder" on storage.objects;
drop policy if exists "comprobantes_select_own_folder" on storage.objects;
drop policy if exists "comprobantes_update_own_folder" on storage.objects;

create policy "comprobantes_insert_own_folder"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'comprobantes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "comprobantes_select_own_folder"
on storage.objects for select to authenticated
using (
  bucket_id = 'comprobantes'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "comprobantes_update_own_folder"
on storage.objects for update to authenticated
using (
  bucket_id = 'comprobantes'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'comprobantes'
  and (storage.foldername(name))[1] = auth.uid()::text
);
