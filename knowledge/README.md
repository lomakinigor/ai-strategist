# Knowledge Base — ai-strategist

База знаний для генерации отчётов. Структура:

## `methodology/` — Как строить отчёт
- [books.md](methodology/books.md) — 3 книги-основа (Minto · Knaflic · Duarte)
- [brief-report-structure.md](methodology/brief-report-structure.md) — структура краткого отчёта для клиента
- [full-report-structure.md](methodology/full-report-structure.md) — структура полного отчёта для владельцев
- [ai-automation-block.md](methodology/ai-automation-block.md) — методология AI-секции

## `niches/` — Предложения по нишам
- [_all.md](niches/_all.md) — универсальные AI-предложения для любого бизнеса
- [legal-collection.md](niches/legal-collection.md) — юр.услуги (взыскание)
- _(будущие: ecommerce, b2b-saas, restaurants, beauty, education, …)_

## `channels/` — Каналы РФ
- [russia-channels-map.md](channels/russia-channels-map.md) — карта каналов с привязкой к типу бизнеса

## Tech docs (существующие)
- [architecture.md](architecture.md) — архитектура приложения
- [notifications.md](notifications.md) — звуковые уведомления Claude Code

## Как пополнять
1. Новая ниша → создать файл `niches/<niche-slug>.md` по образцу `legal-collection.md`
2. Универсальные находки → добавить в `niches/_all.md`
3. Изменения в формате отчёта → править `methodology/brief-report-structure.md` или `full-report-structure.md`
4. После добавления — обновить этот README
