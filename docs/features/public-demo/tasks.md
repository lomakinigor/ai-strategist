# Tasks: публичный демо-отчёт

## T1. Контракт snapshot — RED

- Создать failing test на обязательные шаги, разделы и CTA.
- Создать failing test denylist/PII.
- Проверка: тест падает из-за отсутствующего `snapshot.ts`.

## T2. Минимальный snapshot — GREEN

- Создать types и обезличенный snapshot.
- Проверка: snapshot tests green.

## T3. Публичный route — RED/GREEN

- Добавить route smoke contract для metadata/noindex и статического импорта.
- Создать `app/demo/page.tsx`.

## T4. Demo shell

- Создать `DemoExperience.tsx` со stepper: input → research → report.
- Добавить keyboard/focus states и mobile layout.

## T5. Интерактивный и полный отчёт

- Внутри report добавить переключатель `interactive | full`.
- Отрисовать snapshot без HTML injection.
- Добавить claim badges и CTA.

## T6. Styling

- Создать CSS module в стиле текущего interactive report.
- Light-first stone/navy/gold, Manrope + Instrument Serif.
- Добавить controlled motion с `prefers-reduced-motion`.

## T7. Verification

- Related tests.
- `npx tsc --noEmit`.
- `npm run build`.
- Browser smoke desktop/mobile.

## T8. Review

- Framing audit 5/5.
- Self-review diff и acceptance criteria.
- Зафиксировать следующий шаг: CTA на landing.
