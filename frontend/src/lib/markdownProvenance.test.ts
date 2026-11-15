import { describe, it, expect } from 'vitest'
import { stripProvenanceFrontMatter } from './markdownProvenance'

const FRONT_MATTER = [
  '---',
  'engine: cloud',
  'model: nvidia/nemotron-3.5-super-vl-120b-a12b',
  'prompt_version: 1',
  'pages: 3',
  'generated_at: 2026-11-15T20:00:00Z',
  '---',
  '',
  '# Judul Dokumen',
  '',
  'Paragraf pertama dokumen.',
].join('\n')

describe('stripProvenanceFrontMatter', () => {
  it('test_front_matter_is_stripped_from_the_preview_body', () => {
    const stripped = stripProvenanceFrontMatter(FRONT_MATTER)

    expect(stripped).toBe('# Judul Dokumen\n\nParagraf pertama dokumen.')
    expect(stripped).not.toContain('engine:')
    expect(stripped).not.toContain('prompt_version')
    expect(stripped).not.toContain('generated_at')
    expect(stripped).not.toContain('---')
  })

  it('test_a_horizontal_rule_later_in_the_body_is_not_truncated', () => {
    const body = '# Judul\n\nSebelum aturan.\n\n---\n\nSesudah aturan.\n'
    expect(stripProvenanceFrontMatter(body)).toBe(body)

    // A document that opens with a horizontal rule is not provenance either.
    const leadingRule = '---\n\nIntro.\n\n---\n\nOutro.\n'
    expect(stripProvenanceFrontMatter(leadingRule)).toBe(leadingRule)

    expect(stripProvenanceFrontMatter('')).toBe('')
  })
})
