-- Строй Трекер: схема базы. Все деньги в тенге (целые числа), без НДС там, где не сказано иное.
-- Браузер к базе напрямую не ходит. Все запросы идут через сервер, права проверяются в коде.
-- RLS включён без политик: прямой доступ с анонимным ключом закрыт полностью.

create extension if not exists pgcrypto;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  login text not null unique,        -- имя для входа в нижнем регистре
  role text not null check (role in ('owner','foreman','cashier')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists objects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  customer text,
  contract_no text,
  status text not null default 'active' check (status in ('active','done','archived')),
  created_at timestamptz not null default now()
);

create table if not exists object_members (
  object_id uuid not null references objects(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  primary key (object_id, user_id)
);

create table if not exists kp_items (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references objects(id) on delete cascade,
  sort int not null default 0,
  name text not null,
  unit text not null,
  qty numeric(14,3) not null check (qty > 0),
  price bigint not null default 0,   -- цена заказчику за единицу, без НДС
  cost bigint not null default 0,    -- плановая себестоимость за единицу
  created_at timestamptz not null default now()
);
create index if not exists kp_items_object on kp_items(object_id, sort);

create table if not exists crews (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references objects(id) on delete cascade,
  name text not null,
  rate_type text not null check (rate_type in ('hour','day','volume','fixed')),
  rate bigint not null,
  kp_item_id uuid references kp_items(id) on delete set null
);
create index if not exists crews_object on crews(object_id);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  client_id text not null unique,    -- чтобы повторная отправка с телефона не создавала дубль
  object_id uuid not null references objects(id) on delete cascade,
  report_date date not null,
  author_id uuid not null references profiles(id),
  backdated boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists reports_object_date on reports(object_id, report_date);

create table if not exists progress_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  kp_item_id uuid not null references kp_items(id) on delete cascade,
  qty numeric(14,3) not null check (qty > 0)
);
create index if not exists progress_report on progress_entries(report_id);

create table if not exists labor_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  crew_id uuid not null references crews(id) on delete cascade,
  qty numeric(14,3) not null,        -- часы, дни или объём
  amount bigint not null             -- начислено, считает сервер по ставке
);
create index if not exists labor_report on labor_entries(report_id);

create table if not exists expenses (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references reports(id) on delete cascade,
  object_id uuid not null references objects(id) on delete cascade,
  category text not null,
  amount bigint not null check (amount > 0),   -- сколько заплатили, с НДС если он был
  has_esf boolean not null default false,      -- есть ЭСФ: НДС идёт к зачёту
  kp_item_id uuid references kp_items(id) on delete set null,
  funding text not null default 'imprest' check (funding in ('imprest','office','transfer')),
  has_receipt boolean not null default true,
  comment text
);
create index if not exists expenses_object on expenses(object_id);

create table if not exists report_photos (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  path text not null
);
create index if not exists photos_report on report_photos(report_id);

create table if not exists payouts (
  id uuid primary key default gen_random_uuid(),
  crew_id uuid not null references crews(id) on delete cascade,
  pay_date date not null default current_date,
  amount bigint not null check (amount > 0),
  kind text not null default 'advance' check (kind in ('advance','settlement')),
  created_by uuid references profiles(id)
);

create table if not exists imprest_moves (
  id uuid primary key default gen_random_uuid(),
  holder_id uuid not null references profiles(id),
  object_id uuid references objects(id) on delete set null,
  move_date date not null default current_date,
  amount bigint not null check (amount > 0),
  kind text not null check (kind in ('issue','return')),
  comment text,
  created_by uuid references profiles(id)
);

alter table profiles enable row level security;
alter table objects enable row level security;
alter table object_members enable row level security;
alter table kp_items enable row level security;
alter table crews enable row level security;
alter table reports enable row level security;
alter table progress_entries enable row level security;
alter table labor_entries enable row level security;
alter table expenses enable row level security;
alter table report_photos enable row level security;
alter table payouts enable row level security;
alter table imprest_moves enable row level security;
