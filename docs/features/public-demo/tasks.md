# Tasks: публичный демо-отчёт

## T1. Контракт snapshot — RED

- [x] Создать failing test на обязательные шаги, разделы и CTA.
- [x] Создать failing test denylist/PII.
- Проверка: тест падает из-за отсутствующего `snapshot.ts`.

## T2. Минимальный snapshot — GREEN

- [x] Создать types и обезличенный snapshot.
- Проверка: snapshot tests green.

## T3. Публичный route — RED/GREEN

- [x] Добавить route smoke contract для metadata/noindex и статического импорта.
- [x] Создать `app/demo/page.tsx`.

## T4. Demo shell

- [x] Создать `DemoExperience.tsx` со stepper: input → research → report.
- [x] Добавить keyboard/focus states и mobile layout.

## T5. Интерактивный и полный отчёт

- [x] Внутри report добавить переход `interactive → full`.
- [x] Отрисовать snapshot без HTML injection.
- [x] Добавить claim badges и CTA.

## T6. Styling

- [x] Перенести дизайн-систему только из `innodor-report.html`.
- Light-first: `#f8f7f4` / `#1a5c54`, Manrope + Instrument Serif; dark-токены — из Innodor.
- Перенести sidebar, hero, карточки, KPI, roadmap, ROI, SWOT, progress и режим «Только действия».
- Не использовать визуальные решения `gpk-reputaciya-report.html`.
- [x] Добавить controlled motion с `prefers-reduced-motion`.

## T7. Verification

- [x] Related tests.
- [x] `npx tsc --noEmit`.
- [x] `npm run build`.
- [x] Browser smoke desktop/mobile; после mobile CSS-фикса — повторная проверка инвариантами из-за блокировки localhost-политикой браузера.

## T8. Review

- [x] Framing audit: raw-факты перед свёрнутым маркированным AI-резюме; trust-signal добавлен.
- [x] Self-review diff и acceptance criteria.

## T9. CTA на landing

- [x] Добавить в hero CTA «Посмотреть пример отчёта» с переходом на `/demo`.
- [x] Сохранить основной платный CTA и бесплатный пробник без изменения flow.
- [x] Проверить переход contract-тестом и production build.
