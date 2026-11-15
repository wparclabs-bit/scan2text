import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PreviewPanel from './PreviewPanel'
import { initI18n } from '@/i18n'
import en from '@/locales/en.json'
import id from '@/locales/id.json'

vi.mock('@/stores/scan2text.store', () => ({
  useScan2TextStore: vi.fn(),
}))

vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}))

vi.mock('@/lib/api', () => ({
  getSettings: vi.fn(),
}))

const { useScan2TextStore } = await import('@/stores/scan2text.store')

const BODY = '# Judul Dokumen\n\nParagraf pertama dokumen.'
const WITH_FRONT_MATTER = [
  '---',
  'engine: cloud',
  'model: nvidia/nemotron-3.5-super-vl-120b-a12b',
  'prompt_version: 1',
  'pages: 3',
  'generated_at: 2026-11-15T20:00:00Z',
  '---',
  '',
  BODY,
].join('\n')

describe('PreviewPanel provenance', () => {
  const writeText = vi.fn().mockResolvedValue(undefined)

  beforeEach(() => {
    vi.clearAllMocks()
    initI18n({ en: { translation: en }, id: { translation: id } })
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    ;(useScan2TextStore as unknown as ReturnType<typeof vi.fn>).mockImplementation(
      (selector: (state: any) => any) => {
        const state = {
          selectedJobId: 'job-1',
          jobs: {
            'job-1': {
              id: 'job-1',
              fileName: 'report.pdf',
              fileSize: 12 * 1024 * 1024,
              fileType: 'application/pdf',
              status: 'completed',
              engine: 'cloud',
              resultMarkdown: WITH_FRONT_MATTER,
            },
          },
        }
        return selector(state)
      },
    )
  })

  it('test_preview_panel_excludes_the_metadata_block', () => {
    const { container } = render(<PreviewPanel />)

    expect(container.textContent).toContain('Judul Dokumen')
    expect(container.textContent).toContain('Paragraf pertama dokumen.')
    expect(container.textContent).not.toContain('prompt_version')
    expect(container.textContent).not.toContain('generated_at')
    expect(container.textContent).not.toContain('engine: cloud')
  })

  it('test_copied_markdown_excludes_the_metadata_block', async () => {
    render(<PreviewPanel />)

    await userEvent.click(screen.getByTestId('preview-copy-btn'))

    expect(writeText).toHaveBeenCalledWith(BODY)
    const copied = writeText.mock.calls[0][0] as string
    expect(copied).not.toContain('prompt_version')
    expect(copied).not.toContain('---')
  })
})
