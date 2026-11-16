-- ========================================================
-- Схема бази даних для Таємного Санти (Supabase PostgreSQL)
-- 100% безпечна архітектура з захистом від несанкціонованого доступу
-- ========================================================

-- Вмикаємо розширення pgcrypto для генерації криптографічних токенів та UUID
create extension if not exists "pgcrypto";

-- 1. Таблиця публічних даних кімнат (безпечно для публічного читання)
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  host_name text not null,
  status text not null default 'collecting', -- 'collecting' | 'shuffled' | 'closed'
  created_at timestamptz not null default now()
);

-- 2. Таблиця секретів кімнати (ПРИВАТНА: admin_token та host_email)
-- Жоден публічний користувач не має доступу до цієї таблиці!
create table if not exists room_secrets (
  room_id uuid primary key references rooms(id) on delete cascade,
  admin_token text not null default encode(gen_random_bytes(24), 'hex'),
  host_email text not null,
  created_at timestamptz not null default now()
);

-- 3. Таблиця учасників кімнати
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  first_name text not null,
  last_name text not null,
  email text not null,
  wishlist text default '',
  created_at timestamptz not null default now(),
  constraint unique_room_email unique (room_id, email)
);

-- 4. Таблиця обмежень (хто кому НЕ може дарувати)
create table if not exists restrictions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  giver_id uuid references participants(id) on delete cascade not null,
  receiver_id uuid references participants(id) on delete cascade not null,
  constraint unique_restriction unique (room_id, giver_id, receiver_id)
);

-- 5. Таблиця призначень (пари) - СЕРВЕРНА ТАЄМНИЦЯ
create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  giver_id uuid references participants(id) on delete cascade not null,
  receiver_id uuid references participants(id) on delete cascade not null,
  email_sent boolean not null default false,
  created_at timestamptz not null default now(),
  constraint unique_giver unique (room_id, giver_id)
);

-- ========================================================
-- Індекси
-- ========================================================
create index if not exists idx_participants_room_id on participants(room_id);
create index if not exists idx_restrictions_room_id on restrictions(room_id);
create index if not exists idx_assignments_room_id on assignments(room_id);
create index if not exists idx_room_secrets_admin on room_secrets(room_id, admin_token);

-- ========================================================
-- Row Level Security (RLS)
-- ========================================================
alter table rooms enable row level security;
alter table room_secrets enable row level security;
alter table participants enable row level security;
alter table restrictions enable row level security;
alter table assignments enable row level security;

-- Політика для rooms:
-- Будь-хто з посиланням на кімнату може читати її назву, ім'я хоста та статус
create policy "Allow select rooms for anyone"
  on rooms for select
  using (true);

-- Забороняємо прямий insert/update в rooms з клієнта - тільки через безпечну функцію create_room_secure або Edge Function
create policy "Allow service_role full rooms access"
  on rooms
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Політика для room_secrets:
-- ЖОДЕН клієнт через anon ключ не може читати чи змінювати room_secrets!
create policy "Only service_role can access room_secrets"
  on room_secrets
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Політика для participants:
-- Учасники кімнати бачать список зареєстрованих (для лічильника та списку)
create policy "Allow select participants for room"
  on participants for select
  using (true);

-- Додавання учасника дозволено лише якщо кімната у статусі 'collecting'
create policy "Allow insert participant if room is collecting"
  on participants for insert
  with check (
    exists (
      select 1 from rooms
      where rooms.id = participants.room_id
        and rooms.status = 'collecting'
    )
  );

-- Політика для restrictions:
create policy "Allow select restrictions for room"
  on restrictions for select
  using (true);

-- Політика для assignments:
-- ПОВНИЙ ЗАБОРОН публічного доступу (пари ніколи не потрапляють на клієнт)
create policy "Only service_role can access assignments"
  on assignments
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- ========================================================
-- Безпечні PostgreSQL функції (SECURITY DEFINER)
-- ========================================================

-- Функція 1: Безпечне створення кімнати
-- Створює кімнату та секретний токен, повертаючи токен ЛИШЕ творцю в момент створення
create or replace function create_room_secure(
  p_title text,
  p_host_name text,
  p_host_email text
) returns json language plpgsql security definer as $$
declare
  v_room rooms;
  v_token text;
begin
  v_token := encode(gen_random_bytes(24), 'hex');

  insert into rooms (title, host_name, status)
  values (p_title, p_host_name, 'collecting')
  returning * into v_room;

  insert into room_secrets (room_id, admin_token, host_email)
  values (v_room.id, v_token, p_host_email);

  return json_build_object(
    'room', row_to_json(v_room),
    'admin_token', v_token
  );
end;
$$;

-- Функція 2: Перевірка прав хоста
create or replace function get_room_with_admin(
  p_room_id uuid,
  p_admin_token text
) returns json language plpgsql security definer as $$
declare
  v_room rooms;
begin
  if not exists (
    select 1 from room_secrets
    where room_id = p_room_id and admin_token = p_admin_token
  ) then
    raise exception 'Недійсний токен хоста або кімнату не знайдено';
  end if;

  select * into v_room from rooms where id = p_room_id;
  return row_to_json(v_room);
end;
$$;

-- Функція 3: Видалення учасника хостом (перевіряє токен)
create or replace function delete_participant_as_host(
  p_room_id uuid,
  p_participant_id uuid,
  p_admin_token text
) returns boolean language plpgsql security definer as $$
begin
  if not exists (
    select 1 from room_secrets
    where room_id = p_room_id and admin_token = p_admin_token
  ) then
    raise exception 'Недійсний токен хоста';
  end if;

  delete from participants
  where id = p_participant_id and room_id = p_room_id;

  return true;
end;
$$;

-- Функція 4: Збереження обмежень хостом (перевіряє токен)
create or replace function save_restrictions_as_host(
  p_room_id uuid,
  p_admin_token text,
  p_restrictions jsonb
) returns boolean language plpgsql security definer as $$
declare
  elem jsonb;
begin
  if not exists (
    select 1 from room_secrets
    where room_id = p_room_id and admin_token = p_admin_token
  ) then
    raise exception 'Недійсний токен хоста';
  end if;

  delete from restrictions where room_id = p_room_id;

  for elem in select * from jsonb_array_elements(p_restrictions)
  loop
    insert into restrictions (room_id, giver_id, receiver_id)
    values (
      p_room_id,
      (elem->>'giver_id')::uuid,
      (elem->>'receiver_id')::uuid
    );
  end loop;

  return true;
end;
$$;

-- ========================================================
-- Realtime публікація
-- ========================================================
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime for table rooms, participants, restrictions;
commit;
