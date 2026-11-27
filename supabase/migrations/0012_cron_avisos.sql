-- Llamada periódica a /api/avisos desde Supabase (el plan gratuito de Vercel solo permite una tarea al día).
-- Los dos valores secretos NO van aquí: se guardan en el Vault ('app_url' y 'cron_secret') y los crea Iván.

create or replace function public.llamar_avisos() returns void
language plpgsql security definer set search_path = '' as $$
declare
  url text; secreto text;
begin
  select decrypted_secret into url from vault.decrypted_secrets where name = 'app_url';
  select decrypted_secret into secreto from vault.decrypted_secrets where name = 'cron_secret';
  if url is null or secreto is null then return; end if;
  perform net.http_post(
    url := rtrim(url, '/') || '/api/avisos',
    headers := jsonb_build_object('Authorization', 'Bearer ' || secreto, 'Content-Type', 'application/json'),
    body := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
end $$;

revoke all on function public.llamar_avisos() from public, anon, authenticated;

do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron')
     and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
    create extension if not exists pg_cron with schema pg_catalog;
    perform cron.unschedule(jobid) from cron.job where jobname = 'avisos-cada-minuto';
    perform cron.schedule('avisos-cada-minuto', '* * * * *', 'select public.llamar_avisos()');
  end if;
end $$;
