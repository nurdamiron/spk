# Мультиагентный сбор базы прайсов РК

Структура папки `price-base/`:

```
price-base/
├─ catalog/                      # универсальный каталог позиций (~500): build_catalog.py → catalog_KZ.csv/.xlsx
├─ price_base_KZ.xlsx            # итоговая база (собирается скриптами)
├─ price_requests_drafts.md      # письма поставщикам (черновики)
├─ price_log.md                  # журнал
├─ agents/
│  ├─ 00_ORCHESTRATOR.md         # ← главный промпт (вставить в новую сессию)
│  ├─ _SHARED_RULES.md           # строгие правила (общие для всех)
│  ├─ _RECORD_SCHEMA.md          # формат данных агентов
│  ├─ 01_asfalt_nerud.md   02_beton.md   03_metall.md   04_zhbi.md   05_gidro.md
│  ├─ 06_oborudovanie.md   07_ozelenenie.md   08_raboty.md
│  ├─ 12_truby_seti.md   13_elektrika.md   14_obshhestroy.md   15_spectehnika.md
│  ├─ 09_kontrol.md        # госзакупки / ССЦ / stat.gov (только контроль)
│  ├─ 10_kontakty.md       # публичные контакты и реквизиты поставщиков
│  └─ 11_qa.md             # независимая проверка (после всех)
├─ data/
│  ├─ agent_out/   prices_*.json, contacts_*.json, control_*.json   # результат агентов
│  ├─ agent_logs/  <агент>.md                                      # логи агентов
│  ├─ snapshots/   <агент>_*/                                      # PDF/HTML/скриншоты источников
│  └─ verify_<дата>.json, state.pkl                                # сверка и состояние сборки
└─ scripts/
   ├─ load_rows.py          # загрузка + валидация записей агентов
   ├─ collect_verify.py     # живая сверка URL (цена, НДС, даты, продавец)
   ├─ build_price_base.py   # классы A/B/C/D, сводка, контроль → xlsx
   ├─ gen_requests.py       # письма, журнал, запросы
   └─ make_agent_prompts.py # пересобирает промпты агентов из текущей базы
```

## Вариант А — один оркестратор (рекомендуется)
Открой новую сессию Claude Code в корне репозитория `spk`, вставь содержимое `agents/00_ORCHESTRATOR.md` (всё после «=== НАЧАЛО ПРОМПТА ===»). Оркестратор сам запустит агентов волнами, примет результаты, соберёт базу и отчитается.

## Вариант Б — вручную, по сессии на агента
1. Один раз: `python3 -m venv price-base/.venv && price-base/.venv/bin/pip install openpyxl requests`.
2. Для каждого `agents/NN_*.md` (01–10, 12–15) открой отдельную сессию в корне `spk` и отправь: «Прочитай `price-base/agents/NN_….md` и выполни целиком» — агенты пишут в разные файлы, их можно запускать одновременно.
3. Когда все закончили:
```bash
price-base/.venv/bin/python price-base/catalog/build_catalog.py
price-base/.venv/bin/python price-base/scripts/load_rows.py
price-base/.venv/bin/python price-base/scripts/collect_verify.py
price-base/.venv/bin/python price-base/scripts/build_price_base.py
price-base/.venv/bin/python price-base/scripts/gen_requests.py
price-base/.venv/bin/python price-base/scripts/make_agent_prompts.py
```
4. Затем сессия с `agents/11_qa.md` (QA) и исправления по её отчёту.

## Принципы
- **Классы A/B/C/D присваивает сборка**, агенты только собирают факты с цитатами и снимками.
- **A** = РК + точная цена + дата документа в сроке (90/30 дн.) + НДС указан + подтверждена независимой проверкой + не выброс/дубликат; позиция «готова» при ≥3 независимых A-поставщиках (≥2 редкие, ≥1 эксклюзив).
- Дата просмотра ≠ дата цены. `priceValidUntil` Satu (скользящее «завтра») не принимается.
- Госзакупки/ССЦ/stat — **контроль**, не рыночная цена.
- Ничего не отправляется и не покупается; формы, заявки, «показать номер», капчи — не трогать.
- Каждый агент пишет только в свои файлы → параллельный запуск безопасен.
- Новые записи **добавляются** (история), старые не затираются: перед новым прогоном сделай `data/archive_<дата>/` из старых `agent_out`.
