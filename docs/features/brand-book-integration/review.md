# Review: интеграция бренд-бука

## Результат

- Оригинальный пятистраничный PDF сохранён в `docs/brand/`.
- Создан машинно-читаемый `DESIGN.md` с canonical палитрой, Inter, values и brand voice.
- Корневые инструкции направляют будущие UI-задачи к бренд-источникам.
- На главной удалены жёлтый акцент и дополнительные голубые/серые hex-цвета; используются только canonical цвета и их opacity-варианты.
- Структура, CTA, маршруты и responsive-поведение не изменены.

## Verification

- Brand contract: 4/4 tests passed.
- `next build`: passed.
- `tsc --noEmit`: passed.
- Browser QA: desktop 1440×1000 и mobile 390×844; horizontal overflow отсутствует.
- Browser console: errors/warnings отсутствуют.

## Остаточные рекомендации

- После появления новых brand assets дополнить правила для photography/illustration и motion.
- Отдельно оптимизировать hero PNG в WebP/AVIF; это не относится к текущей задаче.
