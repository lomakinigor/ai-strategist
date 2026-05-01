# Spec: External metrics for client and competitor channels

Дата: 2026-05-01

## Проблема

Perplexity research даёт описательную информацию о каналах клиента и конкурентов («есть Telegram», «работает с маркетплейсами»), но без реальных цифр — подписчики, частота постов, охваты, скорость сайта. Стратегический отчёт получается без бенчмарков: непонятно, насколько сильны каналы клиента vs конкурентов, что «нормально» для ниши.

## Цель

Подтянуть в RAG-context реальные метрики из публичных API и парсинга, чтобы факты в стратегии содержали **числа, а не пересказ**.

## Acceptance criteria

- **A1.** В research-pipeline после 5 Perplexity-streams запускается фаза «External metrics» — собирает URLs из intake (каналы клиента + сайт) и из facts.content конкурентов (regex извлечение URL).
- **A2.** URL-роутер определяет тип канала по host: `vk` | `telegram-channel` | `telegram-bot` | `site`. Telegram-боты и `linku.su`-агрегаторы тихо пропускаются (нет публичных метрик).
- **A3.** VK adapter — через VK API `groups.getById` + `wall.get`, считает: подписчиков, постов за 30 дней, среднее число лайков/просмотров. Использует `VK_SERVICE_TOKEN`.
- **A4.** Telegram adapter — парсит публичную страницу `https://t.me/s/{username}`, считает: подписчиков, постов за 30 дней, средний охват (просмотры/подписчики = ER%). Без ключа.
- **A5.** PageSpeed adapter — через Google PageSpeed Insights API, возвращает: Performance score, SEO score, Mobile-Friendliness, LCP/FID/CLS. Использует `GOOGLE_PAGESPEED_API_KEY`.
- **A6.** Каждый адаптер сохраняет результат как `facts` с `researchType='channels'` (или `'business'` для сайта), `factType='FACT'`, `confidence='HIGH'`, `reliabilityScore=4`, source = название провайдера.
- **A7.** Если адаптер падает (401, 404, timeout) — тихо пропускается без crash, остальные продолжают. Ошибка логируется.
- **A8.** Если переменной env нет — соответствующий адаптер тихо пропускается (graceful degradation).
- **A9.** External metrics запускается параллельно через `Promise.allSettled` — общее время = max адаптера.

## Affected files

### Domain
- `src/lib/research/external-metrics/url-router.ts` — `detectChannelType(url)` + `extractIdentifier(url)`
- `src/lib/research/external-metrics/vk-adapter.ts` — VK groups.getById + wall.get
- `src/lib/research/external-metrics/telegram-adapter.ts` — парсинг t.me/s/{username}
- `src/lib/research/external-metrics/pagespeed-adapter.ts` — PageSpeed Insights API
- `src/lib/research/external-metrics/index.ts` — orchestrator: принимает URLs, возвращает RawDataPoint[]

### Pipeline integration
- `src/lib/research/orchestrator.ts` — после `Promise.all` 5 streams вызывает `runExternalMetrics(urls)`, добавляет результаты к facts
- `src/lib/research/orchestrator.ts` — функция `extractUrlsFromContext(intakePayload, perplexityFacts)` — собирает URL'ы из intake.channels + intake.website + regex по facts.content конкурентов

### Tests
- `src/lib/research/external-metrics/__tests__/url-router.test.ts`
- `src/lib/research/external-metrics/__tests__/telegram-adapter.test.ts` (мок fetch + sample HTML)
- `src/lib/research/external-metrics/__tests__/vk-adapter.test.ts` (мок fetch + sample VK response)
- `src/lib/research/external-metrics/__tests__/pagespeed-adapter.test.ts` (мок fetch + sample PageSpeed response)

## Scope cuts (out of MVP)

- Telegram-боты — нет публичных метрик, пропускаем
- linku.su — это агрегатор, статистики кликов нет, пропускаем
- Запросы делаются 1 раз в момент research; кэширования нет (если research перезапустят — все API дёрнутся снова)
- VK API rate limit (~3 req/sec) — добавим throttle в коде если будет проблема
- PageSpeed запрос ~30 сек на URL — для 3-5 URL общее ~90-150 сек, **не помещается в 60s Vercel** ⚠️

## Критическое замечание про PageSpeed

PageSpeed Insights API запускает реальный Lighthouse run на стороне Google — занимает 20-40 сек на URL. **Если конкурентов 5, то 5×30s = 150s — упрёмся в timeout.**

Решения:
- **A.** Запускать только для сайта клиента (1 URL → ~30s, помещается)
- **B.** Использовать `strategy=mobile` + `category=performance` — самый быстрый режим (~15s)
- **C.** Параллельно через Promise.allSettled — общее время = max(~30s)

Берём **C + A**: PageSpeed запускается параллельно для всех URL, но общее время = max ~30 сек. Если упрёмся — оставим только сайт клиента.

## Test plan

- Unit: моки для каждого адаптера, проверяем формат RawDataPoint
- Integration: смок-тест на РУЗНАКе после деплоя
