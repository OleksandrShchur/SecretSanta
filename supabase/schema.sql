-- ========================================================
-- Схема бази даних для Таємного Санти (Supabase PostgreSQL / Telegram Mini App)
-- ========================================================

create extension if not exists "pgcrypto";

-- 1. Таблиця публічних даних кімнат
create table if not exists rooms (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  host_name text not null,
  status text not null default 'collecting', -- 'collecting' | 'shuffled' | 'closed'
  created_at timestamptz not null default now()
);

-- 2. Таблиця секретів кімнати (ПРИВАТНА: admin_token та host_telegram_id)
create table if not exists room_secrets (
  room_id uuid primary key references rooms(id) on delete cascade,
  admin_token text not null default encode(gen_random_bytes(24), 'hex'),
  host_telegram_id bigint not null,
  host_username text,
  created_at timestamptz not null default now()
);

-- 3. Таблиця учасників кімнати
create table if not exists participants (
  id uuid primary key default gen_random_uuid(),
  room_id uuid references rooms(id) on delete cascade not null,
  first_name text not null,
  last_name text default '',
  telegram_id bigint not null,
  telegram_username text,
  wishlist text default '',
  created_at timestamptz not null default now(),
  constraint unique_room_telegram_id unique (room_id, telegram_id)
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
  notification_sent boolean not null default false,
  created_at timestamptz not null default now(),
  constraint unique_giver unique (room_id, giver_id)
);

-- Індекси
create index if not exists idx_participants_room_id on participants(room_id);
create index if not exists idx_restrictions_room_id on restrictions(room_id);
create index if not exists idx_assignments_room_id on assignments(room_id);
create index if not exists idx_room_secrets_admin on room_secrets(room_id, admin_token);

-- RLS
alter table rooms enable row level security;
alter table room_secrets enable row level security;
alter table participants enable row level security;
alter table restrictions enable row level security;
alter table assignments enable row level security;

create policy "Allow select rooms for anyone" on rooms for select using (true);
create policy "Allow select participants for room" on participants for select using (true);
create policy "Allow select restrictions for room" on restrictions for select using (true);

create policy "Allow insert participant if room is collecting"
  on participants for insert
  with check (
    exists (
      select 1 from rooms
      where rooms.id = participants.room_id
        and rooms.status = 'collecting'
    )
  );

create policy "Only service_role can access room_secrets"
  on room_secrets using (auth.role() = 'service_role') with check (auth.role() = 'service_role');

create policy "Only service_role can access assignments"
  on assignments using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
