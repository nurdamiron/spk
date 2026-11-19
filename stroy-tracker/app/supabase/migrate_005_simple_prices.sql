-- Простой вид цен: по позиции считаем число подтверждённых предложений, медиану и размах (без классов A/B/C/D).
alter table price_positions add column if not exists n_live int not null default 0;
alter table price_positions add column if not exists med_live numeric;
alter table price_positions add column if not exists min_live numeric;
alter table price_positions add column if not exists max_live numeric;
create index if not exists price_positions_live on price_positions(n_live desc, pid);
create index if not exists price_records_pid_ex on price_records(pid, ex_vat);
