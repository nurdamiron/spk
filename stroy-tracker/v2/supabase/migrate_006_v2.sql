-- Строй Трекер v2. Миграция 006: только добавляем, существующие таблицы не меняются и ничего не удаляется.
-- Применять вручную после проверки. Деньги в тенге, целые числа.

-- Источник записи: сайт, WhatsApp или импорт
alter table reports add column if not exists source text not null default 'site'
  check (source in ('site','whatsapp','import'));

-- Вечернее «сделано / не сделано»
create table if not exists report_notes (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  done text,
  not_done text,
  reason text
);
create index if not exists report_notes_report on report_notes(report_id);

-- Техника: справочник и записи по дням
create table if not exists equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  kind text,
  rate_type text not null default 'hour' check (rate_type in ('hour','day','fixed')),
  rate bigint not null default 0,
  active boolean not null default true
);

create table if not exists equipment_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  equipment_id uuid references equipment(id) on delete set null,
  name text,                         -- если техники нет в справочнике, пишем как сказал прораб
  qty numeric(14,3) not null default 1,  -- часы, дни или штуки
  amount bigint not null default 0
);
create index if not exists equipment_entries_report on equipment_entries(report_id);

-- Люди по дням (не привязано к бригаде со ставкой)
create table if not exists headcount_entries (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references reports(id) on delete cascade,
  label text not null,               -- бригада, роль или «рабочие»
  people int not null check (people >= 0),
  hours numeric(6,2)
);
create index if not exists headcount_report on headcount_entries(report_id);

-- Договоры, счета, акты
create table if not exists documents (
  id uuid primary key default gen_random_uuid(),
  object_id uuid not null references objects(id) on delete cascade,
  kind text not null check (kind in ('contract','invoice','act','other')),
  number text,
  counterparty text,
  amount bigint,
  doc_date date,
  due_date date,
  status text not null default 'waiting' check (status in ('waiting','paid','overdue','cancelled')),
  file_path text,
  source text not null default 'site' check (source in ('site','whatsapp','import')),
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists documents_object on documents(object_id, status);

-- Всё, что пришло снаружи, до записи в основную базу
create table if not exists inbox (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('site','whatsapp')),
  sender text,                       -- номер телефона или логин
  profile_id uuid references profiles(id),
  object_id uuid references objects(id) on delete set null,
  raw_text text,
  file_paths text[] not null default '{}',
  parsed jsonb,
  confidence numeric(3,2),
  status text not null default 'new' check (status in ('new','parsed','needs_review','saved','rejected')),
  report_id uuid references reports(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists inbox_status on inbox(status, created_at desc);

-- История правок: кто, что, когда и откуда
create table if not exists audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  row_id uuid,
  field text,
  old_value text,
  new_value text,
  changed_by uuid references profiles(id),
  source text not null default 'site',
  changed_at timestamptz not null default now()
);
create index if not exists audit_row on audit_log(table_name, row_id);

-- Номер WhatsApp ↔ человек и объект
create table if not exists wa_links (
  phone text primary key,            -- в формате 77012345678
  profile_id uuid not null references profiles(id) on delete cascade,
  object_id uuid references objects(id) on delete set null,
  active boolean not null default true
);

-- Словарь команды: как люди реально называют вещи
create table if not exists glossary (
  id uuid primary key default gen_random_uuid(),
  phrase text not null,              -- «камаз», «бетонка», «пол-ляма»
  meaning text not null,             -- что это значит для разбора
  kind text not null default 'term' check (kind in ('term','unit','amount','material','equipment','crew')),
  created_at timestamptz not null default now()
);
create unique index if not exists glossary_phrase on glossary(lower(phrase));

-- Состояние синхронизации с Google Sheets
create table if not exists sheet_sync (
  table_name text primary key,
  last_synced_at timestamptz,
  last_error text
);

-- Права: как и раньше, прямой доступ с анонимным ключом закрыт, всё идёт через сервер
alter table report_notes enable row level security;
alter table equipment enable row level security;
alter table equipment_entries enable row level security;
alter table headcount_entries enable row level security;
alter table documents enable row level security;
alter table inbox enable row level security;
alter table audit_log enable row level security;
alter table wa_links enable row level security;
alter table glossary enable row level security;
alter table sheet_sync enable row level security;
