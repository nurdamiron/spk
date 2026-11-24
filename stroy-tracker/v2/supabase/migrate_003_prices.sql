-- Строй Трекер: база цен РК (поставщики, позиции, записи цен). Только чтение из приложения, видит владелец.
-- Данные грузит scripts/import_prices.mjs из price-base/data/export/price_base.json (источник правды: price-base/).
-- RLS включён без политик: прямой доступ с анонимным ключом закрыт, как и во всей схеме.

create table if not exists price_positions (
  pid text primary key,
  "key" text not null unique,
  grp text not null,
  name text not null,
  base_unit text,
  volatile boolean not null default false,
  fresh_days int not null default 90,
  n_records int not null default 0,
  a_suppliers int not null default 0,
  median_a numeric, min_a numeric, max_a numeric, spread_a numeric,
  newest date,
  rec_price numeric,        -- цена в расчёт (медиана A, ₸ без НДС)
  ref_price numeric,        -- ориентир (B и живые без даты)
  old_price numeric,
  status text,
  explanation text,
  spread_all numeric
);
create index if not exists price_positions_grp on price_positions(grp);

create table if not exists price_suppliers (
  id text primary key,
  name text not null,
  form text, bin text, type text, marketplace text, city text,
  site text, company_url text,
  contacts_raw text,        -- телефоны, e-mail, адрес (публичные), как собрал агент
  grp text,
  n_records int not null default 0,
  reliability text,
  contact_status text,
  last_price_date date,
  note text
);

create table if not exists price_records (
  id text primary key,
  pid text not null references price_positions(pid) on delete cascade,
  position_key text not null,
  supplier_id text not null references price_suppliers(id) on delete cascade,
  price numeric, unit text, vat text, delivery text, conv numeric,
  ex_vat numeric,           -- ₸ без НДС за базовую единицу позиции
  price_date date, date_type text, valid_until date,
  age_days int, fresh_days int,
  actuality text, act_kind text check (act_kind in ('actual','stale','expired','nodate')),
  cls text check (cls in ('A','B','C','D')),
  class_reason text, in_calc boolean not null default false,
  url text, final_url text, snapshot text, quote text, check_text text,
  live boolean not null default false,
  region text, note text
);
create index if not exists price_records_pid on price_records(pid, cls);
create index if not exists price_records_sup on price_records(supplier_id);

create table if not exists price_meta (
  id int primary key default 1 check (id = 1),
  built_at timestamptz,
  imported_at timestamptz not null default now(),
  counts jsonb
);

alter table price_positions enable row level security;
alter table price_suppliers enable row level security;
alter table price_records enable row level security;
alter table price_meta enable row level security;
