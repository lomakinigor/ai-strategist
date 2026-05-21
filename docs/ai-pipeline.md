# AI Pipeline — подписки и модели

> Полная картина внешних сервисов и моделей ИИ, используемых в ai-strategist на каждом этапе работы приложения.
> Источники: [src/lib/ai/config.ts](../src/lib/ai/config.ts), [src/lib/research/orchestrator.ts](../src/lib/research/orchestrator.ts), [src/lib/strategy/generator.ts](../src/lib/strategy/generator.ts), [src/lib/strategy/brief.ts](../src/lib/strategy/brief.ts), [app/api/parse-context/route.ts](../app/api/parse-context/route.ts).

## Таблица 1 — Подписки и аккаунты

| Сервис | Назначение | Env var | Тарификация |
|--------|-----------|---------|-------------|
| **GitHub** | Хостинг исходников | — | бесплатно (public repo `lomakinigor/ai-strategist`) |
| **Vercel** | Hosting Next.js + Serverless Functions + Postgres | `DATABASE_URL` | Hobby бесплатно / Pro при росте |
| **OpenRouter** | Router для LLM (стратегия, синтез, brief, парсинг intake) | `OPENROUTER_API_KEY`, `OPENROUTER_REFERER` | per-token: DeepSeek V4 Flash ~$0.10–0.30 / 1M; Claude Sonnet 4.6 $3 вход / $15 выход за 1M (~$0.05 за синтез) |
| **OpenAI** | Research с веб-поиском в реальном времени | `OPENAI_API_KEY` | per-token + плата за web_search вызовы |
| **Perplexity** *(legacy)* | Старый research-провайдер, оставлен в коде | `PERPLEXITY_API_KEY` | сейчас не активен (заменён на OpenAI) |
| **Google PageSpeed Insights** | Метрики сайта (LCP/CLS/Lighthouse) | `GOOGLE_PAGESPEED_API_KEY` | бесплатно с квотами |
| **VK API** | Метрики VK-сообществ клиента/конкурентов | `VK_SERVICE_TOKEN` | бесплатно |

## Таблица 2 — Модели ИИ по этапам

| # | Этап | Что делает | Провайдер | Модель |
|---|------|-----------|-----------|--------|
| 0 | **Парсинг intake** | Свободный текст/clipboard клиента → структурированный JSON компании | OpenRouter | DeepSeek V4 Pro |
| 1a | **Сбор данных — 5 потоков research** (параллельно) | Business / Market / Audience / Channels / Competitors с веб-поиском и цитированием | OpenAI | `gpt-4o-mini` + `web_search_preview` |
| 1b | **Site marketing-анализ** | Разбор страницы клиента (USP, CTA, тексты) | OpenAI | `gpt-4o-mini` + `web_search_preview` |
| 2 | **Внешние метрики** (детерминированные) | LCP/CLS/Lighthouse + VK-аудитория и охваты | — | Google PageSpeed API, VK API (без LLM) |
| 3 | **Верификация / RS-классификация** | Reliability Score 1–5, тип факта, HIGH/MEDIUM/LOW | — | детерминированный код [classify.ts](../src/lib/reliability/classify.ts) |
| 4a | **Stage 1: 5 параллельных черновиков** *(если `STRATEGY_TWO_STAGE_REVIEW=true`)* | По одному draft на раздел, пользователь делает ревью | OpenRouter | DeepSeek V4 Flash |
| 4b | **Stage 2: синтез полной стратегии** | Объединение 5 ревьюнутых draft в финальный отчёт | OpenRouter | DeepSeek V4 Flash |
| 4* | **Single-call mode (текущий дефолт)** | Полный отчёт за один вызов LLM | OpenRouter | DeepSeek V4 Flash |
| 5 | **Краткий отчёт (brief)** | Executive Snapshot + 5 разделов по методологии Tufte/Knaflic/Berinato | OpenRouter | DeepSeek V4 Flash |
| 6 | **AI-блок (3 предложения)** | Извлечение AI-возможностей из текста полного отчёта | — | детерминированный regex [ai-extract.ts](../app/brief/[artifactId]/ai-extract.ts) |

## Заметки

- **DeepSeek V4 Flash вместо V4 Pro** — переключили из-за 60-секундного таймаута Vercel ([config.ts:38–39](../src/lib/ai/config.ts#L38-L39)). Pro даёт лучшее качество, но падает в 504. Вернёмся к Pro, когда переедем на async/background-обработку.
- **Mock-режим по умолчанию** — `RESEARCH_MODE=real` нужно явно ставить в env, иначе работают mock-адаптеры (быстрая локальная разработка).
- **Two-stage review выключен по умолчанию** — `STRATEGY_TWO_STAGE_REVIEW=true` включает ревью между генерацией разделов и финальным синтезом.

## Этапы без LLM (часто упускают из виду)

- **Этап 0 — парсинг intake**: отдельный LLM-вызов, превращающий буфер обмена клиента в структуру.
- **Этап 1b — site marketing**: отдельный поток research, не входит в 5 основных.
- **Этап 2 — внешние метрики**: PageSpeed + VK API без LLM.
- **Этап 3 — RS-верификация фактов**: детерминированная классификация по reliability score.
- **Этап 6 — AI-блок**: regex-извлечение AI-возможностей из текста стратегии.
