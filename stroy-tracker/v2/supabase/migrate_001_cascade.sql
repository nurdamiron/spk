-- Чтобы объект с отчётами можно было удалить целиком.
alter table progress_entries drop constraint if exists progress_entries_kp_item_id_fkey;
alter table progress_entries add constraint progress_entries_kp_item_id_fkey foreign key (kp_item_id) references kp_items(id) on delete cascade;
alter table labor_entries drop constraint if exists labor_entries_crew_id_fkey;
alter table labor_entries add constraint labor_entries_crew_id_fkey foreign key (crew_id) references crews(id) on delete cascade;
