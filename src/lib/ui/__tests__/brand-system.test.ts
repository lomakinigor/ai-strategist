import { readFileSync, readdirSync } from 'node:fs'
import { extname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()
const allowedHex = new Set(['#ffffff', '#1e3a8a', '#0a0a0a', '#525252', '#fafafa'])
const allowedRgb = new Set(['255,255,255', '30,58,138', '10,10,10', '82,82,82', '250,250,250'])
const forbiddenTailwindColors =
  /\b(?:red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone)-[0-9]{2,3}\b/gi

function collectUiFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) return collectUiFiles(path)
    return ['.tsx', '.css'].includes(extname(entry.name)) ? [path] : []
  })
}

const uiFiles = [join(root, 'app'), join(root, 'src', 'components')].flatMap(collectUiFiles)

describe('project-wide Pomelli brand contract', () => {
  it('использует только canonical hex и opacity-варианты canonical RGB', () => {
    const violations: string[] = []

    uiFiles.forEach((file) => {
      const source = readFileSync(file, 'utf8')
      const rel = relative(root, file)

      Array.from(source.matchAll(/#[0-9a-f]{3,8}\b/gi)).forEach(([hex]) => {
        if (!allowedHex.has(hex.toLowerCase())) violations.push(`${rel}: ${hex}`)
      })

      Array.from(source.matchAll(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)).forEach(
        ([rgb, r, g, b]) => {
          if (!allowedRgb.has(`${r},${g},${b}`)) violations.push(`${rel}: ${rgb}`)
        },
      )
    })

    expect(violations).toEqual([])
  })

  it('не использует сторонние Tailwind palettes и вторые шрифты', () => {
    const violations: string[] = []

    uiFiles.forEach((file) => {
      const source = readFileSync(file, 'utf8')
      const rel = relative(root, file)
      const colors = Array.from(source.matchAll(forbiddenTailwindColors)).map(([color]) => color)
      const fonts = Array.from(source.matchAll(/ui-monospace|JetBrains Mono|SFMono-Regular|Menlo|Instrument_Serif|Manrope|font-(?:demo|manrope|instrument)/gi)).map(
        ([font]) => font,
      )
      const colorEmoji = Array.from(source.matchAll(/🟢|🟡|🟠|🔴|🟦|🟧|🐋|💳|📊|⚖️|💬|🔐|✅/g)).map(
        ([emoji]) => emoji,
      )
      colors.concat(fonts, colorEmoji).forEach((token) => violations.push(`${rel}: ${token}`))
    })

    expect(violations).toEqual([])
  })

  it('определяет обязательные global semantic tokens', () => {
    const globals = readFileSync(join(root, 'app', 'globals.css'), 'utf8')
    ;[
      '--brand-white',
      '--brand-blue',
      '--brand-black',
      '--brand-gray',
      '--brand-snow',
      '--background',
      '--foreground',
      '--card',
      '--primary',
      '--muted',
      '--border',
      '--input',
      '--ring',
      '--overlay',
    ].forEach((token) => expect(globals).toContain(token))
  })
})
