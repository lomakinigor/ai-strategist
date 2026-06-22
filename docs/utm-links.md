# UTM-ссылки для рассылки

> Living документ. При добавлении новых каналов / кампаний — расширяй таблицу.
> Атрибуция: source / medium / campaign / content передаются через sessionStorage
> от лендинга до intake → /pay → TG-нотификация админу с пометкой «🎯 Источник».

## Текущая кампания

- **Имя:** `mvp_launch_2026_06` — первый запуск MVP, июнь 2026
- **Базовый URL:** `https://ai-strategist-bice.vercel.app`
- **Когда запустить новую кампанию:** при смене лендинга, ценника, главного посыла. Тогда `mvp_launch_2026_07` или `summer_promo_2026`.

## Конвенции

| Поле | Значения | Зачем |
|---|---|---|
| `utm_source` | `vk` / `tg` / `max` / `personal` | Откуда — главное измерение |
| `utm_medium` | `community` / `channel` / `dm` / `chat` / `email` | Тип канала (паблик vs личка) |
| `utm_campaign` | `mvp_launch_2026_06` | Кампания. Меняется при ребрендинге |
| `utm_content` | `main` / `crisis` / `post_<имя>` | Креатив / посадка. Для A/B |

## Базовые ссылки для текущей кампании

### Главный лендинг (paid-first)

| Канал | Готовая ссылка |
|---|---|
| **ВК — пост в сообществе** | `https://ai-strategist-bice.vercel.app/?utm_source=vk&utm_medium=community&utm_campaign=mvp_launch_2026_06&utm_content=main` |
| **ВК — личное сообщение** | `https://ai-strategist-bice.vercel.app/?utm_source=vk&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=main` |
| **TG — пост в канале** | `https://ai-strategist-bice.vercel.app/?utm_source=tg&utm_medium=channel&utm_campaign=mvp_launch_2026_06&utm_content=main` |
| **TG — личное сообщение** | `https://ai-strategist-bice.vercel.app/?utm_source=tg&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=main` |
| **MAX — чаты** | `https://ai-strategist-bice.vercel.app/?utm_source=max&utm_medium=chat&utm_campaign=mvp_launch_2026_06&utm_content=main` |
| **MAX — личные сообщения** | `https://ai-strategist-bice.vercel.app/?utm_source=max&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=main` |
| **Personal email** | `https://ai-strategist-bice.vercel.app/?utm_source=personal&utm_medium=email&utm_campaign=mvp_launch_2026_06&utm_content=main` |
| **Personal мессенджеры** (общая — кому неудобно делить email/tg/wa) | `https://ai-strategist-bice.vercel.app/?utm_source=personal&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=main` |

### Антикризисный лендинг — полный набор по тем же 8 каналам

Используй когда контекст разговора УЖЕ о трудностях (чаты антикризисных
групп, ситуации когда человек сам пожаловался на падение продаж). На
холодную не отправляй — может прозвучать оскорбительно.

| Канал | Готовая ссылка |
|---|---|
| **ВК — пост в сообществе** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=vk&utm_medium=community&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |
| **ВК — личное сообщение** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=vk&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |
| **TG — пост в канале** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=tg&utm_medium=channel&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |
| **TG — личное сообщение** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=tg&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |
| **MAX — чаты** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=max&utm_medium=chat&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |
| **MAX — личные сообщения** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=max&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |
| **Personal email** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=personal&utm_medium=email&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |
| **Personal мессенджеры** | `https://ai-strategist-bice.vercel.app/crisis?utm_source=personal&utm_medium=dm&utm_campaign=mvp_launch_2026_06&utm_content=crisis` |

## A/B тест разных постов в одном канале

Если в одном канале постишь несколько разных текстов — меняй `utm_content`:

```
?utm_source=vk&utm_medium=community&utm_campaign=mvp_launch_2026_06&utm_content=post_pain
?utm_source=vk&utm_medium=community&utm_campaign=mvp_launch_2026_06&utm_content=post_roi
?utm_source=vk&utm_medium=community&utm_campaign=mvp_launch_2026_06&utm_content=post_founders
```

Дальше в `/admin/leads` и TG-нотификациях видишь какой пост работает.

## Где смотреть результат

| Где | Что |
|---|---|
| **TG-группа админа** | После каждой оплаты приходит сообщение с «🎯 Источник: source=X · medium=Y · campaign=Z · content=W» |
| **/admin/leads** | Колонка «🎯 Источник» для тарифных форм (Сопровождение, разовый отчёт) |
| **БД** `intake_submissions.input_payload.utm` | UTM сохраняется для **всех** intake-сабмитов, в том числе бесплатных |
| **Я.Метрика** (если выставлен NEXT_PUBLIC_YM_COUNTER_ID) | Отчёты «Источники → Метки UTM» |

## Чек-лист перед публикацией ссылки

- [ ] Проверь что в URL нет опечатки (vk vs vk_)
- [ ] Открой ссылку в инкогнито → пройди до /pay → убедись что в TG-нотификации появилась строка «🎯 Источник» с твоими метками
- [ ] Не используй пробелы и кириллицу в UTM-параметрах
- [ ] Не делай `utm_campaign=test` — это испортит твою же аналитику

## Будущие кампании (заполнить когда понадобится)

- `summer_promo_2026` — летняя акция (август)
- `crisis_launch_2026_07` — отдельная кампания под кризисный лендинг
- `webinar_2026_08` — после первого вебинара
