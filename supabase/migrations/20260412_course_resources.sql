-- Tabla de recursos descargables por curso (PDF, PPT, Word, etc.)
create table if not exists public.course_resources (
    id          uuid primary key default gen_random_uuid(),
    course_id   uuid not null references public.courses(id) on delete cascade,
    title       text not null,
    description text,
    file_url    text not null,
    file_name   text not null,
    file_type   text not null,  -- 'pdf' | 'ppt' | 'pptx' | 'doc' | 'docx' | 'other'
    file_size   bigint,         -- bytes
    "order"     integer not null default 0,
    created_at  timestamptz not null default now()
);

-- Índice para listar recursos de un curso ordenados
create index if not exists course_resources_course_id_order_idx
    on public.course_resources(course_id, "order");

-- RLS
alter table public.course_resources enable row level security;

-- Cualquier usuario autenticado puede leer recursos (el acceso al curso ya está controlado por el negocio)
create policy "resources_select_authenticated"
    on public.course_resources for select
    to authenticated
    using (true);

-- Solo admins pueden insertar/actualizar/borrar
-- (misma lógica que el resto del proyecto: el email del admin)
create policy "resources_insert_admin"
    on public.course_resources for insert
    to authenticated
    with check (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "resources_update_admin"
    on public.course_resources for update
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );

create policy "resources_delete_admin"
    on public.course_resources for delete
    to authenticated
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );
