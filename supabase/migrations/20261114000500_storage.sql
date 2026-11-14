-- NegocioClaro · Fotos de vales y facturas
-- Bucket privado. Ruta: <business_id>/<uuid>.webp. Solo miembros del negocio
-- pueden subir, ver o borrar sus comprobantes (URLs firmadas de 10 min).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('comprobantes', 'comprobantes', false, 2 * 1024 * 1024, array['image/webp', 'image/jpeg', 'image/png'])
on conflict (id) do nothing;

create policy "miembros leen comprobantes" on storage.objects
  for select to authenticated
  using (bucket_id = 'comprobantes' and public.is_member(((storage.foldername(name))[1])::uuid));

create policy "miembros suben comprobantes" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'comprobantes' and public.is_member(((storage.foldername(name))[1])::uuid));

create policy "miembros borran comprobantes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'comprobantes' and public.is_member(((storage.foldername(name))[1])::uuid));
