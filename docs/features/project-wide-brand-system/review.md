# Review: project-wide brand system

## Что изменено

- Добавлены project-wide semantic tokens и обратные aliases в `app/globals.css`.
- 49 UI-файлов нормализованы к пяти canonical colors и Inter.
- Demo и interactive report больше не загружают Manrope/Instrument Serif.
- Neon report преобразован в branded analytical dark view.
- Semantic statuses используют labels/RS codes и border patterns вместо внешних palettes.
- Contact/admin modals, loading/error states, print и OpenGraph приведены к общему стилю.
- Добавлен static contract, который блокирует возврат forbidden colors, font families и цветных emoji-icons.

## Verification

- Brand/UI contract tests: 11/11 passed.
- TypeScript: passed.
- Production build: passed.
- Browser desktop: 12 routes, overflow отсутствует.
- Browser mobile: 6 routes на 390×844, overflow отсутствует.
- Interactive QA: demo theme switch и contact modal.
- Dynamic report routes без fixture проверены static contract, existing component tests, typecheck и build.

## Self-review

- Domain logic, API, state и routes не менялись.
- Миграция централизована tokens, но старые class prefixes сохранены для минимального риска.
- Status semantics сохраняются текстом и формой, а не только цветом.
- Остаточный риск: visual QA реального paid report требует существующий job fixture; это не блокирует сборку и contract.
