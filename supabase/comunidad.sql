-- Comunidad de Mi Esquina: un muro donde la gente se acompaña.
-- Todo pasa por funciones: nadie lee las tablas directo, y nadie ve el user_id de otro.
-- Se aplica solo con el «sí» de Joaquín (toca producción).

create table if not exists public.com_alias (
  user_id uuid primary key references auth.users(id) on delete cascade,
  alias text not null check (char_length(alias) between 2 and 24 and alias ~ '^[[:alnum:] ._áéíóúñÁÉÍÓÚÑüÜ-]+$'),
  normas_at timestamptz not null default now(),
  creado timestamptz not null default now()
);
create unique index if not exists com_alias_unico on public.com_alias (lower(alias));

create table if not exists public.com_posts (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tema text not null check (tema in ('animo','habitos','plata','tiempo','logro')),
  texto text not null check (char_length(texto) between 1 and 600),
  oculto boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists com_posts_feed on public.com_posts (id desc) where not oculto;
create index if not exists com_posts_user on public.com_posts (user_id, creado desc);

create table if not exists public.com_respuestas (
  id bigint generated always as identity primary key,
  post_id bigint not null references public.com_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  texto text not null check (char_length(texto) between 1 and 400),
  oculto boolean not null default false,
  creado timestamptz not null default now()
);
create index if not exists com_resp_post on public.com_respuestas (post_id, id);
create index if not exists com_resp_user on public.com_respuestas (user_id, creado desc);

create table if not exists public.com_apoyos (
  post_id bigint not null references public.com_posts(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (post_id, user_id)
);

create table if not exists public.com_reportes (
  id bigint generated always as identity primary key,
  tipo text not null check (tipo in ('post','resp')),
  item_id bigint not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  motivo text not null check (motivo in ('ofensivo','spam','datos','riesgo','otro')),
  resuelto boolean not null default false,
  creado timestamptz not null default now(),
  unique (tipo, item_id, user_id)
);

create table if not exists public.com_bloqueos (
  user_id uuid not null references auth.users(id) on delete cascade,
  bloqueado uuid not null references auth.users(id) on delete cascade,
  primary key (user_id, bloqueado)
);

alter table public.com_alias enable row level security;
alter table public.com_posts enable row level security;
alter table public.com_respuestas enable row level security;
alter table public.com_apoyos enable row level security;
alter table public.com_reportes enable row level security;
alter table public.com_bloqueos enable row level security;
revoke all on public.com_alias, public.com_posts, public.com_respuestas, public.com_apoyos, public.com_reportes, public.com_bloqueos from anon, authenticated;

-- ¿Hay bloqueo entre yo y esa persona, en cualquier sentido?
create or replace function public.com_bloq(p_otro uuid) returns boolean
language sql stable security definer set search_path to '' as $$
  select exists (select 1 from public.com_bloqueos b
    where (b.user_id = (select auth.uid()) and b.bloqueado = p_otro)
       or (b.user_id = p_otro and b.bloqueado = (select auth.uid())));
$$;

create or replace function public.com_limpia(p text) returns text
language sql immutable set search_path to '' as $$
  select btrim(regexp_replace(regexp_replace(coalesce(p,''), '[\x01-\x09\x0B-\x1F\x7F]', '', 'g'), '\n{3,}', E'\n\n', 'g'));
$$;

create or replace function public.com_mi_alias() returns text
language sql stable security definer set search_path to '' as $$
  select alias from public.com_alias where user_id = (select auth.uid());
$$;

create or replace function public.com_set_alias(p_alias text) returns text
language plpgsql security definer set search_path to '' as $$
declare a text := btrim(coalesce(p_alias,''));
begin
  if auth.uid() is null then raise exception 'no autorizado' using errcode='42501'; end if;
  if char_length(a) < 2 or char_length(a) > 24 or a !~ '^[[:alnum:] ._áéíóúñÁÉÍÓÚÑüÜ-]+$' then
    raise exception 'alias_invalido' using errcode='22023'; end if;
  if exists (select 1 from public.com_alias where lower(alias)=lower(a) and user_id<>auth.uid()) then
    raise exception 'alias_ocupado' using errcode='23505'; end if;
  insert into public.com_alias(user_id, alias) values (auth.uid(), a)
    on conflict (user_id) do update set alias = excluded.alias;
  return a;
end $$;

create or replace function public.com_feed(p_tema text default null, p_antes bigint default null) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(x order by (x->>'id')::bigint desc), '[]'::jsonb) from (
    select jsonb_build_object(
      'id', p.id, 'tema', p.tema, 'texto', p.texto, 'creado', p.creado,
      'alias', coalesce(a.alias, 'Alguien'),
      'mio', p.user_id = (select auth.uid()),
      'apoyos', (select count(*) from public.com_apoyos ap where ap.post_id = p.id),
      'apoyado', exists (select 1 from public.com_apoyos ap where ap.post_id = p.id and ap.user_id = (select auth.uid())),
      'respuestas', (select count(*) from public.com_respuestas r where r.post_id = p.id and not r.oculto and not public.com_bloq(r.user_id))
    ) x
    from public.com_posts p left join public.com_alias a on a.user_id = p.user_id
    where (select auth.uid()) is not null and not p.oculto
      and (p_tema is null or p.tema = p_tema)
      and (p_antes is null or p.id < p_antes)
      and not public.com_bloq(p.user_id)
    order by p.id desc limit 30
  ) s;
$$;

create or replace function public.com_respuestas_de(p_post bigint) returns jsonb
language sql stable security definer set search_path to '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'texto', r.texto, 'creado', r.creado,
      'alias', coalesce(a.alias, 'Alguien'), 'mio', r.user_id = (select auth.uid())) order by r.id), '[]'::jsonb)
  from public.com_respuestas r left join public.com_alias a on a.user_id = r.user_id
  where (select auth.uid()) is not null and r.post_id = p_post and not r.oculto and not public.com_bloq(r.user_id)
    and exists (select 1 from public.com_posts p where p.id = p_post and not p.oculto and not public.com_bloq(p.user_id));
$$;

create or replace function public.com_publicar(p_tema text, p_texto text) returns bigint
language plpgsql security definer set search_path to '' as $$
declare t text := public.com_limpia(p_texto); nid bigint;
begin
  if auth.uid() is null or not exists (select 1 from public.com_alias where user_id = auth.uid()) then
    raise exception 'sin_alias' using errcode='42501'; end if;
  if (select count(*) from public.com_posts where user_id = auth.uid() and creado > now() - interval '1 day') >= 8 then
    raise exception 'limite' using errcode='54000'; end if;
  insert into public.com_posts(user_id, tema, texto) values (auth.uid(), p_tema, t) returning id into nid;
  return nid;
end $$;

create or replace function public.com_responder(p_post bigint, p_texto text) returns bigint
language plpgsql security definer set search_path to '' as $$
declare t text := public.com_limpia(p_texto); nid bigint; autor uuid;
begin
  if auth.uid() is null or not exists (select 1 from public.com_alias where user_id = auth.uid()) then
    raise exception 'sin_alias' using errcode='42501'; end if;
  select user_id into autor from public.com_posts where id = p_post and not oculto;
  if autor is null or public.com_bloq(autor) then raise exception 'no_existe' using errcode='P0002'; end if;
  if (select count(*) from public.com_respuestas where user_id = auth.uid() and creado > now() - interval '1 day') >= 40 then
    raise exception 'limite' using errcode='54000'; end if;
  insert into public.com_respuestas(post_id, user_id, texto) values (p_post, auth.uid(), t) returning id into nid;
  return nid;
end $$;

create or replace function public.com_apoyar(p_post bigint) returns boolean
language plpgsql security definer set search_path to '' as $$
begin
  if auth.uid() is null then raise exception 'no autorizado' using errcode='42501'; end if;
  if not exists (select 1 from public.com_posts where id = p_post and not oculto) then
    raise exception 'no_existe' using errcode='P0002'; end if;
  delete from public.com_apoyos where post_id = p_post and user_id = auth.uid();
  if found then return false; end if;
  insert into public.com_apoyos(post_id, user_id) values (p_post, auth.uid());
  return true;
end $$;

create or replace function public.com_borrar(p_tipo text, p_id bigint) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if p_tipo = 'post' then delete from public.com_posts where id = p_id and user_id = auth.uid();
  elsif p_tipo = 'resp' then delete from public.com_respuestas where id = p_id and user_id = auth.uid();
  end if;
end $$;

create or replace function public.com_autor(p_tipo text, p_id bigint) returns uuid
language sql stable security definer set search_path to '' as $$
  select case when p_tipo = 'post' then (select user_id from public.com_posts where id = p_id)
              when p_tipo = 'resp' then (select user_id from public.com_respuestas where id = p_id) end;
$$;

-- Con 3 reportes de personas distintas, el texto se esconde solo hasta que el dueño lo revise.
create or replace function public.com_reportar(p_tipo text, p_id bigint, p_motivo text) returns void
language plpgsql security definer set search_path to '' as $$
declare autor uuid := public.com_autor(p_tipo, p_id);
begin
  if auth.uid() is null then raise exception 'no autorizado' using errcode='42501'; end if;
  if autor is null then raise exception 'no_existe' using errcode='P0002'; end if;
  if autor = auth.uid() then return; end if;
  insert into public.com_reportes(tipo, item_id, user_id, motivo) values (p_tipo, p_id, auth.uid(), p_motivo)
    on conflict (tipo, item_id, user_id) do nothing;
  if (select count(*) from public.com_reportes where tipo = p_tipo and item_id = p_id and not resuelto) >= 3 then
    if p_tipo = 'post' then update public.com_posts set oculto = true where id = p_id;
    else update public.com_respuestas set oculto = true where id = p_id; end if;
  end if;
end $$;

create or replace function public.com_bloquear(p_tipo text, p_id bigint) returns void
language plpgsql security definer set search_path to '' as $$
declare autor uuid := public.com_autor(p_tipo, p_id);
begin
  if auth.uid() is null then raise exception 'no autorizado' using errcode='42501'; end if;
  if autor is null or autor = auth.uid() then return; end if;
  insert into public.com_bloqueos(user_id, bloqueado) values (auth.uid(), autor) on conflict do nothing;
end $$;

create or replace function public.com_desbloquear_todos() returns integer
language plpgsql security definer set search_path to '' as $$
declare n integer;
begin
  delete from public.com_bloqueos where user_id = auth.uid();
  get diagnostics n = row_count; return n;
end $$;

-- Panel del dueño: lo reportado, con su texto, para dejarlo o esconderlo.
create or replace function public.dueno_com_reportes() returns jsonb
language plpgsql stable security definer set search_path to '' as $$
begin
  if not public.es_dueno() then raise exception 'no autorizado' using errcode='42501'; end if;
  return coalesce((select jsonb_agg(x order by x->>'ultimo' desc) from (
    select jsonb_build_object('tipo', r.tipo, 'id', r.item_id, 'n', count(*),
      'motivos', jsonb_agg(distinct r.motivo), 'ultimo', max(r.creado),
      'texto', case when r.tipo='post' then (select texto from public.com_posts where id=r.item_id)
                    else (select texto from public.com_respuestas where id=r.item_id) end,
      'oculto', case when r.tipo='post' then (select oculto from public.com_posts where id=r.item_id)
                     else (select oculto from public.com_respuestas where id=r.item_id) end,
      'alias', (select alias from public.com_alias where user_id = public.com_autor(r.tipo, r.item_id))) x
    from public.com_reportes r where not r.resuelto group by r.tipo, r.item_id) s
    where x->>'texto' is not null), '[]'::jsonb);
end $$;

create or replace function public.dueno_com_moderar(p_tipo text, p_id bigint, p_oculto boolean) returns void
language plpgsql security definer set search_path to '' as $$
begin
  if not public.es_dueno() then raise exception 'no autorizado' using errcode='42501'; end if;
  if p_tipo = 'post' then update public.com_posts set oculto = p_oculto where id = p_id;
  elsif p_tipo = 'resp' then update public.com_respuestas set oculto = p_oculto where id = p_id; end if;
  update public.com_reportes set resuelto = true where tipo = p_tipo and item_id = p_id;
end $$;

do $$ declare f text; begin
  foreach f in array array['com_bloq(uuid)','com_limpia(text)','com_mi_alias()','com_set_alias(text)','com_feed(text,bigint)',
    'com_respuestas_de(bigint)','com_publicar(text,text)','com_responder(bigint,text)','com_apoyar(bigint)','com_borrar(text,bigint)',
    'com_autor(text,bigint)','com_reportar(text,bigint,text)','com_bloquear(text,bigint)','com_desbloquear_todos()',
    'dueno_com_reportes()','dueno_com_moderar(text,bigint,boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
  -- Internas: no se llaman desde la app.
  execute 'revoke execute on function public.com_autor(text,bigint) from authenticated';
  execute 'revoke execute on function public.com_bloq(uuid) from authenticated';
  execute 'revoke execute on function public.com_limpia(text) from authenticated';
end $$;
