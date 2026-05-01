import { describe, it, expect } from 'vitest'
import { detectChannel, detectChannels } from '../url-router'

describe('detectChannel', () => {
  it('распознаёт VK-группу по club-ID', () => {
    const r = detectChannel('https://vk.com/club233306506')
    expect(r?.type).toBe('vk')
    expect(r?.identifier).toBe('club233306506')
  })

  it('распознаёт VK-группу по screen_name', () => {
    expect(detectChannel('https://vk.com/durov')?.identifier).toBe('durov')
    expect(detectChannel('https://m.vk.com/durov')?.identifier).toBe('durov')
  })

  it('распознаёт Telegram-канал', () => {
    const r = detectChannel('https://t.me/ChestniyZnak')
    expect(r?.type).toBe('telegram-channel')
    expect(r?.identifier).toBe('ChestniyZnak')
  })

  it('распознаёт Telegram-канал из t.me/s/ ссылки', () => {
    const r = detectChannel('https://t.me/s/durov')
    expect(r?.type).toBe('telegram-channel')
    expect(r?.identifier).toBe('durov')
  })

  it('распознаёт Telegram-handle вида @username', () => {
    const r = detectChannel('@ChestniyZnak')
    expect(r?.type).toBe('telegram-channel')
    expect(r?.identifier).toBe('ChestniyZnak')
  })

  it('классифицирует Telegram-бот по суффиксу _bot', () => {
    const r = detectChannel('https://t.me/RuZnak_markirovka_bot')
    expect(r?.type).toBe('telegram-bot')
    expect(r?.identifier).toBe('RuZnak_markirovka_bot')
  })

  it('пропускает приватные Telegram-инвайты (joinchat / +)', () => {
    expect(detectChannel('https://t.me/joinchat/AbCd123')?.type).toBe('skip')
    expect(detectChannel('https://t.me/+AbCd123')?.type).toBe('skip')
  })

  it('пропускает агрегаторы ссылок', () => {
    expect(detectChannel('https://linku.su/uxgwghm')?.type).toBe('skip')
    expect(detectChannel('https://taplink.cc/foo')?.type).toBe('skip')
  })

  it('классифицирует обычный сайт', () => {
    const r = detectChannel('https://ru-znak.ru')
    expect(r?.type).toBe('site')
    expect(r?.identifier).toMatch(/^https:\/\/ru-znak\.ru\/?$/)
  })

  it('добавляет https:// если схема не указана', () => {
    expect(detectChannel('vk.com/durov')?.type).toBe('vk')
    expect(detectChannel('ru-znak.ru')?.type).toBe('site')
  })

  it('возвращает null для невалидных URL', () => {
    expect(detectChannel('')).toBeNull()
    expect(detectChannel('   ')).toBeNull()
  })
})

describe('detectChannels', () => {
  it('обрабатывает массив, отфильтровывает null/undefined', () => {
    const r = detectChannels([
      'https://vk.com/club233306506',
      null,
      undefined,
      'https://t.me/ChestniyZnak',
      '',
      'https://ru-znak.ru',
    ])
    expect(r).toHaveLength(3)
  })

  it('дедуплицирует одинаковые каналы', () => {
    const r = detectChannels([
      'https://t.me/durov',
      'https://t.me/s/durov',
      '@durov',
    ])
    expect(r).toHaveLength(1)
    expect(r[0].identifier).toBe('durov')
  })

  it('сохраняет порядок появления', () => {
    const r = detectChannels([
      'https://vk.com/durov',
      'https://t.me/durov',
      'https://example.com',
    ])
    expect(r.map((c) => c.type)).toEqual(['vk', 'telegram-channel', 'site'])
  })
})
